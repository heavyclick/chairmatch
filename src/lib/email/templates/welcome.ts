/**
 * Plain HTML email templates -- no React Email or MJML pipeline exists
 * in this codebase yet, so these are hand-written with inline styles
 * and web-safe font fallbacks (email clients can't reliably load
 * Fraunces/Inter from Google Fonts the way the web app does).
 *
 * Fires at the END of onboarding now (see src/app/onboarding/owner
 * /page.tsx and .../candidate/page.tsx), not at signup -- by this
 * point practice_name / candidate full_name actually exist, so this
 * can be genuinely personalized, and it lands at the real "I just
 * finished setting up" moment rather than competing with a separate
 * confirmation email sent seconds after signup (see
 * src/lib/email/templates/confirmation.ts for that one).
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
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:23px;color:#1A2E2B;margin:0 0 16px;line-height:1.3;">
      ${practiceName ? `${practiceName}, you're` : "You're"} all set up.
    </h1>
    <p style="font-size:14.5px;line-height:1.65;color:#4A4A42;margin:0 0 16px;">
      Genuinely glad you're here. Most hiring tools show you a stack of
      resumes and call it a day -- we built Hdenta because that's never
      been the hard part. The hard part is finding out three weeks in
      that someone needed weekends off, or couldn't work solo on slow
      days, or just didn't fit how your practice actually runs. That's
      the stuff a resume never says out loud.
    </p>
    <p style="font-size:14.5px;line-height:1.65;color:#4A4A42;margin:0 0 16px;">
      Every candidate on Hdenta has already told you the real stuff --
      dealbreakers, schedule, what they actually need from the job --
      before you've said a word to them. That's the whole bet we're
      making: fewer surprises, faster fit, hires that actually stick.
    </p>
    <p style="font-size:14.5px;line-height:1.65;color:#4A4A42;margin:0 0 24px;">
      Your profile's live and ready to browse candidates right now. If
      anything feels unclear or just plain annoying, reply to this
      email -- a real person reads it, not a ticket queue.
    </p>
    <a href="https://www.hdenta.com/owner/browse"
       style="display:inline-block;background:#3D7A6E;color:#ffffff;text-decoration:none;
              padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">
      Browse candidates
    </a>
  `);
}

export function candidateWelcomeEmailHtml(fullName: string | null): string {
  return wrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:23px;color:#1A2E2B;margin:0 0 16px;line-height:1.3;">
      ${fullName ? `Welcome, ${fullName}.` : "Welcome."}
    </h1>
    <p style="font-size:14.5px;line-height:1.65;color:#4A4A42;margin:0 0 16px;">
      Your profile is live, and genuinely -- it's free, always, no
      catch we're waiting to spring on you later. We built Hdenta
      because "just send your resume" has never told a practice the
      thing that actually matters: whether you'd actually want to
      work there, and whether they'd actually be good to work for.
    </p>
    <p style="font-size:14.5px;line-height:1.65;color:#4A4A42;margin:0 0 16px;">
      You've already said what your dealbreakers are, what you need
      from a schedule, what you're actually looking for -- that's what
      practices see first, before they ever reach out. It means the
      conversations you do have are worth having, not another posting
      that turns out to be nothing like it looked.
    </p>
    <p style="font-size:14.5px;line-height:1.65;color:#4A4A42;margin:0 0 24px;">
      Fill in a bit more when you get the chance -- the more specific
      you are, the better the matches get. And if something's
      confusing or broken, just reply here. A person reads it.
    </p>
    <a href="https://www.hdenta.com/candidate/practices"
       style="display:inline-block;background:#3D7A6E;color:#ffffff;text-decoration:none;
              padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">
      Browse practices
    </a>
  `);
}
