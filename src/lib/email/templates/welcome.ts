/**
 * Plain HTML email templates -- no React Email or MJML pipeline exists
 * in this codebase yet, so these are hand-written with inline styles
 * and web-safe font fallbacks (email clients can't reliably load
 * Fraunces/Inter from Google Fonts the way the web app does).
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

export function ownerWelcomeEmailHtml(practiceName: string | null): string {
  return wrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1A2E2B;margin:0 0 12px;">
      Welcome to Hdenta${practiceName ? `, ${practiceName}` : ""}
    </h1>
    <p style="font-size:14.5px;line-height:1.6;color:#4A4A42;margin:0 0 20px;">
      Your account is live. Every candidate on Hdenta has already answered
      the questions a resume never does -- schedule, dealbreakers, what
      they actually need from the job -- so you can see the real fit
      before you ever pick up the phone.
    </p>
    <a href="https://www.hdenta.com/owner/browse"
       style="display:inline-block;background:#3D7A6E;color:#ffffff;text-decoration:none;
              padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">
      Browse candidates
    </a>
  `);
}

export function candidateWelcomeEmailHtml(firstName: string | null): string {
  return wrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1A2E2B;margin:0 0 12px;">
      Welcome to Hdenta${firstName ? `, ${firstName}` : ""}
    </h1>
    <p style="font-size:14.5px;line-height:1.6;color:#4A4A42;margin:0 0 20px;">
      Your profile is live, and it's free, always. Finish filling in your
      availability and dealbreakers so practices see the real picture --
      the more specific you are, the better the matches.
    </p>
    <a href="https://www.hdenta.com/candidate/practices"
       style="display:inline-block;background:#3D7A6E;color:#ffffff;text-decoration:none;
              padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">
      Complete your profile
    </a>
  `);
}
