/**
 * Single seam for all LLM calls in the app.
 *
 * Today: GitHub Models (Azure-hosted GPT via the free GitHub Models
 * endpoint), used during early build/testing per the founder's existing
 * token access -- see https://docs.github.com/en/github-models
 *
 * Later: swap to a paid Anthropic/OpenAI/Gemini key once there's real
 * volume. Every call in the app should go through `complete()` below,
 * not call a provider SDK directly, so that swap is a one-file change
 * (just rewrite this file's internals) rather than a grep-and-replace
 * across every onboarding/advisor/screening call site.
 *
 * GitHub Models uses an OpenAI-compatible chat completions endpoint, so
 * this is a thin wrapper around fetch() rather than a heavy SDK --
 * intentionally, so the swap to a different OpenAI-compatible provider
 * (or a different shape entirely) stays simple.
 */

interface CompleteParams {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

const PROVIDER = process.env.AI_PROVIDER ?? "github_models";

export async function complete({
  system,
  messages,
  maxTokens = 600,
  temperature = 0.6,
}: CompleteParams): Promise<string> {
  if (PROVIDER === "github_models") {
    return completeViaGithubModels({ system, messages, maxTokens, temperature });
  }
  if (PROVIDER === "anthropic") {
    return completeViaAnthropic({ system, messages, maxTokens, temperature });
  }
  throw new Error(`Unknown AI_PROVIDER: ${PROVIDER}`);
}

async function completeViaGithubModels({
  system,
  messages,
  maxTokens,
  temperature,
}: CompleteParams): Promise<string> {
  const token = process.env.GITHUB_MODELS_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_MODELS_TOKEN is not set. Add it to .env.local -- see https://docs.github.com/en/github-models for getting a free token."
    );
  }

  // GitHub Models exposes an OpenAI-compatible endpoint at
  // models.github.ai (formerly models.inference.ai.azure.com).
  // gpt-4o-mini is the right default here: cheap enough for high-volume
  // onboarding-assist calls, capable enough for the writing-help task.
  const model = process.env.GITHUB_MODELS_MODEL ?? "openai/gpt-4o-mini";

  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GitHub Models request failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function completeViaAnthropic({
  system,
  messages,
  maxTokens,
  temperature,
}: CompleteParams): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      system,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Anthropic request failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}
