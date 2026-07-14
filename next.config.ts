import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage -- practice_profiles.photo_url and
      // candidate_profiles.photo_url both point here. Without this,
      // next/image rejects the URL outright at request time.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Already used by src/components/shared/company-favicon.tsx --
      // was also missing before this, so that usage was likely already
      // failing silently (next/image fails per-image, not page-wide).
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons" },
    ],
  },
};

export default nextConfig;

