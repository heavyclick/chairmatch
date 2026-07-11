import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata = {
  title: "Terms of Service — Hdenta",
};

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="font-serif text-xl font-semibold mb-3">
        <span className="text-ink-faint mr-2">{number}.</span>
        {title}
      </h2>
      <div className="space-y-3 text-[14.5px] text-ink-soft leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div>
      <SiteHeader />
      <main className="px-5 md:px-10 py-16 max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">
          Terms of Service
        </h1>
        <p className="text-[13px] text-ink-faint mb-12">
          Last updated: July 9, 2026
        </p>

        <p className="text-[14.5px] text-ink-soft leading-relaxed mb-10">
          These Terms of Service (&quot;Terms&quot;) govern your access to
          and use of Hdenta, hiring software connecting independent
          dental practices (&quot;Practices,&quot; &quot;Owners&quot;) with
          dental staff seeking work (&quot;Candidates&quot;). By creating an
          account or otherwise using Hdenta, you agree to these Terms.
          If you don&apos;t agree, don&apos;t use the service.
        </p>

        <Section number="1" title="Who can use Hdenta">
          <p>
            You must be at least 18 years old and able to form a binding
            contract to create an account. Practice accounts must be
            created by someone authorized to act on behalf of the practice.
            One account per person or practice — accounts aren&apos;t
            transferable and can&apos;t be shared.
          </p>
        </Section>

        <Section number="2" title="What Hdenta is — and isn't">
          <p>
            Hdenta is subscription software that gives Practices search,
            filtering, and messaging tools to evaluate dental staff
            profiles, and gives Candidates a profile and inbox to be
            found through. We are not a staffing agency, employer of
            record, or recruiter, and we don&apos;t guarantee that any
            Practice will hire any Candidate or that any Candidate will
            accept an offer. Practices and Candidates are solely
            responsible for their own hiring decisions, employment terms,
            offer letters, background checks, licensing verification, and
            compliance with applicable labor and employment law.
          </p>
        </Section>

        <Section number="3" title="Accounts and profile accuracy">
          <p>
            You&apos;re responsible for the accuracy of the information in
            your profile — including compensation expectations, dealbreakers,
            software experience, credentials, and culture disclosures — and
            for keeping your login credentials secure. We may suspend or
            terminate accounts that contain materially false information,
            impersonate another person or practice, or are used to evade a
            suspension.
          </p>
        </Section>

        <Section number="4" title="Subscriptions and payment">
          <p>
            Candidate accounts are free, permanently. Practice accounts can
            search and view full profiles for free, with candidate name and
            photo blurred; unlocking that detail and direct messaging
            requires a paid Standard subscription, billed annually.
          </p>
          <p>
            Subscriptions renew automatically at the then-current price
            unless cancelled before the renewal date. You can cancel any
            time from your billing settings — cancellation takes effect at
            the end of the current billing period. Refund eligibility is
            covered separately in our{" "}
            <a href="/refund-policy" className="text-teal-deep font-semibold">Refund Policy</a>.
            Payments are processed by a third-party payment processor; we
            don&apos;t store your full card details.
          </p>
        </Section>

        <Section number="5" title="Messaging and conduct">
          <p>
            Messaging is for good-faith communication about employment
            opportunities. You agree not to use Hdenta to harass,
            spam, discriminate against, or solicit unrelated services from
            other users; to scrape, copy, or export other users&apos; data
            outside the platform; or to attempt to circumvent the
            subscription paywall (for example, by asking a matched
            candidate to share contact details on the free tier so a
            practice can avoid subscribing).
          </p>
          <p>
            Dealbreakers and preferences must relate to legitimate job
            requirements. Neither Practices nor Candidates may use
            Hdenta to discriminate on the basis of race, color,
            religion, sex, national origin, age, disability, or any other
            characteristic protected by applicable law.
          </p>
        </Section>

        <Section number="6" title="AI-assisted features">
          <p>
            Certain fields (like onboarding culture disclosures and
            qualitative answers) offer an optional AI writing assistant.
            Text you send to that assistant is processed by a third-party
            AI provider to generate suggestions; it never auto-fills a
            field without your review. Don&apos;t enter sensitive personal
            information (like a Social Security number or medical details)
            into any AI-assisted field.
          </p>
        </Section>

        <Section number="7" title="Intellectual property">
          <p>
            You retain ownership of the content you post. By posting it,
            you grant Hdenta a license to display it to other users as
            necessary to operate the platform (for example, showing a
            blurred version of your profile to a free-tier practice). The
            Hdenta name, logo, and platform itself are our property and
            aren&apos;t licensed to you beyond what&apos;s needed to use
            the service.
          </p>
        </Section>

        <Section number="8" title="Disclaimers">
          <p>
            Hdenta is provided &quot;as is&quot; without warranties of
            any kind. We don&apos;t vet Candidates&apos; credentials or
            Practices&apos; representations beyond what&apos;s stated in
            this document, and we&apos;re not responsible for the outcome
            of any hire, interview, or employment relationship formed
            through the platform.
          </p>
        </Section>

        <Section number="9" title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, Hdenta and its
            operators aren&apos;t liable for indirect, incidental, or
            consequential damages arising from your use of the service,
            and our total liability for any claim is limited to the amount
            you paid us in the twelve months before the claim arose.
          </p>
        </Section>

        <Section number="10" title="Termination">
          <p>
            You can close your account at any time from settings. We may
            suspend or terminate an account that violates these Terms, with
            notice where practical. Sections that by their nature should
            survive termination (like limitation of liability) will
            survive.
          </p>
        </Section>

        <Section number="11" title="Changes to these Terms">
          <p>
            We may update these Terms as the product evolves. We&apos;ll
            post the updated version here with a new &quot;Last
            updated&quot; date, and for material changes we&apos;ll make a
            reasonable effort to notify active users directly.
          </p>
        </Section>

        <Section number="12" title="Governing law">
          <p>
            These Terms are governed by the laws of the state in which
            Hdenta is incorporated, without regard to conflict-of-law
            principles.
          </p>
        </Section>

        <Section number="13" title="Contact">
          <p>
            Questions about these Terms? Reach us at{" "}
            <a href="mailto:support@Hdenta.com" className="text-teal-deep font-semibold">
              support@Hdenta.com
            </a>
            .
          </p>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
