/**
 * Sent once, right after signup (see src/app/(auth)/signup/page.tsx).
 * Reads as a normal, real "please confirm your email" message --
 * previously it explicitly told the reader confirming was optional
 * ("nothing blocking you... confirm whenever it's convenient"), which
 * defeats the point of a confirmation email even though it's true.
 * It's still functionally non-blocking under the hood -- clicking it
 * just marks a timestamp, nothing in the app actually checks it (see
 * src/app/api/auth/verify-email/route.ts) -- that's an internal
 * implementation detail, not something the email itself should say.
 * Separate from the welcome email (src/lib/email/templates/welcome.ts),
 * which fires later, at the end of onboarding.
 */

const wrapper = (bodyHtml: string) => `
<div style="background:#FAFAF7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #E5E3DB;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8603C;"></span>
      <span style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#1A2E2B;">Hdenta</span>
    </div>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#9A9A8F;">Hdenta &middot; Built for independent dental practices</p>
  </div>
</div>`;

export function confirmationEmailHtml(verifyToken: string): string {
  return wrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#1A2E2B;margin:0 0 12px;">
      Confirm your email address
    </h1>
    <p style="font-size:14.5px;line-height:1.6;color:#4A4A42;margin:0 0 20px;">
      Please confirm this is your email address to finish setting up
      your Hdenta account.
    </p>
    <a href="https://www.hdenta.com/api/auth/verify-email?token=${verifyToken}"
       style="display:inline-block;background:#3D7A6E;color:#ffffff;text-decoration:none;
              padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">
      Confirm email address
    </a>
    <p style="font-size:12.5px;line-height:1.6;color:#9A9A8F;margin:20px 0 0;">
      If you didn't create an account with Hdenta, you can safely ignore this email.
    </p>
  `);
}
