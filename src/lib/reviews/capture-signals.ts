import type { NextRequest } from "next/server";

export interface ReviewerSignals {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  deviceType: "mobile" | "tablet" | "desktop" | null;
  language: string | null;
}

/**
 * Extracts what can be genuinely, verifiably captured from an
 * unauthenticated review submission request.
 *
 * Geolocation: reads Vercel's `x-vercel-ip-*` headers, which Vercel's
 * edge network injects automatically -- no third-party service, no
 * extra cost. IMPORTANT caveat, not hidden: Vercel's own documentation
 * has described this as a Serverless Functions feature for Pro/
 * Enterprise teams in one place and as available on "all Vercel
 * deployments" in another -- these headers may simply come back empty
 * on a Hobby-tier deployment or in local dev. Every field here is
 * nullable and the code downstream must treat missing geo data as
 * "unknown," never as a fraud signal on its own.
 *
 * ISP is deliberately NOT captured. Vercel's headers don't include it,
 * and the well-known free IP-to-ISP lookup services (e.g. ip-api.com's
 * free tier) explicitly restrict their terms to non-commercial use --
 * wiring one up for a commercial product would just trade one honesty
 * problem for another. Real ISP lookup needs a paid provider (IPinfo.io,
 * MaxMind GeoIP2 ISP database, ipapi.com's paid tier) -- worth adding
 * later if this specific signal ever proves necessary, not defaulted in
 * now under a service whose terms don't actually permit the use.
 */
export function extractReviewerSignals(request: NextRequest): ReviewerSignals {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent");
  const language = request.headers.get("accept-language")?.split(",")[0]?.trim() ?? null;

  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers.get("x-vercel-ip-country-region");
  const city = request.headers.get("x-vercel-ip-city");
  const latRaw = request.headers.get("x-vercel-ip-latitude");
  const lngRaw = request.headers.get("x-vercel-ip-longitude");

  const { browser, os, deviceType } = parseUserAgent(userAgent);

  return {
    ip,
    country: country || null,
    region: region ? decodeURIComponent(region) : null,
    city: city ? decodeURIComponent(city) : null,
    latitude: latRaw ? Number(latRaw) : null,
    longitude: lngRaw ? Number(lngRaw) : null,
    userAgent,
    browser,
    os,
    deviceType,
    language,
  };
}

/**
 * Coarse user-agent parsing -- browser/OS family and device type only,
 * not exact version numbers. Intentionally hand-rolled rather than
 * pulling in a full UA-parsing library: fraud signals need "is this a
 * phone or a desktop" and "what browser," not precise version
 * detection, so the maintenance cost of a dependency isn't worth it
 * for what's actually used downstream.
 */
function parseUserAgent(ua: string | null): {
  browser: string | null;
  os: string | null;
  deviceType: "mobile" | "tablet" | "desktop" | null;
} {
  if (!ua) return { browser: null, os: null, deviceType: null };

  let browser: string | null = null;
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";

  let os: string | null = null;
  if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  let deviceType: "mobile" | "tablet" | "desktop" | null = "desktop";
  if (/ipad|tablet/i.test(ua)) deviceType = "tablet";
  else if (/mobi|iphone|android/i.test(ua)) deviceType = "mobile";

  return { browser, os, deviceType };
}

/**
 * Verifies a Cloudflare Turnstile token server-side -- the token from
 * the widget is only proof of a client-side challenge; it means
 * nothing until confirmed with Cloudflare's own siteverify endpoint
 * using the secret key, which only ever runs server-side.
 */
export async function verifyTurnstileToken(token: string, remoteIp: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn("[reviews] TURNSTILE_SECRET_KEY is not set -- rejecting review submission that requires it.");
    return false;
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token, remoteip: remoteIp }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("[reviews] Turnstile verification request failed:", err);
    return false;
  }
}
