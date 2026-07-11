# Payment provider setup: Gumroad (primary) + Lemon Squeezy (fallback)

This replaces the old Dodo Payments integration. Do the **Database
migration** and **Gumroad setup** sections first -- that's what
actually needs to be live. The Lemon Squeezy section is prep for later
(only needed once its pending application is approved, or if Gumroad
falls through) -- do it whenever, it doesn't block launch.

---

## 1. Database migration

Run `supabase/migrations/0018_gumroad_lemonsqueezy_migration.sql`
against your Supabase project (SQL Editor in the Supabase dashboard, or
`supabase db push` if you're using the CLI locally). It renames
`dodo_customer_id` -> `payment_customer_id` and adds a new
`payment_provider` column -- no data loss, same rename-in-place pattern
the codebase already used for the Stripe -> Dodo swap.

---

## 2. Gumroad setup (primary provider)

### 2a. Create the Standard product

1. Log into Gumroad, go to **Products -> New product**.
2. Set it up as a **membership/subscription** product (not a one-time
   sale), yearly recurrence, $100.
3. Under the product's **Content** tab: toggle off "Beta content
   editor," select **"Redirect to a URL after purchase"**, and enter:
   ```
   https://www.hdenta.com/owner/settings/billing?success=true
   ```
   This is what makes the post-payment redirect land back on your
   billing page instead of Gumroad's generic receipt page.
4. Note the product's permalink -- it's the part after `/l/` in its
   URL (e.g. `https://yourname.gumroad.com/l/abc123` -> permalink is
   `abc123`). You can customize this to something readable like
   `hdenta-standard` under **Settings -> Advanced** on the product.

### 2b. Get an access token

1. Go to **Settings -> Advanced** in your Gumroad account.
2. Under "Applications," create a new application: any name, and for
   Redirect URI just enter `https://www.hdenta.com` (it's required but
   not actually used for this personal-account use case).
3. Click **Generate access token**. Copy it -- this is
   `GUMROAD_ACCESS_TOKEN`.

### 2c. Set environment variables

In Vercel (Production) and your local `.env.local`:

```
PAYMENT_PROVIDER=gumroad
GUMROAD_ACCESS_TOKEN=<the token from 2b>
GUMROAD_SELLER_SUBDOMAIN=<your gumroad subdomain, e.g. "yourname" from yourname.gumroad.com>
GUMROAD_STANDARD_PERMALINK=<the permalink from 2a>
```

### 2d. Register the webhook ("Ping")

Gumroad's terminology is "Ping," not "webhook," and each event type
needs its own registration call. Run these once (replace
`YOUR_ACCESS_TOKEN`):

```bash
# New sales -- this is the one that actually grants access
curl https://api.gumroad.com/v2/resource_subscriptions \
  -d "access_token=YOUR_ACCESS_TOKEN" \
  -d "resource_name=sale" \
  -d "post_url=https://www.hdenta.com/api/webhooks/gumroad" \
  -X PUT

# Subscription ending -- this is what revokes access
curl https://api.gumroad.com/v2/resource_subscriptions \
  -d "access_token=YOUR_ACCESS_TOKEN" \
  -d "resource_name=subscription_ended" \
  -d "post_url=https://www.hdenta.com/api/webhooks/gumroad" \
  -X PUT
```

You can confirm they registered with:
```bash
curl "https://api.gumroad.com/v2/resource_subscriptions?access_token=YOUR_ACCESS_TOKEN"
```

### 2e. Important -- verify this empirically before fully trusting it

Gumroad's docs describe the post-purchase redirect as appending
"information about the purchase" to your redirect URL, but don't spell
out the exact field name for the sale's ID. `src/app/api/checkout/
confirm/route.ts` currently checks for `sale_id`, `purchase_id`, or
`id` in that order. **Make one real test purchase** (Gumroad's own
account has a way to test without a real card -- check their docs for
"test purchases") and look at the actual URL you land on. If the field
is named something else, update the three `searchParams.get(...)`
calls near the top of that route to match. If none of them match,
nothing breaks -- the billing page's short poll fallback still confirms
it within ~15 seconds once the webhook lands -- it just won't be
instant until this is corrected.

### 2f. No signature verification -- know this going in

Gumroad does not support webhook signing (confirmed against their docs
and third-party integrations built on this API -- there's no secret,
no header to check). `src/app/api/webhooks/gumroad/route.ts` handles
this by never trusting the incoming ping's body directly -- it only
pulls the sale/subscriber ID out of the ping and makes its own
authenticated API call back to Gumroad to get the real record. This is
a deliberate design choice, not an oversight -- don't "simplify" this
route to trust the ping payload directly.

---

## 3. Lemon Squeezy setup (fallback provider)

Do this once their application is approved. Until then,
`PAYMENT_PROVIDER=gumroad` means none of this is active.

### 3a. Create the product

In your Lemon Squeezy dashboard, create a subscription product/variant
for Standard, $100/year. Note the **Store ID** and the **Variant ID**
(both visible in the dashboard, or via `GET /v1/stores` and
`GET /v1/variants` on their API).

### 3b. Get an API key

**Settings -> API** in the Lemon Squeezy dashboard -> create a new API
key.

### 3c. Create the webhook

**Settings -> Webhooks -> create webhook**:
- URL: `https://www.hdenta.com/api/webhooks/lemonsqueezy`
- Events: at minimum `order_created`, `subscription_created`,
  `subscription_updated`, `subscription_expired`
- Signing secret: type any random string yourself (Lemon Squeezy
  doesn't generate one for you) -- this becomes
  `LEMONSQUEEZY_WEBHOOK_SECRET`.

### 3d. Set environment variables

```
LEMONSQUEEZY_API_KEY=<from 3b>
LEMONSQUEEZY_STORE_ID=<from 3a>
LEMONSQUEEZY_STANDARD_VARIANT_ID=<from 3a>
LEMONSQUEEZY_WEBHOOK_SECRET=<the string you made up in 3c>
```

### 3e. Switch to it

Flip one variable in Vercel and redeploy:
```
PAYMENT_PROVIDER=lemonsqueezy
```
No code changes needed -- `src/lib/payments/config.ts` is what every
payment route reads to decide which provider to use.

---

## What's different from the old Dodo integration

- **No dynamic checkout sessions with Gumroad.** Dodo/Paddle/Lemon
  Squeezy all let you create a fresh checkout per request with custom
  metadata attached. Gumroad doesn't -- it's a single pre-made product
  link with query params. `src/lib/payments/gumroad.ts` explains the
  mechanics.
- **Gumroad has no webhook signing.** Every write Gumroad's webhook
  handler makes is backed by a fresh authenticated API call, never the
  raw ping data. See section 2f above.
- **Both providers now write to the same DB columns**
  (`payment_customer_id`, `payment_provider`) instead of
  Dodo-specific ones, which is what makes the `PAYMENT_PROVIDER`
  env-var switch actually work cleanly.
