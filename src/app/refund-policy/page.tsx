import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata = {
  title: "Refund Policy — Hdenta",
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

export default function RefundPolicyPage() {
  return (
    <div>
      <SiteHeader />
      <main className="px-5 md:px-10 py-16 max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">
          Refund Policy
        </h1>
        <p className="text-[13px] text-ink-faint mb-12">
          Last updated: July 11, 2026
        </p>

        <p className="text-[14.5px] text-ink-soft leading-relaxed mb-10">
          This policy covers the paid Standard subscription available to
          Practice accounts on Hdenta. Candidate accounts are always free,
          so nothing here applies to them.
        </p>

        <Section number="1" title="14-day money-back guarantee">
          <p>
            If you&apos;re on your <span className="font-semibold text-ink">first-ever</span> Standard
            subscription and it&apos;s not for you, email us within 14 days
            of the original purchase date and we&apos;ll refund it in
            full, no questions asked. This guarantee applies once per
            practice — it covers your first purchase, not a subscription
            you&apos;ve already renewed or previously refunded.
          </p>
        </Section>

        <Section number="2" title="After the first 14 days">
          <p>
            Subscriptions are billed annually and renew automatically at
            the then-current price unless cancelled beforehand. Outside
            the 14-day window above, payments aren&apos;t refunded or
            prorated for the remaining time on a cancelled or unused
            subscription — this matches the cancellation terms in our{" "}
            <a href="/terms" className="text-teal-deep font-semibold">Terms of Service</a>.
            Cancelling stops the next renewal; it doesn&apos;t refund the
            current period.
          </p>
        </Section>

        <Section number="3" title="Billing mistakes">
          <p>
            Charged twice for the same period, charged after you cancelled,
            or billed the wrong amount? That&apos;s on us to fix, not
            covered by the windows above — email us and we&apos;ll correct
            it and refund the difference.
          </p>
        </Section>

        <Section number="4" title="How to request one">
          <p>
            Email{" "}
            <a href="mailto:support@hdenta.com" className="text-teal-deep font-semibold">
              support@hdenta.com
            </a>{" "}
            from the address on your account with your practice name and
            the reason for the request. We aim to respond within 2 business
            days. Approved refunds are issued back to the original payment
            method through our payment provider, and typically
            appear within 5–10 business days depending on your bank.
          </p>
        </Section>

        <Section number="5" title="Changes to this policy">
          <p>
            We may update this policy as Hdenta evolves. We&apos;ll post
            any changes here with a new &quot;Last updated&quot; date.
          </p>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
