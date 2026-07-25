import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Briefcase, Plus, Users, Clock, PauseCircle, CheckCircle } from "lucide-react";
import { PostJobButton } from "@/components/owner/post-job-button";

function daysLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days <= 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; style: string }> = {
    active:  { label: "Active",  style: "bg-teal/10 text-teal border border-teal/20" },
    draft:   { label: "Draft",   style: "bg-line text-ink-soft border border-line" },
    paused:  { label: "Paused",  style: "bg-amber-50 text-amber-700 border border-amber-200" },
    expired: { label: "Expired", style: "bg-line text-ink-faint border border-line" },
  };
  const { label, style } = map[status] ?? { label: status, style: "bg-line text-ink-faint" };
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}
      className={style}
    >
      {label}
    </span>
  );
}

interface NormalizedPosting {
  id: string;
  slug: string;
  title: string;
  employment_type: string | null;
  city: string | null;
  state: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  role: { label: string } | null;
  applicant_count: number;
  pending_count: number;
}

export default async function OwnerJobsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("practice_name, job_posting_subscription_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  // Suppress unused variable warning — kept for future use 
  void practice;

  const { data: rawPostings } = await supabase
    .from("job_postings")
    .select(
      `id, slug, title, employment_type, city, state, status, expires_at, created_at,
       role:roles(label),
       applications:job_applications(id, status)`
    )
    .eq("owner_id", authData.user.id)
    .order("created_at", { ascending: false });

  const postings: NormalizedPosting[] = (rawPostings ?? []).map((p) => {
    const roleArr = p.role as { label: string }[] | { label: string } | null;
    const role = Array.isArray(roleArr) ? (roleArr[0] ?? null) : (roleArr ?? null);
    const appsArr = p.applications as { id: string; status: string }[] | null;
    const apps = Array.isArray(appsArr) ? appsArr : [];
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      employment_type: p.employment_type ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      status: p.status,
      expires_at: p.expires_at ?? null,
      created_at: p.created_at,
      role,
      applicant_count: apps.length,
      pending_count: apps.filter((a) => a.status === "pending").length,
    };
  });

  const active  = postings.filter((p) => p.status === "active");
  const drafts  = postings.filter((p) => p.status === "draft");
  const paused  = postings.filter((p) => p.status === "paused");
  const expired = postings.filter((p) => p.status === "expired").slice(0, 10);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 60px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 4 }}>Manage your listings</p>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, margin: 0 }}>Job Postings</h1>
        </div>
        <PostJobButton />
      </div>

      {/* Empty state */}
      {postings.length === 0 && (
        <div style={{ border: "1.5px dashed var(--line)", borderRadius: 16, padding: "52px 28px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--teal-tint)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Briefcase size={24} color="var(--teal-deep)" />
          </div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            No job postings yet
          </p>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.65 }}>
            Post a job opening and start receiving applications from actively-looking dental candidates in your area.
          </p>
          <PostJobButton variant="cta" />
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <Section title="Active" icon={<CheckCircle size={15} color="var(--teal)" />}>
          {active.map((p) => (
            <PostingRow key={p.id} posting={p} daysLeft={daysLeft(p.expires_at)} />
          ))}
        </Section>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <Section title="Drafts">
          {drafts.map((p) => (
            <PostingRow key={p.id} posting={p} daysLeft={null} />
          ))}
        </Section>
      )}

      {/* Paused */}
      {paused.length > 0 && (
        <Section title="Paused" icon={<PauseCircle size={15} color="var(--ink-soft)" />}>
          {paused.map((p) => (
            <PostingRow key={p.id} posting={p} daysLeft={null} />
          ))}
        </Section>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <Section title="Recently expired">
          {expired.map((p) => (
            <PostingRow key={p.id} posting={p} daysLeft={null} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        {icon}
        <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-faint)", margin: 0 }}>
          {title}
        </h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function PostingRow({ posting, daysLeft: dl }: { posting: NormalizedPosting; daysLeft: string | null }) {
  return (
    <Link
      href={`/owner/jobs/${posting.id}`}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 14, textDecoration: "none", color: "inherit" }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {posting.title}
          </span>
          <StatusBadge status={posting.status} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: "var(--ink-soft)", flexWrap: "wrap" }}>
          {posting.role && <span>{posting.role.label}</span>}
          {(posting.city || posting.state) && <span>{[posting.city, posting.state].filter(Boolean).join(", ")}</span>}
          {posting.employment_type && <span style={{ textTransform: "capitalize" }}>{posting.employment_type.replace("_", "-")}</span>}
          {dl && <span style={{ color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {dl}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        {posting.applicant_count > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--ink-soft)" }}>
            <Users size={13} />
            <span style={{ fontWeight: 600 }}>{posting.applicant_count}</span>
            {posting.pending_count > 0 && (
              <span style={{ background: "var(--coral)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "1px 7px" }}>
                {posting.pending_count} new
              </span>
            )}
          </div>
        )}
        <span style={{ fontSize: 18, color: "var(--ink-faint)" }}>›</span>
      </div>
    </Link>
  );
}
