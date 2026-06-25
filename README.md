# ChairMatch

> Hire for fit, not just credentials.

Two-sided marketplace connecting independent dental practices with dental staff (hygienists, dental assistants, office/practice managers, front desk, treatment coordinators, billing coordinators, lab techs, sales reps) — differentiated by qualitative fit data (compensation expectations, dealbreakers, goals, scenario-based answers) rather than resumes alone.

Full product/strategy context lives in `ChairMatch-Build-Document.docx` (shared separately). This README covers the engineering side only: what's built, what isn't, and how to pick it up.

---

## What's actually built right now

This is a real, building, type-checked Next.js app — not a mockup. What exists:

- **Project scaffold**: Next.js 15 (App Router), TypeScript, Tailwind v4, route structure for owner/candidate/marketing/auth split.
- **Design tokens**: the full palette/type system (`src/app/globals.css`) — warm off-white base, teal-charcoal ink, muted teal accent, coral reserved for unlock/upgrade moments, gold for qualitative pull-quotes, Fraunces (serif/display) + Inter (body/UI).
- **Database schema**: complete Postgres schema with row-level security (`supabase/migrations/0001_initial_schema.sql`) — profiles, role taxonomy with alias tags, candidate profiles, practice profiles, saved searches, messaging, AI screening sessions, billing.
- **TypeScript domain types** matching the schema (`src/types/database.ts`).
- **Supabase client setup** for browser, server, and service-role contexts, plus middleware for session refresh and route gating (`src/lib/supabase/`, `src/middleware.ts`).
- **The core paywall logic, for real**: `src/app/api/search/route.ts` performs the free-vs-paid blur/redaction of candidate name and photo *server-side*, based on the practice's actual `subscription_tier` in the database — not a CSS trick that could be inspected away in dev tools.
- **One working page**: `/owner/browse` rendering the `CandidateCard` component, which handles both unlocked and locked (blurred) states.

## What's NOT built yet (by design — this is the real starting point, not a finished product)

- Auth flows (login/signup pages exist as empty route folders)
- Onboarding flows (candidate and owner) — folders scaffolded, no implementation
- Stripe integration (route folders scaffolded, no implementation)
- AI search/outreach/advisor/screening (route folders scaffolded, no implementation)
- Seed data — the schema is ready, but `supabase/seed/` is empty

This matches Phase 1 of the build document: get the manual, non-AI marketplace loop working end-to-end first.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at supabase.com (free tier is enough to start).
2. Copy `.env.example` to `.env.local` and fill in your project URL and keys (Project Settings -> API).
3. Push the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   Or just paste the contents of `supabase/migrations/0001_initial_schema.sql` into the Supabase SQL Editor and run it directly -- equally valid at this stage.
4. Once the schema is live, generate real types to replace the hand-written placeholder in `src/types/database.ts`:
   ```bash
   npx supabase gen types typescript --project-id <your-project-ref> > src/types/database-generated.ts
   ```

### 3. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000` then click through to `/owner/browse` to see the candidate card prototype (currently using static sample data -- see the comment at the top of `src/app/owner/browse/page.tsx` for how to wire it to the real `/api/search` endpoint once there's seed data in the database).

### 4. Build for production

```bash
npm run build
```

---

## Project structure

