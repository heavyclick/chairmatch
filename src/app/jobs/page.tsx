import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Briefcase, Plus, Users, Clock, PauseCircle, CheckCircle } from "lucide-react";

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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }} className={style}>
      {label}
    </span>
  );
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

  const { data: postings } = await supabase
    .from("job_postings")
    .select(
      `id, slug, title, employment_type, city, state, status, expires_at, created_at,
       role:roles(label),
       applications:job_applications(id, status)`
    )
    .eq("owner_id", authData.user.id)
    .order("created_at", { ascending: false });

  const hasSubscription = practice?.job_posting_subscription_active ?? false;

  // Supabase returns joined rows as arrays even for FK relationships
  // that resolve to a single row. Normalize role and applications here
  // so the rest of the component works with plain objects.
  type RawPosting = NonNullable<typeof postings>[number];
  type NormalizedPosting = Omit<RawPosting, "role" | "applications"> & {
    role: { label: string } | null;
    applications: { id: string; status: string }[];
  };

  const normalized: NormalizedPosting[] = (postings ?? []).map((p) => ({
    ...p,
    role: Array.isArray(p.role) ? (p.role[0] ?? null) : (p.role ?? null),
    applications: Array.isArray(p.applications) ? p.applications : [],
  }));

  const active  = normalized.filter((p) => p.status === "active");
  const drafts  = normalized.filter((p) => p.status === "draft");
  const paused  = normalized.filter((p) => p.status === "paused");
  const expired = normalized.filter((p) => p.status === "expired").slice(0, 10);

  function applicantCounts(p: NormalizedPosting) {
    const apps = Array.isArray(p.applications) ? p.applications : [];
    return {
      total: apps.length,
      pending: apps.filter((a: { status: string }) => a.status === "pending").length,
    };
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 4 }}>Manage your listings</p>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, margin: 0 }}>Job Postings</h1>
        </div>
        {hasSubscription ? (
          <Link
            href="/owner/jobs/new"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--teal)", color: "#fff", fontSize: 13.5, fontWeight: 600, padding: "10px 18px", borderRadius: "var(--radius-control)", textDecoration: "none" }}
          >
            <Plus size={15} /> Post a Job
          </Link>
        ) : null}
      </div>

      {/* Paywall — no subscription */}
      {!hasSubscription && (
        <div style={{ border: "1.5px dashed var(--line)", borderRadius: 16, padding: "36px 28px", textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--teal-tint)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Briefcase size={22} color="var(--teal-deep)" />
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Post jobs directly on Hdenta
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Reach actively-looking dental candidates in your area. Unlimited postings for $50/month — cancel any time.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", marginBottom: 20 }}>
            {["Unlimited job postings", "AI-assisted job post drafting", "In-platform candidate applications", "Applicant inbox with messaging"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <CheckCircle size={14} color="var(--teal)" />
                <span>{f}</span>
              </div>
            ))}
          </div>
          {/* Link to billing — the checkout URL for the job postings LS product */}
          <Link
            href="/owner/settings/billing?product=job_postings"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--teal)", color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: "var(--radius-control)", textDecoration: "none" }}
          >
            Subscribe — $50/month
          </Link>
        </div>
      )}

      {/* Empty state — subscribed but no postings yet */}
      {hasSubscription && (postings ?? []).length === 0 && (
        <div style={{ border: "1.5px dashed var(--line)", borderRadius: 16, padding: "40px 28px", textAlign: "center" }}>
          <Briefcase size={24} color="var(--ink-faint)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No job postings yet</p>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 20 }}>Post your first opening and start receiving applications from dental candidates.</p>
          <Link
            href="/owner/jobs/new"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--teal)", color: "#fff", fontSize: 13.5, fontWeight: 600, padding: "10px 20px", borderRadius: "var(--radius-control)", textDecoration: "none" }}
          >
            <Plus size={14} /> Post your first job
          </Link>
        </div>
      )}

      {/* Active listings */}
      {active.length > 0 && (
        <Section title="Active" icon={<CheckCircle size={15} color="var(--teal)" />}>
          {active.map((p) => {
            const { total, pending } = applicantCounts(p);
            return (
              <PostingRow key={p.id} posting={p} total={total} pending={pending} daysLeft={daysLeft(p.expires_at)} />
            );
          })}
        </Section>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <Section title="Drafts">
          {drafts.map((p) => {
            const { total, pending } = applicantCounts(p);
            return <PostingRow key={p.id} posting={p} total={total} pending={pending} daysLeft={null} />;
          })}
        </Section>
      )}

      {/* Paused */}
      {paused.length > 0 && (
        <Section title="Paused" icon={<PauseCircle size={15} color="var(--ink-soft)" />}>
          {paused.map((p) => {
            const { total, pending } = applicantCounts(p);
            return <PostingRow key={p.id} posting={p} total={total} pending={pending} daysLeft={null} />;
          })}
        </Section>
      )}

      {/* Expired (last 10) */}
      {expired.length > 0 && (
        <Section title="Recently expired">
          {expired.map((p) => {
            const { total } = applicantCounts(p);
            return <PostingRow key={p.id} posting={p} total={total} pending={0} daysLeft={null} />;
          })}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function PostingRow({
  posting,
  total,
  pending,
  daysLeft: dl,
}: {
  posting: { id: string; title: string; status: string; city: string | null; state: string | null; employment_type: string | null; role: { label: string } | null; slug?: string };
  total: number;
  pending: number;
  daysLeft: string | null;
}) {
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
          {posting.role && <span>{(posting.role as { label: string }).label}</span>}
          {(posting.city || posting.state) && (
            <span>{[posting.city, posting.state].filter(Boolean).join(", ")}</span>
          )}
          {posting.employment_type && (
            <span style={{ textTransform: "capitalize" }}>{posting.employment_type.replace("_", "-")}</span>
          )}
          {dl && <span style={{ color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {dl}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        {total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--ink-soft)" }}>
            <Users size={13} />
            <span style={{ fontWeight: 600 }}>{total}</span>
            {pending > 0 && (
              <span style={{ background: "var(--coral)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "1px 7px" }}>
                {pending} new
              </span>
            )}
          </div>
        )}
        <span style={{ fontSize: 18, color: "var(--ink-faint)" }}>›</span>
      </div>
    </Link>
  );
}
