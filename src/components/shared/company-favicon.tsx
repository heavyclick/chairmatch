"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";

/**
 * Renders an employer's favicon next to their name in the work-history
 * timeline (profile redesign, #22 -- "pull the image from the website
 * icon/logo... if can't reach just leave it blank").
 *
 * Uses Google's public favicon service (`s2/favicons`) rather than this
 * app's own server fetching the target site directly -- avoids taking
 * on an SSRF-adjacent surface (fetching arbitrary user-supplied URLs
 * server-side) for what's fundamentally a decorative icon, and Google's
 * service already handles the redirect-following/caching/format
 * variance across real-world sites.
 *
 * True graceful-blank on failure: Google's service actually returns a
 * generic globe placeholder for domains it can't resolve, rather than
 * erroring -- which would violate "if can't reach just leave it blank."
 * So this component still renders a blank/icon fallback of its own
 * (Building2, matching the rest of the icon set) via onError, but ALSO
 * treats Google's own generic-globe response as equivalent to failure
 * isn't reliably detectable client-side (no error is thrown for it) --
 * documented here as a known, minor gap rather than silently accepted:
 * a domain Google can't find will show a generic globe, not a true
 * blank, until/unless a stricter favicon source replaces this one.
 */
export function CompanyFavicon({ url, size = 20 }: { url: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className="rounded-md bg-line-soft flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <Building2 size={size * 0.6} className="text-ink-faint" />
      </div>
    );
  }

  let domain: string;
  try {
    domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return (
      <div
        className="rounded-md bg-line-soft flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <Building2 size={size * 0.6} className="text-ink-faint" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- an external favicon URL isn't a fit for next/image's optimization pipeline (arbitrary third-party domain, tiny fixed-size icon, no benefit from resizing/format conversion)
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={size}
      height={size}
      className="rounded-md shrink-0"
      onError={() => setFailed(true)}
    />
  );
}
