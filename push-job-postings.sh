#!/bin/bash
# push-job-postings.sh
#
# Pulls the latest main branch, copies all new/updated files from this
# directory into the repo, then commits and pushes.
#
# Usage (run from the same folder as this script):
#   chmod +x push-job-postings.sh
#   ./push-job-postings.sh /path/to/your/chairmatch/repo
#
# If you don't pass a repo path, it defaults to ../chairmatch
# (i.e. both folders sit side-by-side).

set -e  # exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${1:-$(dirname "$SCRIPT_DIR")/chairmatch}"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "❌  No git repo found at: $REPO_DIR"
  echo "    Pass the repo path as the first argument:"
  echo "    ./push-job-postings.sh /path/to/chairmatch"
  exit 1
fi

echo "📁  Repo: $REPO_DIR"
echo "📦  Files: $SCRIPT_DIR"
echo ""

# ── 1. Pull latest ────────────────────────────────────────────────────────────
echo "⬇️   Pulling latest main..."
cd "$REPO_DIR"
git pull origin main
echo ""

# ── 2. Copy files ─────────────────────────────────────────────────────────────
echo "📋  Copying files..."

copy() {
  local src="$SCRIPT_DIR/$1"
  local dst="$REPO_DIR/$1"
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  echo "    ✓ $1"
}

# Migrations
copy "supabase/migrations/0027_jobs_add_structured_columns.sql"
copy "supabase/migrations/0028_job_postings.sql"

# API — owner job postings
copy "src/app/api/owner/job-postings/route.ts"
copy "src/app/api/owner/job-postings/[id]/route.ts"

# API — candidate apply
copy "src/app/api/jobs/[slug]/apply/route.ts"

# API — AI assist
copy "src/app/api/ai/job-post-assist/route.ts"

# API — cron (updated)
copy "src/app/api/cron/expire-jobs/route.ts"

# API — Gumroad webhooks (replaces lemonsqueezy version)
copy "src/app/api/webhooks/gumroad/job-posting-sale/route.ts"
copy "src/app/api/webhooks/gumroad/job-posting-ended/route.ts"

# Owner pages
copy "src/app/owner/jobs/page.tsx"
copy "src/app/owner/jobs/new/page.tsx"
copy "src/app/owner/jobs/[id]/page.tsx"

# Candidate pages (updated)
copy "src/app/candidate/browse/page.tsx"
copy "src/app/candidate/browse/browse-jobs-client.tsx"
copy "src/app/candidate/layout.tsx"

# Components (updated)
copy "src/components/candidate/apply-interstitial.tsx"
copy "src/components/owner/owner-sidebar.tsx"

echo ""

# ── 3. Show diff summary ──────────────────────────────────────────────────────
echo "📊  Changed files:"
git diff --name-only
git ls-files --others --exclude-standard  # untracked (new files)
echo ""

# ── 4. Commit and push ────────────────────────────────────────────────────────
echo "🔍  Staging..."
git add \
  "supabase/migrations/0027_jobs_add_structured_columns.sql" \
  "supabase/migrations/0028_job_postings.sql" \
  "src/app/api/owner/job-postings/route.ts" \
  "src/app/api/owner/job-postings/[id]/route.ts" \
  "src/app/api/jobs/[slug]/apply/route.ts" \
  "src/app/api/ai/job-post-assist/route.ts" \
  "src/app/api/cron/expire-jobs/route.ts" \
  "src/app/api/webhooks/gumroad/job-posting-sale/route.ts" \
  "src/app/api/webhooks/gumroad/job-posting-ended/route.ts" \
  "src/app/owner/jobs/page.tsx" \
  "src/app/owner/jobs/new/page.tsx" \
  "src/app/owner/jobs/[id]/page.tsx" \
  "src/app/candidate/browse/page.tsx" \
  "src/app/candidate/browse/browse-jobs-client.tsx" \
  "src/app/candidate/layout.tsx" \
  "src/components/candidate/apply-interstitial.tsx" \
  "src/components/owner/owner-sidebar.tsx"

COMMIT_MSG="feat: job postings — owner create/manage, AI draft, candidate apply, Gumroad billing

- Migration 0027: document already-applied jobs column patch
- Migration 0028: job_postings + job_applications tables, subscription col on practice_profiles
- API: /api/owner/job-postings (CRUD), /api/jobs/[slug]/apply, /api/ai/job-post-assist
- API: Gumroad webhooks for job posting subscription (sale + ended)
- API: expire-jobs cron now also expires native job_postings
- Owner: /owner/jobs list, /owner/jobs/new (AI chat + manual), /owner/jobs/[id] + applicants tab
- Candidate: browse page unions native job_postings + scraped jobs
- Candidate: 3-tab filter (All / On Hdenta / Aggregated), DEFAULT_SOURCE_TAB constant
- Candidate: apply-interstitial handles native in-platform apply vs external redirect
- Candidate: layout mobile nav Jobs href fixed to /candidate/browse
- Owner sidebar: Job Postings nav item with pending applicant badge"

git commit -m "$COMMIT_MSG"

echo ""
echo "⬆️   Pushing to origin main..."
git push origin main

echo ""
echo "✅  Done. All files pushed to main."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Post-deploy checklist:"
echo "  1. Run migration 0028 in Supabase SQL editor"
echo "     (0027 is already applied — just a repo record)"
echo "  2. Add job_posting_customer_id column to practice_profiles:"
echo "     ALTER TABLE public.practice_profiles"
echo "       ADD COLUMN IF NOT EXISTS job_posting_customer_id text;"
echo "  3. Create Job Postings product on Gumroad (\$50/month)"
echo "  4. Register two resource_subscriptions on that product:"
echo "     - sale            → POST /api/webhooks/gumroad/job-posting-sale"
echo "     - subscription_ended → POST /api/webhooks/gumroad/job-posting-ended"
echo "  5. Add to .env / Vercel env vars:"
echo "     GUMROAD_JOB_POSTING_PERMALINK=<permalink from Gumroad>"
echo "  6. Wire the 'Subscribe' button in /owner/jobs paywall to:"
echo "     https://[seller].gumroad.com/l/[permalink]?supabase_user_id=[userId]"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
