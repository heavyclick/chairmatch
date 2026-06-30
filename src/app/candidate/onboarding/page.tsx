import { redirect } from "next/navigation";

/**
 * The onboarding wizard moved to /onboarding/candidate (outside the
 * app/candidate/ route segment) so it no longer inherits the
 * dashboard sidebar/topbar/bottom-nav shell -- showing that shell
 * during onboarding, before there's anywhere for it to navigate to,
 * was a confirmed audit finding. This redirect keeps old links working.
 */
export default function LegacyOnboardingRedirect() {
  redirect("/onboarding/candidate");
}