```
src/
  app/
    (marketing)/        -> public landing page (not yet built)
    (auth)/login/        -> login (not yet built)
    (auth)/signup/        -> signup, with the owner-vs-candidate fork (not yet built)
    owner/
      dashboard/          -> density stat hero, saved searches (not yet built)
      browse/             -> WORKING -- candidate card grid
      candidate/[id]/     -> candidate detail page (not yet built)
      onboarding/         -> practice profile + mandatory culture disclosure (not yet built)
      settings/           -> billing, practice profile editing (not yet built)
    candidate/
      dashboard/          -> profile views, status toggle (not yet built)
      onboarding/         -> the guided multi-step profile builder (not yet built)
      settings/           -> notification prefs, visibility (not yet built)
    api/
      search/             -> WORKING -- the real paywall enforcement
      ai/search/          -> natural-language search (Phase 2)
      ai/outreach/        -> AI-drafted messages, review-before-send (Phase 2)
      ai/advisor/         -> AI Hiring Advisor chat (Phase 2)
      screening/          -> AI screening sessions (Phase 2)
      stripe/             -> checkout + webhook handlers (Phase 1, not yet built)
  components/
    ui/                   -> shared primitives (buttons, inputs -- not yet built, use shadcn/ui CLI)
    owner/                -> WORKING -- candidate-card.tsx
    candidate/            -> candidate-side components (not yet built)
    shared/               -> cross-cutting components (not yet built)
  lib/
    supabase/             -> WORKING -- client.ts, server.ts (browser/server/service clients)
    ai/                   -> AI provider wrappers (Phase 2)
    stripe/               -> Stripe helpers (Phase 1)
    validators/           -> zod schemas for forms (not yet built)
    utils.ts              -> WORKING -- cn() classname helper
  types/
    database.ts           -> WORKING -- domain types matching the schema
  middleware.ts            -> WORKING -- session refresh + route gating

supabase/
  migrations/
    0001_initial_schema.sql -> WORKING -- full schema, RLS policies, role taxonomy seed data
  seed/                      -> sample candidate/practice records (not yet built)
```

## Tech stack reference

See `ChairMatch-Build-Document.docx`, Section 5, for the full rationale. Quick reference:

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router |
| Styling | Tailwind v4 (CSS-first `@theme`) + custom design tokens |
| Components | shadcn/ui as base primitives (not yet installed -- run `npx shadcn@latest init` when starting on UI components beyond what's here) |
| Database | Supabase (Postgres + PostGIS for radius search, Auth, Storage) |
| Forms | react-hook-form + zod |
| Data fetching | TanStack Query (client) + Server Components (initial load) |
| Payments | Stripe |
| AI | Anthropic API (Claude) -- used for query-to-filter translation, outreach drafting, hiring advisor, screening |
| SMS | Twilio |
| Hosting | Vercel (recommended) or AWS EC2 (fallback, given existing ops familiarity) |

## A note on next/font/google in restricted network environments

If you see a build error fetching fonts from fonts.googleapis.com, that's a network/firewall restriction in your environment, not a bug in this code -- `next/font/google` needs to reach Google's font CDN at build time. This works without any extra config on a normal machine or on Vercel. If you're behind a restrictive proxy locally, you can temporarily swap the `Inter`/`Fraunces` imports in `src/app/layout.tsx` for system fonts to keep developing other features, then switch back before shipping.

## What to build next

Recommended order (matches the build document's Phase 1):

1. **Auth + the owner/candidate fork** -- `(auth)/signup` page with the two-button choice, wired to Supabase Auth, writing `account_type` to the `profiles` table.
2. **Candidate onboarding** -- the guided multi-step flow (logistics -> comp -> work history -> education -> the qualitative section -> dealbreakers -> relocation/visibility -> notifications), writing into `candidate_profiles` and its related tables.
3. **Owner onboarding** -- practice profile + the mandatory culture disclosure step.
4. **Seed data** -- a `supabase/seed/seed.sql` with ~30-50 realistic candidate profiles across roles, so `/owner/browse` can run against real data instead of the static sample array.
5. **Wire `/owner/browse` to `/api/search`** for real, with the filter rail/bottom-sheet UI from the earlier design pass.
6. **Owner dashboard** -- the density stat hero and saved searches.
7. **Candidate detail page** + **messaging**.
8. **Stripe** -- Standard/Pro subscription checkout and the webhook handler that updates `subscription_tier`.

Phase 2 (AI layer) and Phase 3 (retention/expansion) are detailed in the build document and shouldn't be started until Phase 1 is live in the first launch metro.
