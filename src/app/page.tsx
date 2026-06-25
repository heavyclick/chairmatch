import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-semibold mb-3">ChairMatch</h1>
        <p className="text-ink-soft mb-6">Hire for fit, not just credentials.</p>
        <Link
          href="/owner/browse"
          className="inline-block bg-teal text-white px-5 py-2.5 rounded-control font-semibold text-sm"
        >
          View owner browse prototype →
        </Link>
      </div>
    </div>
  );
}
