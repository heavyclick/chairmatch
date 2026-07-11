import Link from "next/link";
import {
  Building2,
  UserRound,
  Check,
  X,
  Quote,
  PenLine,
  ScanEye,
  MessagesSquare,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function Home() {
  return (
    <div>
      <SiteHeader />

      {/* Hero -- previously just top-padded (pt-20/pb-16), so it read as
          "content sitting at the top of a page" rather than its own
          quiet moment. Now min-h-screen + flex centering so it fills
          the viewport the way the reference did, and the type scale is
          dialed back to match that screenshot's restraint (48px-ish
          wordmark, not a shouty 72px one). */}
      <section className="min-h-screen flex flex-col items-center justify-center px-5 md:px-10 text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-5">
          Hdenta
        </h1>
        <p className="text-[17px] md:text-lg text-ink-soft max-w-sm mx-auto mb-12 leading-relaxed">
          HIRE FOR FIT. NOT JUST CREDENTIALS
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
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

      {/* Comparison -- moved up right under the hero. This is the page's
          fastest "why us" moment, so it shouldn't be buried five
          sections down where most visitors never scroll to. */}
      <section className="min-h-screen flex items-center px-5 md:px-10 py-20 bg-bg-raised border-y border-line">
        <div className="max-w-3xl mx-auto w-full">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-center mb-14">
            The old way vs. Hdenta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-line p-8">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-5">
                The old way
              </p>
              <ul className="space-y-4">
                {[
                  "Per-post fees, $94–399 each posting",
                  "Subscriptions that auto-renew quietly",
                  "Resumes, no real culture-fit signal",
                  "Weeks of silence after applying",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14.5px] text-ink-soft">
                    <X size={15} className="text-coral-deep mt-0.5 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-teal bg-teal-tint/30 p-8">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-teal-deep mb-5">
                Hdenta
              </p>
              <ul className="space-y-4">
                {[
                  "One flat annual price, unlimited contact",
                  "One-click cancellation, no traps",
                  "Real disclosure: comp, culture, dealbreakers",
                  "Every dealbreaker in writing before you call",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14.5px] text-ink">
                    <Check size={15} className="text-teal-deep mt-0.5 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The clock-line section, relocated from the hero (which now
          leads with the plainer wordmark + positioning line) into its
          own moment lower on the page, paired with the mirrored
          owner/candidate cards it originally introduced. */}
      <section className="min-h-screen flex items-center px-5 md:px-10 py-20">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold leading-snug mb-4 max-w-xl mx-auto">
              The only surprise on day one is where the bathroom is.
            </h2>
            <p className="text-[16px] text-ink-soft max-w-lg mx-auto leading-relaxed">
              Hdenta is where dental practices and dental staff say the
              real stuff — schedule, pay, dealbreakers, the actual culture —
              before anyone applies. Not after someone&apos;s already given
              notice.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div id="for-practices" className="scroll-mt-24 rounded-2xl border border-line p-8 bg-bg-raised">
              <div className="flex items-center gap-2 mb-5">
                <Building2 size={16} className="text-teal-deep" />
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                  For practices
                </span>
              </div>
              <p className="font-serif text-xl font-semibold leading-snug mb-4">
                You don&apos;t lose good hires. You lose the ones who never
                should&apos;ve said yes.
              </p>
              <p className="text-[14.5px] text-ink-soft leading-relaxed">
                By the time someone says the schedule &quot;doesn&apos;t
                work,&quot; they knew that in week one. On Hdenta, every
                candidate has already told you what they won&apos;t do —
                solo coverage, weekends, a family-run office — before you
                ever pick up the phone.
              </p>
            </div>
            <div id="for-staff" className="scroll-mt-24 rounded-2xl border border-line p-8 bg-bg-raised">
              <div className="flex items-center gap-2 mb-5">
                <UserRound size={16} className="text-teal-deep" />
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                  For dental staff
                </span>
              </div>
              <p className="font-serif text-xl font-semibold leading-snug mb-4">
                Nobody wants to learn the schedule &quot;runs tight&quot; on
                their first real Monday.
              </p>
              <p className="text-[14.5px] text-ink-soft leading-relaxed">
                Practices on Hdenta write down the actual week before
                you apply — the short-staffed days, the pace, what
                they&apos;ll need from you when it&apos;s busy. You list
                your dealbreakers too, so a no on either side happens
                before the offer, not after.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works -- a genuine 3-step sequence, so numbering earns its place */}
      <section className="min-h-screen flex items-center px-5 md:px-10 py-20 bg-bg-raised border-y border-line">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-center mb-16">
            How practices actually use it
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: PenLine,
                step: "01",
                title: "Say the real stuff",
                body: "Set your filters, then answer the questions job posts never ask — comp range, software, the dealbreakers you already know matter.",
              },
              {
                icon: ScanEye,
                step: "02",
                title: "See who's actually a fit",
                body: "Every match is judged on disclosure, not a resume. Names and photos stay blurred until you're ready to reach out.",
              },
              {
                icon: MessagesSquare,
                step: "03",
                title: "Reach out, not around",
                body: "One flat annual price unlocks direct messaging with every match — no per-post fee resetting the clock on you.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div className="flex items-center gap-2.5 mb-4">
                  <s.icon size={18} className="text-teal-deep" />
                  <span className="font-serif text-[13px] font-semibold text-ink-faint">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-semibold text-[16px] mb-2.5">{s.title}</h3>
                <p className="text-[14px] text-ink-soft leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profile examples -- renamed from "What gets said out loud" and
          given a plainer, more literal intro. The previous heading was
          cute but left first-time visitors unsure whether these were
          real testimonials, made-up flavor text, or something else.
          Each card now also carries a role icon so it reads at a
          glance as "practice said this" vs "candidate said this." */}
      <section className="min-h-screen flex items-center px-5 md:px-10 py-20">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-center mb-4">
            This is what a profile actually says
          </h2>
          <p className="text-center text-ink-faint text-[15px] mb-16 max-w-lg mx-auto">
            Every Hdenta profile answers questions a resume or job post
            never asks. Here&apos;s what that looks like in practice.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "No weekends, ever. That's not a preference, it's a dealbreaker.",
                label: "Hygienist's dealbreaker list",
                icon: UserRound,
              },
              {
                quote: "Mondays run short-staffed and the pace is fast. If that's not you, better to know now.",
                label: "Practice's culture disclosure",
                icon: Building2,
              },
              {
                quote: "I want to be trusted to run my own schedule, not filed as a warm body.",
                label: "Candidate's goals field",
                icon: UserRound,
              },
            ].map((q) => (
              <div key={q.label} className="rounded-2xl bg-bg-raised border border-line p-7">
                <Quote size={16} className="text-gold mb-4" />
                <p className="font-serif italic text-[17px] leading-snug text-ink mb-5">
                  {q.quote}
                </p>
                <div className="flex items-center gap-1.5">
                  <q.icon size={12} className="text-ink-faint" />
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                    {q.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing -- now with real signup CTAs on each plan instead of
          a static feature list nobody could act on. Checkout itself
          happens post-signup from the owner's billing page (see
          src/app/owner/settings/billing), so the Standard button says
          so rather than implying an instant charge from the homepage. */}
      <section id="pricing" className="scroll-mt-24 min-h-screen flex items-center px-5 md:px-10 py-20 bg-bg-raised border-y border-line">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-center mb-3">Simple, honest pricing</h2>
          <p className="text-center text-ink-faint text-[15px] mb-16">
            Annual only. No surprise renewals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-line p-8 flex flex-col">
              <h3 className="font-semibold text-[16px] mb-1">Free</h3>
              <p className="font-serif text-3xl font-semibold mb-6">$0</p>
              <ul className="space-y-2.5 text-[14px] text-ink-soft mb-8 flex-1">
                <li>Full filters & search</li>
                <li>Full qualitative profiles</li>
                <li>Blurred name & photo</li>
              </ul>
              <Link
                href="/signup?type=owner"
                className="text-center border border-line px-4 py-2.5 rounded-control font-semibold text-[13.5px] hover:border-teal transition-colors"
              >
                Get started free
              </Link>
            </div>
            <div className="rounded-2xl border-2 border-teal bg-teal-tint/30 p-8 flex flex-col">
              <h3 className="font-semibold text-[16px] mb-1">Standard</h3>
              <p className="font-serif text-3xl font-semibold mb-6">$100/yr</p>
              <ul className="space-y-2.5 text-[14px] text-ink mb-8 flex-1">
                <li>Everything in Free</li>
                <li>Unblur every profile</li>
                <li>Direct messaging</li>
              </ul>
              <Link
                href="/signup?type=owner"
                className="text-center bg-teal text-white px-4 py-2.5 rounded-control font-semibold text-[13.5px] hover:bg-teal-deep transition-colors mb-2"
              >
                Get Standard
              </Link>
              <p className="text-[11.5px] text-ink-faint text-center">
                Set up your practice profile first — upgrade any time from
                your dashboard.
              </p>
            </div>
            {/* PAUSED (AI Pro tier) -- AI Search/Advisor/Screening are on
                hold pending real demand (see src/app/owner/settings/billing
                /page.tsx for the full picture). Restore this card, and the
                3-column grid above, together when Pro is re-enabled.
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
            */}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-5 md:px-10 py-20 bg-ink text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-white leading-snug mb-4 max-w-lg mx-auto">
          The next hire&apos;s first Monday hasn&apos;t happened yet.
        </h2>
        <p className="text-[16px] text-[#B9C6C2] mb-10">
          Make it the kind nobody&apos;s surprised by.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup?type=owner"
            className="flex items-center gap-2.5 justify-center bg-teal text-white px-6 py-3.5 rounded-control font-semibold text-[15px] hover:bg-teal-deep transition-colors"
          >
            <Building2 size={17} /> I&apos;m hiring
          </Link>
          <Link
            href="/signup?type=candidate"
            className="flex items-center gap-2.5 justify-center border border-white/20 text-white px-6 py-3.5 rounded-control font-semibold text-[15px] hover:border-white/40 transition-colors"
          >
            <UserRound size={17} /> I&apos;m looking for work
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
