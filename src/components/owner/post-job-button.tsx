"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

interface PostJobButtonProps {
  variant?: "default" | "cta";
}

// No subscription check here — the gate happens at Publish time inside
// /owner/jobs/new. This button always navigates to the creation page.
export function PostJobButton({ variant = "default" }: PostJobButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/owner/jobs/new")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "#2D705F",
        color: "#ffffff",
        fontSize: variant === "cta" ? 14 : 13.5,
        fontWeight: variant === "cta" ? 700 : 600,
        padding: variant === "cta" ? "11px 22px" : "10px 18px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
      }}
    >
      <Plus size={variant === "cta" ? 16 : 15} color="#ffffff" />
      Post a Job
    </button>
  );
}
