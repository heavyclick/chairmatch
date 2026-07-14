/**
 * Sent once, right after signup (see src/app/(auth)/signup/page.tsx).
 * Deliberately brief and low-pressure -- clicking it is optional, the
 * account is already fully usable without it. Separate from the
 * welcome email (src/lib/email/templates/welcome.ts), which fires
 * later, at the end of onboarding, and is the warmer, fuller message.
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
      Confirm your email
    </h1>
    <p style="font-size:14.5px;line-height:1.6;color:#4A4A42;margin:0 0 20px;">
      Just so we have it on file -- your account is already active, so
      there's nothing blocking you from using Hdenta right now. Confirm
      whenever it's convenient:
    </p>
    <a href="https://www.hdenta.com/api/auth/verify-email?token=${verifyToken}"
       style="display:inline-block;background:#3D7A6E;color:#ffffff;text-decoration:none;
              padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">
      Confirm email
    </a>
  `);
}
