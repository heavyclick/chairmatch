import Link from "next/link";

/**
 * Real footer -- the old one was a single centered line of text, which
 * reads as an unfinished page next to anything like Indeed/ZipRecruiter.
 * Shared between the homepage and the legal pages so Terms/Privacy
 * don't dead-end with no way back into the product.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-bg-raised">
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-coral" />
            <span className="font-serif text-lg font-semibold">Hdenta</span>
          </Link>
          <p className="text-[13.5px] text-ink-soft leading-relaxed max-w-xs">
            The hiring marketplace for independent dental practices --
            built around what a resume can&apos;t tell you.
          </p>
        </div>

        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint mb-3">
            For practices
          </p>
          <ul className="space-y-2.5 text-[13.5px] text-ink-soft">
            <li>
              <Link href="/signup?type=owner" className="hover:text-ink transition-colors">
                Create a practice profile
              </Link>
            </li>
            <li>
              <Link href="/#for-practices" className="hover:text-ink transition-colors">
                How hiring works
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="hover:text-ink transition-colors">
                Pricing
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint mb-3">
            For dental staff
          </p>
          <ul className="space-y-2.5 text-[13.5px] text-ink-soft">
            <li>
              <Link href="/signup?type=candidate" className="hover:text-ink transition-colors">
                Create a profile
              </Link>
            </li>
            <li>
              <Link href="/#for-staff" className="hover:text-ink transition-colors">
                How it works
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint mb-3">
            Account &amp; legal
          </p>
          <ul className="space-y-2.5 text-[13.5px] text-ink-soft">
            <li>
              <Link href="/login" className="hover:text-ink transition-colors">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-ink transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-ink transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="hover:text-ink transition-colors">
                Refund Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line px-5 md:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-6xl mx-auto text-[12px] text-ink-faint">
        <span>© {year} Hdenta. Built for independent dental practices.</span>
        <div className="flex items-center gap-5">
          <Link href="/terms" className="hover:text-ink-soft transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink-soft transition-colors">
            Privacy
          </Link>
          <Link href="/refund-policy" className="hover:text-ink-soft transition-colors">
            Refunds
          </Link>
        </div>
      </div>
    </footer>
  );
}
