import Link from "next/link";
import { Building2, UserRound, Check, X, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Top nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-10 py-4 bg-bg/85 backdrop-blur-sm border-b border-line">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-coral" />
          <span className="font-serif text-lg font-semibold">ChairMatch</span>
        </Link>
        <Link
          href="/login"
          className="text-[14px] font-semibold text-ink-soft hover:text-ink border border-line px-4 py-2 rounded-control hover:border-teal transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="px-5 md:px-10 pt-16 md:pt-24 pb-14 max-w-4xl mx-auto text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight mb-5">
          Hire for fit, not just credentials.
        </h1>
        <p className="text-[16px] md:text-[17px] text-ink-soft max-w-xl mx-auto mb-10 leading-relaxed">
          The dental staffing marketplace where practices and staff disclose what
          actually matters — culture, schedule, comp — before anyone applies.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-3">
          {/* These link to /signup?type=owner|candidate so the fork
              question ("What brings you here?") on the signup page is
              skipped entirely -- the person already answered it by
              clicking one of these two buttons. Previously both
              buttons linked to a bare /signup, which asked the exact
              same question again right after. */}
          <Link
            href="/signup?type=owner"
            className="flex items-center gap-2.5 justify-center bg-teal text-white px-6 py-3.5 rounded-control font-semibold text-[15px] hover:bg-teal-deep transition-colors"
          >
            <Building2 size={17} /> I&apos;m hiring
          </Link>
          <Link
            href="/signup?type=candidate"
            className="flex items-center gap-2.5 justify-center border border-line px-6 py-3.5 rounded-control font-semibold text-[15px] hover:border-teal transition-colors"
          >
            <UserRound size={17} /> I&apos;m looking for work
          </Link>
        </div>
        <p className="text-[12.5px] text-ink-faint">
          Free for dental staff, always. No credit card needed.
        </p>
      </section>

      {/* Comparison */}
      <section className="px-5 md:px-10 py-14 bg-bg-raised border-y border-line">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl font-semibold text-center mb-8">
            The old way vs. ChairMatch
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-line p-6">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-4">
                The old way
              </p>
              <ul className="space-y-3">
                {[
                  "Per-post fees, $94–399 each posting",
                  "Subscriptions that auto-renew quietly",
                  "Resumes, no real culture-fit signal",
                  "Weeks of silence after applying",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink-soft">
                    <X size={15} className="text-coral-deep mt-0.5 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-teal bg-teal-tint/30 p-6">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-teal-deep mb-4">
                ChairMatch
              </p>
              <ul className="space-y-3">
                {[
                  "One flat annual price, unlimited contact",
                  "One-click cancellation, no traps",
                  "Real disclosure: comp, culture, dealbreakers",
                  "AI screening gets you a scorecard in days",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14px] text-ink">
                    <Check size={15} className="text-teal-deep mt-0.5 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-5 md:px-10 py-16 max-w-4xl mx-auto">
        <h2 className="font-serif text-2xl font-semibold text-center mb-2">Simple, honest pricing</h2>
        <p className="text-center text-ink-faint text-[14.5px] mb-10">
          Annual only. No surprise renewals.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-line p-6">
            <h3 className="font-semibold text-[15px] mb-1">Free</h3>
            <p className="font-serif text-2xl font-semibold mb-4">$0</p>
            <ul className="space-y-2 text-[13.5px] text-ink-soft">
              <li>Full filters & search</li>
              <li>Full qualitative profiles</li>
              <li>Blurred name & photo</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-line p-6">
            <h3 className="font-semibold text-[15px] mb-1">Standard</h3>
            <p className="font-serif text-2xl font-semibold mb-4">$100/yr</p>
            <ul className="space-y-2 text-[13.5px] text-ink-soft">
              <li>Everything in Free</li>
              <li>Unblur every profile</li>
              <li>Direct messaging</li>
            </ul>
          </div>
          <div className="relative rounded-2xl border-2 border-teal bg-teal-tint/30 p-6">
            <span className="absolute -top-3 left-5 bg-coral text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full">
              Recommended
            </span>
            <h3 className="font-semibold text-[15px] mb-1 mt-1 flex items-center gap-1.5">
              Pro <Sparkles size={13} className="text-teal-deep" />
            </h3>
            <p className="font-serif text-2xl font-semibold mb-4">$250/yr</p>
            <ul className="space-y-2 text-[13.5px] text-ink">
              <li>Everything in Standard</li>
              <li>AI search & outreach</li>
              <li>10 screening credits included</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="px-5 md:px-10 py-8 text-center text-[12.5px] text-ink-faint border-t border-line">
        ChairMatch · Built for independent dental practices
      </footer>
    </div>
  );
}

