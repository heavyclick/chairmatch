/**
 * Single seam for all LLM calls in the app.
 *
 * Every call in the app should go through `complete()` below, not call
 * a provider SDK directly -- swapping providers is a one-file change
 * (set AI_PROVIDER and the matching key env var) rather than a
 * grep-and-replace across every onboarding/advisor/screening call site.
 *
 * Supports github_models (default -- free during early build/testing),
 * anthropic, openai, and gemini. Switch via AI_PROVIDER in .env.local.
 *
 * Multi-key rotation: every provider accepts either a single key
 * (e.g. ANTHROPIC_API_KEY) or a comma-separated list
 * (ANTHROPIC_API_KEYS) for automatic failover -- if a request comes
 * back rate-limited (429) or unauthorized (401/403, e.g. an exhausted
 * free-tier key), the next key in the list is tried automatically
 * before giving up. Mirrors the same rotation pattern already used for
 * Serper (src/lib/serper/server.ts) -- one consistent approach across
 * the codebase rather than reinventing it per integration.
 */

interface CompleteParams {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

const PROVIDER = process.env.AI_PROVIDER ?? "github_models";

export async function complete(params: CompleteParams): Promise<string> {
  switch (PROVIDER) {
    case "github_models":
      return completeViaGithubModels(params);
    case "anthropic":
      return completeViaAnthropic(params);
    case "openai":
      return completeViaOpenAI(params);
    case "gemini":
      return completeViaGemini(params);
    default:
      throw new Error(`Unknown AI_PROVIDER: ${PROVIDER}`);
  }
}

/** Parses "key1,key2,key3" (or a single key, or the empty/unset case) into a clean array. */
function parseKeys(multi: string | undefined, single: string | undefined): string[] {
  const raw = [...(multi ?? "").split(","), single ?? ""];
  return Array.from(new Set(raw.map((k) => k.trim()).filter(Boolean)));
}

/**
 * Tries `attempt` once per key in order, moving to the next key only
 * on a response shape that actually indicates "this key is the
 * problem" (429 rate-limited, 401/403 unauthorized/exhausted) --
 * anything else (a real 500, a malformed request) fails immediately
 * rather than burning through every key on an error no key swap would
 * fix.
 */
async function withKeyRotation<T>(
  keys: string[],
  providerName: string,
  attempt: (key: string) => Promise<T>
): Promise<T> {
  if (keys.length === 0) {
    throw new Error(
      `No API key configured for AI_PROVIDER="${providerName}". Set the matching *_API_KEY (or *_API_KEYS for multiple) env var.`
    );
  }

  let lastError: unknown = null;
  for (const key of keys) {
    try {
      return await attempt(key);
    } catch (err) {
      const status = err instanceof ProviderHttpError ? err.status : null;
      if (status === 429 || status === 401 || status === 403) {
        lastError = err;
        continue; // this key specifically is the problem -- try the next one
      }
      throw err; // not a key problem -- don't burn through the rest of the list
    }
  }
  throw new Error(
    `All ${keys.length} ${providerName} key(s) failed (rate-limited or unauthorized). Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

class ProviderHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function completeViaGithubModels({
  system,
  messages,
  maxTokens = 600,
  temperature = 0.6,
}: CompleteParams): Promise<string> {
  const keys = parseKeys(process.env.GITHUB_MODELS_TOKENS, process.env.GITHUB_MODELS_TOKEN);
  const model = process.env.GITHUB_MODELS_MODEL ?? "openai/gpt-4o-mini";

  return withKeyRotation(keys, "GitHub Models", async (token) => {
    const res = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: maxTokens,
        temperature,
      }),
    });
    if (!res.ok) throw new ProviderHttpError(res.status, `GitHub Models request failed: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  });
}

async function completeViaAnthropic({
  system,
  messages,
  maxTokens = 600,
  temperature = 0.6,
}: CompleteParams): Promise<string> {
  const keys = parseKeys(process.env.ANTHROPIC_API_KEYS, process.env.ANTHROPIC_API_KEY);
  // Was previously hardcoded to "claude-sonnet-4-6", which isn't a real
  // model string -- corrected to a real, current one. Override via
  // ANTHROPIC_MODEL if you want a different Claude model.
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

  return withKeyRotation(keys, "Anthropic", async (apiKey) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, system, messages, max_tokens: maxTokens, temperature }),
    });
    if (!res.ok) throw new ProviderHttpError(res.status, `Anthropic request failed: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  });
}

async function completeViaOpenAI({
  system,
  messages,
  maxTokens = 600,
  temperature = 0.6,
}: CompleteParams): Promise<string> {
  const keys = parseKeys(process.env.OPENAI_API_KEYS, process.env.OPENAI_API_KEY);
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  return withKeyRotation(keys, "OpenAI", async (apiKey) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: maxTokens,
        temperature,
      }),
    });
    if (!res.ok) throw new ProviderHttpError(res.status, `OpenAI request failed: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  });
}

async function completeViaGemini({
  system,
  messages,
  maxTokens = 600,
  temperature = 0.6,
}: CompleteParams): Promise<string> {
  const keys = parseKeys(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY);
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  return withKeyRotation(keys, "Gemini", async (apiKey) => {
    // Gemini's REST API has no separate "system" role -- it's passed
    // via systemInstruction, and turns use "model" instead of
    // "assistant" for the other party.
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      }
    );
    if (!res.ok) throw new ProviderHttpError(res.status, `Gemini request failed: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  });
}
