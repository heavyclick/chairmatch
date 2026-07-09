# ChairMatch fixes — apply notes (round 12: browse fix, tickets, launch-critical finding)

Extract over your local `chairmatch-app` folder:

```bash
cd /Users/Tk/Downloads/chairmatch-app
tar -xzf ~/Downloads/chairmatch-p0-fixes.tar.gz -C . --strip-components=1
npm install
```

Replaces every earlier tarball.

Run migration `0017` (new this round) plus all earlier ones if you
haven't already.

---

## Read this one first: AUTH_ENFORCEMENT_ENABLED

While tracing the browse bug I found something more serious in the
same file family: `AUTH_ENFORCEMENT_ENABLED` defaults to `false`, and
your real login page exists and works fine — the code comment
explaining the flag was just stale (written before login existed,
never updated). **As it stands right now, every `/owner/*` and
`/candidate/*` route is reachable with zero login required.** This
must be set to `true` in your Vercel project's environment variables
before launch, or there's no authentication on the app at all. Fixed
the stale comment so this doesn't get missed again, but the actual env
var change is something you need to do in Vercel — it can't be baked
into the code as a default without breaking local preview flows that
intentionally rely on it being off.

---

## 1. Browse showing every candidate nationwide -- fixed

Confirmed root cause from your San Jose test: my radius-search fallback
logic had a real gap. When a practice's location hadn't been geocoded
yet, the code was supposed to fall back to matching the practice's own
saved city -- but that fallback was never actually wired up, so it fell
through to *no location filter at all*. Fixed: when radius mode can't
run, the search now fetches the practice's own saved city/state
directly and filters on that, instead of silently returning everyone.

## 2. Dodo webhook setup + what's required to work

**Endpoint URL to register in Dodo's dashboard** (Settings → Webhooks):
```
https://yourdomain.com/api/webhooks/dodo
```
(or your Vercel deployment URL if not using a custom domain yet)

**What has to be true for it to work:**
1. `DODO_WEBHOOK_SECRET` set in Vercel — get this from Dodo's dashboard
   when you register the webhook URL there; it signs every webhook
   call, and the route rejects anything without a valid signature.
2. `DODO_PAYMENTS_API_KEY` set in Vercel.
3. `DODO_PAYMENTS_ENVIRONMENT` set to `live_mode` for real charges (it
   defaults to `test_mode` in `.env.example`, which is correct for
   testing but must be switched for production).
4. `DODO_PRODUCT_STANDARD` set to the real product ID from a Standard
   subscription product you create in Dodo's dashboard (recurring,
   $100/yr). Leave `DODO_PRODUCT_PRO`/`_CREDITS_10`/`_CREDITS_25` blank
   -- they're paused, checkout rejects them regardless.
5. This genuinely cannot be tested on localhost -- Dodo's servers must
   reach your webhook URL directly, which only works once deployed.
   The dev-only `/api/dev/unlock` panel on the billing page (hidden
   automatically in production) is what let you test the unlock UI
   locally without this.

**How to verify it actually worked once deployed:** complete a real
test-mode checkout, then check that `practice_profiles.subscription_tier`
actually flipped to `standard` in Supabase and that the billing page
reflects it -- if the checkout redirect succeeds but the tier never
updates, check Dodo's dashboard webhook logs for delivery failures
first (wrong URL, signature mismatch, etc.) before assuming the app
code is at fault.

## 3. Support ticket email -- confirmed already correctly wired, just needed config

No code was broken here. Set these in Vercel:
```
SUPPORT_EMAIL=info@chairfill.online
RESEND_API_KEY=<your real key>
EMAIL_FROM="ChairMatch <notifications@yourdomain.com>"
```
One thing that will silently limit delivery until you do it: **verify
a sending domain in Resend's dashboard**. Until you do, Resend's
sandbox mode only delivers to the Resend account's own owner email --
not to `info@chairfill.online` or any other real address.

## 4. Direct "file a ticket" button, with attachments

New button on the Support page, next to "Chat with AI support" --
opens a form (subject, description, up to 5 attachments, 3MB each,
client- and server-validated). Attachments upload to a new **private**
storage bucket (unlike your public gallery-photo bucket, since ticket
attachments could reasonably contain sensitive screenshots) -- the
founder's notification email includes a signed link valid for 30 days,
since a private bucket has no plain public URL to click from an email
client with no matching login session.

---

## Migration to run (new this round)
```
0017_support_ticket_attachments.sql
```

## Files to delete (unchanged from earlier rounds)
```bash
rm -rf src/app/candidate/browse-preview
rm -rf src/app/api/candidate/browse-preview
rm src/components/candidate/preview-candidate-card.tsx
```

---

## Deferred per your instruction
Admin dashboard and the fake seed-data system are intentionally not
part of this round -- picking those up later as their own focused
pieces of work, per your call to prioritize the items above first.

---

Full GitHub push + Vercel deployment walkthrough, plus the complete
production environment variable checklist, follows in the next
message.
