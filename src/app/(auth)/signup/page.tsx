"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AccountType = "owner" | "candidate";

/**
 * Signup page with the owner-vs-candidate fork from the homepage design
 * pass. Functional (creates a real Supabase auth user + a profiles row).
 *
 * Skips the fork entirely when arriving via /signup?type=owner or
 * ?type=candidate -- the homepage's "I'm hiring" / "I'm looking for
 * work" buttons link here with that param now, since asking the exact
 * same question again immediately after someone already answered it
 * by clicking a homepage CTA was a confirmed audit finding.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-ink-faint">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const arrivedWithType = typeParam === "owner" || typeParam === "candidate";

  const [accountType, setAccountType] = useState<AccountType | null>(
    arrivedWithType ? (typeParam as AccountType) : null
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountType || !termsAccepted) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        account_type: accountType,
        terms_accepted_at: new Date().toISOString(),
        marketing_opt_in: marketingOptIn,
      });

      if (profileError) {
        setLoading(false);
        setError(profileError.message);
        return;
      }
    }

    setLoading(false);
    window.location.href =
      accountType === "owner" ? "/onboarding/owner" : "/onboarding/candidate";
  }

  if (!accountType) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <span className="w-[7px] h-[7px] rounded-full bg-coral" />
            <span className="font-serif text-xl font-semibold">
              ChairMatch
            </span>
          </div>
          <h1 className="font-serif text-2xl font-semibold mb-8">
            What brings you here?
          </h1>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setAccountType("owner")}
              className="flex items-center gap-3.5 p-5 rounded-2xl border border-line bg-bg-raised hover:border-teal text-left transition-colors"
            >
              <Building2 size={22} className="text-teal-deep shrink-0" />
              <div>
                <div className="font-semibold text-[15px]">I&apos;m hiring</div>
                <div className="text-[13px] text-ink-faint">
                  Find dental staff who actually fit your practice
                </div>
              </div>
            </button>

            <button
              onClick={() => setAccountType("candidate")}
              className="flex items-center gap-3.5 p-5 rounded-2xl border border-line bg-bg-raised hover:border-teal text-left transition-colors"
            >
              <UserRound size={22} className="text-teal-deep shrink-0" />
              <div>
                <div className="font-semibold text-[15px]">
                  I&apos;m looking for work
                </div>
                <div className="text-[13px] text-ink-faint">
                  Find a practice that actually fits you
                </div>
              </div>
            </button>
          </div>

          <p className="text-[13px] text-ink-faint mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-deep font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {!arrivedWithType && (
          <button
            onClick={() => setAccountType(null)}
            className="text-[13px] text-ink-faint hover:text-ink mb-5"
          >
            ← Back
          </button>
        )}

        <h1 className="font-serif text-2xl font-semibold mb-6">
          {accountType === "owner" ? "Set up your practice account" : "Create your profile"}
        </h1>

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
            minLength={8}
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14.5px] outline-none focus:border-teal"
          />

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-4 h-4 rounded accent-teal mt-0.5"
            />
            <span className="text-[12.5px] text-ink-soft">
              I agree to ChairMatch&apos;s{" "}
              <a href="/terms" target="_blank" className="text-teal-deep font-semibold">Terms</a> and{" "}
              <a href="/privacy" target="_blank" className="text-teal-deep font-semibold">Privacy Policy</a>.
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="w-4 h-4 rounded accent-teal mt-0.5"
            />
            <span className="text-[12.5px] text-ink-soft">
              Send me updates about opportunities and new features.
            </span>
          </label>

          {error && <p className="text-[13px] text-coral-deep">{error}</p>}

          <button
            type="submit"
            disabled={loading || !termsAccepted}
            className="w-full bg-teal disabled:opacity-60 text-white font-semibold text-[15px] py-3 rounded-control hover:bg-teal-deep transition-colors"
          >
            {loading ? "Creating account…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
