import Link from "next/link";

/**
 * Shared chrome for every public marketing page (home, terms, privacy).
 * Previously the homepage had its own one-off header and the legal
 * pages had none at all -- pulling this out means Terms/Privacy don't
 * look like an orphaned page bolted onto the site.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-10 py-4 bg-bg/85 backdrop-blur-sm border-b border-line">
      <Link href="/" className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-coral" />
        <span className="font-serif text-lg font-semibold">Hdenta</span>
      </Link>
      <nav className="hidden md:flex items-center gap-7 text-[13.5px] font-semibold text-ink-soft">
        <Link href="/#for-practices" className="hover:text-ink transition-colors">
          For practices
        </Link>
        <Link href="/#for-staff" className="hover:text-ink transition-colors">
          For dental staff
        </Link>
        <Link href="/#pricing" className="hover:text-ink transition-colors">
          Pricing
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-[14px] font-semibold text-ink-soft hover:text-ink border border-line px-4 py-2 rounded-control hover:border-teal transition-colors"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
