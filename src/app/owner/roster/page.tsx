"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Trash2 } from "lucide-react";

interface RosterEntry {
  id: string;
  note: string | null;
  candidate: {
    id: string;
    full_name: string;
    photo_url: string | null;
    city: string | null;
    state: string | null;
    role?: { label: string };
  };
}

export default function OwnerRosterPage() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/owner/roster")
      .then((res) => res.json())
      .then((data) => setRoster(data.roster ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function remove(candidateId: string) {
    setRoster((r) => r.filter((x) => x.candidate.id !== candidateId));
    await fetch(`/api/owner/roster?candidateId=${candidateId}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <div className="flex items-center gap-2.5 mb-2">
        <Users size={20} className="text-teal-deep" />
        <h1 className="font-serif text-2xl md:text-3xl font-semibold">Your team roster</h1>
      </div>
      <p className="text-[14px] text-ink-faint mb-7">
        Candidates you&apos;ve pre-added to keep an eye on -- a private shortlist, not a conversation or an unlock.
      </p>

      {loading && <p className="text-ink-faint text-[14px]">Loading…</p>}

      {!loading && roster.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <Users size={22} className="mx-auto text-ink-faint mb-3" />
          <p className="text-[14.5px] font-semibold mb-1">No one on your roster yet</p>
          <p className="text-[13px] text-ink-faint mb-4">
            Add candidates from their profile page while browsing.
          </p>
          <Link href="/owner/browse" className="text-teal-deep font-semibold text-[13.5px]">
            Browse candidates →
          </Link>
        </div>
      )}

      <div className="space-y-2.5">
        {roster.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3.5 p-4 rounded-xl border border-line bg-bg-raised">
            <Link
              href={`/owner/candidate/${entry.candidate.id}`}
              className="flex items-center gap-3.5 flex-1 min-w-0"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shrink-0">
                {entry.candidate.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.candidate.photo_url} alt={entry.candidate.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-serif text-sm">{entry.candidate.full_name[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold">{entry.candidate.full_name}</p>
                <p className="text-[12.5px] text-ink-faint">{entry.candidate.role?.label}</p>
                {entry.note && <p className="text-[12px] text-ink-faint italic mt-0.5">&ldquo;{entry.note}&rdquo;</p>}
              </div>
            </Link>
            <button
              onClick={() => remove(entry.candidate.id)}
              className="text-ink-faint hover:text-coral-deep p-1.5 shrink-0"
              title="Remove from roster"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
