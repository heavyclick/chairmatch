"use client";

import { useState } from "react";
import { LiveStatHero } from "@/components/owner/live-stat-hero";

interface DashboardStatHeroProps {
  initialCity: string;
  initialRadiusMiles: number;
  stats: { label: string; count: number }[];
}

export function DashboardStatHero({ initialCity, initialRadiusMiles, stats }: DashboardStatHeroProps) {
  const [location, setLocation] = useState({ city: initialCity, radiusMiles: initialRadiusMiles });

  async function handleLocationChange(city: string, radiusMiles: number) {
    setLocation({ city, radiusMiles });
    await fetch("/api/owner/location", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, radiusMiles }),
    });
    // Stats were computed server-side for the OLD city/radius at page
    // load -- a full reload re-fetches everything consistently rather
    // than trying to patch stats client-side with partial data.
    window.location.reload();
  }

  return (
    <LiveStatHero
      location={location.city}
      radiusMiles={location.radiusMiles}
      onLocationChange={handleLocationChange}
      stats={stats}
    />
  );
}
