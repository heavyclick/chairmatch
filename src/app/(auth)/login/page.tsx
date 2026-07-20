"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Safe redirect validation -- only ever follows a relative, in-app
 * path (must start with "/", never "//"  which browsers treat as
 * protocol-relative to an external host). Without this check,
 * ?redirect=https://evil.com or ?redirect=//evil.com would let anyone
 * craft a Hdenta login link that phishes a user and then silently
 * ships them off-site right after they type their real password in.
 */
function safeRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = safeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    // Route by the account's real type rather than assuming -- this is
    // the fix for the bug where every login landed on /owner/browse
    // regardless of whether the account was a candidate or an owner.
    const userId = signInData.user?.id;
    if (!userId) {
      setLoading(false);
      setError("Something went wrong signing you in -- please try again.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", userId)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      // Profile row is missing for some reason -- fail safe rather than
      // guess which dashboard to send them to.
      setError("We couldn't find your account details. Please contact support.");
      return;
    }

    // A ?redirect= (e.g. from a locked "Apply" button on a public job
    // posting, or a locked "Message" button on a public candidate
    // profile teaser) takes priority over the default dashboard --
    // that's the whole point of preserving it, landing someone back on
    // exactly what they were trying to do before hitting the auth gate.
    window.location.href = redirect ?? (profile.account_type === "owner" ? "/owner/dashboard" : "/candidate/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-[7px] h-[7px] rounded-full bg-coral" />
          <span className="font-serif text-xl font-semibold">Hdenta</span>
        </div>

        <h1 className="font-serif text-2xl font-semibold mb-2 text-center">
          Log in
        </h1>
        <p className="text-[13px] text-ink-faint text-center mb-6">
          Works for both practice owners and dental staff -- we&apos;ll take you to the right place.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14.5px] outline-none focus:border-teal"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14.5px] outline-none focus:border-teal"
          />

          {error && (
            <p className="text-[13px] text-coral-deep">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal disabled:opacity-60 text-white font-semibold text-[15px] py-3 rounded-control hover:bg-teal-deep transition-colors"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="text-center text-[13px] text-ink-faint mt-5">
          No account?{" "}
          <Link href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup"} className="text-teal-deep font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
