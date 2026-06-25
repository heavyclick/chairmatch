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
- **The owner dashboard shell and browse page** (`/owner/browse`) — a live-feeling stat hero (real elapsed-time "updated Xm ago" label, pulse indicator), tabs, filter toolbar, and the `CandidateCard` component handling both locked and unlocked states. All functional icons are real SVG (`lucide-react`), not emoji.
- **Fixed responsive layout** (`src/app/owner/layout.tsx`) — a proper fixed-width desktop sidebar (upgrade card pinned to the bottom via flex, no dead vertical space), a fixed mobile top bar, and a fixed mobile bottom nav, built once as a shared shell.
- **Expanded role/software/dealbreaker taxonomy** (`src/lib/constants.ts`, mirrored in the schema seed data) — now includes Dentist/Practice Owner, Associate Dentist, Lab Tech, Sterilization Tech as primary roles, and 10 practice management systems instead of 3.
- **Candidate onboarding flow** (`/candidate/onboarding`) — a 7-step guided wizard: role + alias tags, location/availability, comp/experience/software, the qualitative section (with AI writing assist), dealbreakers, visibility, done.
- **Owner onboarding flow** (`/owner/onboarding`) — a 4-step wizard: practice basics, software, the mandatory culture disclosure (with AI writing assist), done.
- **AI writing assist** (`src/components/shared/ai-writing-assist.tsx` + `src/app/api/ai/onboarding-assist/route.ts`) — a chat-style helper embedded in every open-ended field. It asks a sharpening follow-up question or proposes editable draft wording; it never silently auto-fills the field, since the qualitative answers are the actual product and need to be the person's real voice.
- **AI provider abstraction** (`src/lib/ai/provider.ts`) — wired to GitHub Models (free, Azure-hosted GPT-4o-mini) for early development. Swapping to Anthropic/OpenAI/Gemini later is a one-file change — see the comment at the top of that file.

## What's NOT built yet (by design — this is the real starting point, not a finished product)

- Auth flows (login/signup pages exist as empty route folders) — onboarding currently runs without a logged-in session; wiring it to actually create the account and write to Supabase is the next step
- Stripe integration (route folders scaffolded, no implementation)
- AI search/outreach/advisor/screening beyond the onboarding-assist use case (route folders scaffolded, no implementation)
- Seed data — the schema is ready, but `supabase/seed/` is empty
- Candidate-side dashboard, owner dashboard density stats wired to real data, messaging, candidate detail page

This matches Phase 1 of the build document: get the manual, non-AI marketplace loop working end-to-end first.

---

---

## Local dev vs. GitHub vs. Vercel — what to actually do

These are three separate, complementary things, not alternatives to each other:

1. **Local dev** (`npm run dev`) is where you write and test code on your own machine before anyone else sees it. Always do this first for anything new.
2. **GitHub** is just storage + history for your code -- it doesn't run anything by itself. You push your code there so it's backed up and so Vercel can see it.
3. **Vercel** is what actually hosts the live, public version of the app. It watches your GitHub repo and auto-rebuilds/deploys every time you push.

**The actual sequence, start to finish:**

1. This zip is already a git repo (`git log` will show one commit). Create a new empty repository on GitHub (don't initialize it with a README -- this repo already has one), then:
   ```bash
   cd chairmatch-app
   git remote add origin https://github.com/<your-username>/chairmatch.git
   git branch -M main
   git push -u origin main
   ```
2. Go to vercel.com, sign in with your GitHub account, click "Add New Project," and import the `chairmatch` repo you just pushed.
3. Before clicking Deploy, add your environment variables (everything in `.env.example`) in Vercel's project settings under Environment Variables -- Vercel won't have your `.env.local` file since that file is gitignored on purpose (it contains secrets and should never be committed).
4. Click Deploy. Vercel gives you a live URL (something like `chairmatch.vercel.app`) within a couple of minutes.
5. From now on: every time you `git push` to `main`, Vercel automatically redeploys. You don't manually deploy again -- push is the deploy trigger.

**Day-to-day workflow once this is set up:**
- Make changes locally, check them with `npm run dev` at `localhost:3000`.
- When happy: `git add -A && git commit -m "what you changed" && git push`.
- Vercel rebuilds automatically; check the live URL in ~1-2 minutes.

**You do not need Vercel to test locally.** Local (`npm run dev`) works completely independently -- Vercel is only for making it publicly accessible/live. Push when you actually want a shareable live link or are ready to start using it for real, not before every small change.

**One thing to set up either way before deploying:** your Supabase project needs to exist and have the schema pushed (see "Set up Supabase" below) regardless of whether you're running locally or on Vercel -- both environments talk to the same live Supabase database via the URL/keys in your env vars.

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

1. **Auth + the owner/candidate fork** -- `(auth)/signup` page with the two-button choice, wired to Supabase Auth, writing `account_type` to the `profiles` table. The onboarding wizards built in this pass (`/candidate/onboarding`, `/owner/onboarding`) currently run as standalone UI with local component state only -- they don't yet create an account or write anything to Supabase. Wiring their final "submit" step to actually insert into `candidate_profiles` / `practice_profiles` is the natural next task once auth exists.
2. **Seed data** -- a `supabase/seed/seed.sql` with ~30-50 realistic candidate profiles across roles, so `/owner/browse` can run against real data instead of the static sample array.
3. **Wire `/owner/browse` to `/api/search`** for real, with the filter bottom-sheet UI from the earlier design pass (the filter rail itself still needs building -- currently only the "Filters" button and a static quick-filter row exist).
4. **Owner dashboard** -- saved searches with real new-match counts (the stat hero itself is built and wired for live data, just needs a real query behind it).
5. **Candidate detail page** + **messaging**.
6. **Candidate-side dashboard** -- profile views, status toggle.
7. **Stripe** -- Standard/Pro subscription checkout and the webhook handler that updates `subscription_tier`.

Phase 2 (AI search/outreach/advisor/screening beyond onboarding-assist) and Phase 3 (retention/expansion) are detailed in the build document and shouldn't be started until Phase 1 is live in the first launch metro.

## AI writing assist -- setup and a note on GitHub Models

The onboarding writing-helper (the "Stuck? Get help writing this" button on every qualitative field) calls `/api/ai/onboarding-assist`, which by default routes through **GitHub Models** -- a free, Azure-hosted endpoint for testing against GPT-4o-mini and other models without a paid API key.

To use it:
1. Get a token: GitHub -> Settings -> Developer settings -> Personal access tokens -> generate one with `models: read` permission (or grab a key directly from a model page at github.com/marketplace/models).
2. Add it to `.env.local` as `GITHUB_MODELS_TOKEN`.
3. That's it -- `AI_PROVIDER=github_models` is already the default in `.env.example`.

**Known limitation to plan around:** GitHub Models' free tier has real rate limits (low requests-per-minute, meant for testing/prototyping, not production traffic). This is fine for development and even for an early soft-launch with modest volume, but once there's real onboarding traffic in a launch metro, switch `AI_PROVIDER` to `anthropic` in your env vars and add a billed `ANTHROPIC_API_KEY` -- see `src/lib/ai/provider.ts`, no other code changes are needed for that swap. Don't wait until the free tier is visibly failing in production to make this switch; budget for it as soon as you have paying owners actively onboarding candidates at volume.

