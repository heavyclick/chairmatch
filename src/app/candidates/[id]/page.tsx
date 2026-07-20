import Link from "next/link";
import { User, MapPin, GraduationCap, Briefcase } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { DEALBREAKER_OPTIONS, EMPLOYMENT_TYPES } from "@/lib/constants";

/**
 * Public teaser page for SEO/growth -- distinct from
 * src/app/owner/candidate/[id]/page.tsx, the authenticated
 * owner-facing detail view, which is untouched by this.
 *
 * SECURITY NOTE, read before changing anything here: this uses
 * createServiceClient() (bypasses RLS) specifically so it CAN read a
 * candidate row anonymously -- but the real name and photo are
 * stripped out of the data in this Server Component, before any JSX
 * is ever built, not hidden with CSS. A blurred-but-present value can
 * be read straight out of the page source or a network response in
 * seconds; a value that was never included in what the server sent
 * can't be. Do not "simplify" this by fetching the full row and
 * blurring full_name/photo_url visually instead -- that would silently
 * reintroduce exactly the leak this page was built to avoid.
 */
export default async function PublicCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceClient();

  const { data: candidate } = await service
    .from("candidate_profiles")
    .select(
      `id, city, state, years_experience, employment_types, open_to_relocation,
       certifications, ce_courses, skills, visibility_status,
       role:roles(label),
       dealbreakers:candidate_dealbreakers(dealbreaker_tags(slug, label)),
       work_history:candidate_work_history(employer_name, role_title, start_date, end_date)`
    )
    .eq("id", id)
    // Off-market candidates were explicitly opted out of being found
    // at all -- this public teaser respects that exactly the same way
    // /api/search already does, not just the authenticated paths.
    .neq("visibility_status", "off_market")
    .maybeSingle();

  if (!candidate) {
    return (
      <div>
        <SiteHeader />
        <main className="px-5 md:px-10 py-20 max-w-2xl mx-auto text-center">
          <h1 className="font-serif text-2xl font-semibold mb-3">Profile not found</h1>
          <p className="text-ink-faint text-[14.5px]">It may be private or no longer available.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Is the visitor already logged in? Only matters for whether the
  // Message button is a real link or a signup prompt -- has no effect
  // on what candidate data gets shown, since this page never reveals
  // the real name/photo to anyone, logged in or not. Unlocking those
  // for a paying owner is what src/app/owner/candidate/[id]/page.tsx
  // (the authenticated route) is for, not this one.
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  const role = (candidate.role as unknown as { label: string } | null)?.label ?? "Dental professional";
  const location = [candidate.city, candidate.state].filter(Boolean).join(", ");
  const placeholderTitle = location ? `${role} in ${location}` : role;
  const dealbreakerRows = (candidate.dealbreakers as unknown as { dealbreaker_tags: { slug: string; label: string } }[]) ?? [];
  const workHistory =
    (candidate.work_history as { employer_name: string; role_title: string | null; start_date: string | null; end_date: string | null }[]) ?? [];
  const messageHref = `/signup?type=owner&redirect=${encodeURIComponent(`/candidates/${id}`)}`;

  return (
    <div>
      <SiteHeader />
      <main className="px-5 md:px-10 py-12 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-teal flex items-center justify-center text-white shrink-0">
            <User size={28} />
          </div>
          <div>
            <h1 className="font-serif text-xl md:text-2xl font-semibold">{placeholderTitle}</h1>
            <p className="text-[13px] text-ink-faint">
              Name and photo unlock once you sign up and the candidate matches with your practice.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {location && (
            <div className="rounded-xl border border-line p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-1 flex items-center gap-1">
                <MapPin size={11} /> Location
              </p>
              <p className="text-[14px] text-ink">{location}</p>
            </div>
          )}
          {candidate.years_experience != null && (
            <div className="rounded-xl border border-line p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-1 flex items-center gap-1">
                <Briefcase size={11} /> Experience
              </p>
              <p className="text-[14px] text-ink">{candidate.years_experience} years</p>
            </div>
          )}
          {candidate.employment_types && candidate.employment_types.length > 0 && (
            <div className="rounded-xl border border-line p-3.5 col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-1">Open to</p>
              <p className="text-[14px] text-ink">
                {(candidate.employment_types as string[])
                  .map((t) => EMPLOYMENT_TYPES.find((o) => o.slug === t)?.label ?? t)
                  .join(", ")}
              </p>
            </div>
          )}
        </div>

        {candidate.certifications && candidate.certifications.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-2 flex items-center gap-1.5">
              <GraduationCap size={13} /> Certifications
            </h2>
            <div className="flex flex-wrap gap-2">
              {(candidate.certifications as string[]).map((c) => (
                <span key={c} className="text-[12.5px] font-medium text-ink bg-bg-raised border border-line px-2.5 py-1 rounded-lg">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {dealbreakerRows.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Dealbreakers</h2>
            <ul className="space-y-1.5">
              {dealbreakerRows.map((d) => (
                <li key={d.dealbreaker_tags.slug} className="text-[14px] text-ink">
                  &bull; {DEALBREAKER_OPTIONS.find((o) => o.slug === d.dealbreaker_tags.slug)?.label ?? d.dealbreaker_tags.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {workHistory.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Work history</h2>
            <ul className="space-y-2">
              {workHistory.map((w, i) => (
                <li key={i} className="text-[14px] text-ink">
                  {w.role_title ? `${w.role_title} at ` : ""}{w.employer_name}
                  <span className="text-ink-faint text-[12.5px]"> &middot; {w.start_date?.slice(0, 4)}{w.end_date ? `-${w.end_date.slice(0, 4)}` : "-present"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {authData.user ? (
          <Link
            href={`/owner/messages/new/${id}`}
            className="inline-block bg-teal text-white font-semibold text-[15px] px-6 py-3.5 rounded-control hover:bg-teal-deep transition-colors"
          >
            Message this candidate
          </Link>
        ) : (
          <Link
            href={messageHref}
            className="inline-block bg-teal text-white font-semibold text-[15px] px-6 py-3.5 rounded-control hover:bg-teal-deep transition-colors"
          >
            Sign up to message
          </Link>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
