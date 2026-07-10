import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata = {
  title: "Privacy Policy — ChairMatch",
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

export default function PrivacyPage() {
  return (
    <div>
      <SiteHeader />
      <main className="px-5 md:px-10 py-16 max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">
          Privacy Policy
        </h1>
        <p className="text-[13px] text-ink-faint mb-12">
          Last updated: July 9, 2026
        </p>

        <p className="text-[14.5px] text-ink-soft leading-relaxed mb-10">
          This Privacy Policy explains what information ChairMatch
          collects, how we use it, and the choices you have. It applies to
          everyone who uses ChairMatch — Practices and Candidates alike.
        </p>

        <Section number="1" title="Information we collect">
          <p>
            <span className="font-semibold text-ink">Account information:</span>{" "}
            email address and password (handled by our authentication
            provider), account type (Practice or Candidate).
          </p>
          <p>
            <span className="font-semibold text-ink">Profile information:</span>{" "}
            practice name and location, or candidate role, experience, and
            credentials; compensation ranges and expectations; schedule and
            availability; dealbreakers and preferences; culture and
            qualitative answers you choose to write; a profile photo, if
            you add one.
          </p>
          <p>
            <span className="font-semibold text-ink">Messages:</span> the
            content of messages you send through ChairMatch to other users.
          </p>
          <p>
            <span className="font-semibold text-ink">Payment information:</span>{" "}
            handled directly by our payment processor — we receive
            confirmation of your subscription status, not your full card
            number.
          </p>
          <p>
            <span className="font-semibold text-ink">Usage information:</span>{" "}
            pages viewed, searches run, profiles unlocked, and similar
            product-usage data, collected automatically.
          </p>
        </Section>

        <Section number="2" title="How we use this information">
          <ul className="list-disc pl-5 space-y-2">
            <li>To operate the marketplace — matching, search, messaging, and the free-vs-paid profile paywall</li>
            <li>To process payments and manage subscriptions</li>
            <li>To send account, transactional, and (if you opt in) product emails</li>
            <li>To detect fraud, abuse, and violations of our Terms of Service</li>
            <li>To improve the product based on aggregate usage patterns</li>
          </ul>
        </Section>

        <Section number="3" title="How information is shared">
          <p>
            Your profile is visible to other users of ChairMatch as
            intended by the product: Practices on the free tier see full
            profile content with your name and photo blurred; a paid
            Standard subscription reveals that detail. We don&apos;t sell
            your personal information, and we don&apos;t share it with
            third parties for their own marketing purposes.
          </p>
          <p>
            We share data with service providers who help us run
            ChairMatch under contract — our database and authentication
            provider, our payment processor, our email delivery provider,
            and, for AI-assisted writing fields, a third-party AI provider
            that processes the text you submit to generate suggestions. We
            may also disclose information if required by law or to protect
            the rights, safety, or property of ChairMatch or our users.
          </p>
        </Section>

        <Section number="4" title="Cookies and similar technologies">
          <p>
            We use essential cookies to keep you signed in and to remember
            basic preferences. We don&apos;t currently use third-party
            advertising trackers.
          </p>
        </Section>

        <Section number="5" title="Your choices and rights">
          <p>
            You can review and edit most of your profile information
            directly in your account settings, and you can delete your
            account at any time. Depending on where you live, you may have
            additional rights over your personal information — for
            example, the right to request a copy of your data, request
            deletion, or object to certain processing (rights that exist
            under laws like the California Consumer Privacy Act and the
            EU/UK GDPR). To exercise any of these, contact us at the email
            below.
          </p>
        </Section>

        <Section number="6" title="Data retention">
          <p>
            We keep your information for as long as your account is active,
            and for a limited period after deletion as needed for legal,
            billing, or fraud-prevention purposes, after which it&apos;s
            deleted or anonymized.
          </p>
        </Section>

        <Section number="7" title="Data security">
          <p>
            We use industry-standard safeguards — including encryption in
            transit and access controls on our database — to protect your
            information. No system is completely secure, so we can&apos;t
            guarantee absolute security.
          </p>
        </Section>

        <Section number="8" title="Children's privacy">
          <p>
            ChairMatch is intended for people 18 and older. We don&apos;t
            knowingly collect information from anyone under 18.
          </p>
        </Section>

        <Section number="9" title="Changes to this policy">
          <p>
            We may update this policy as ChairMatch evolves. We&apos;ll
            post any changes here with a new &quot;Last updated&quot; date.
          </p>
        </Section>

        <Section number="10" title="Contact">
          <p>
            Questions about this policy, or want to exercise a privacy
            right? Reach us at{" "}
            <a href="mailto:privacy@chairmatch.com" className="text-teal-deep font-semibold">
              privacy@chairmatch.com
            </a>
            .
          </p>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
