"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipOption {
  slug: string;
  label: string;
}

interface ChipSelectProps {
  options: ChipOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multi?: boolean;
}

export function ChipSelect({ options, selected, onChange, multi = true }: ChipSelectProps) {
  function toggle(slug: string) {
    if (multi) {
      onChange(
        selected.includes(slug)
          ? selected.filter((s) => s !== slug)
          : [...selected, slug]
      );
    } else {
      onChange([slug]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.slug);
        return (
          <button
            key={opt.slug}
            type="button"
            onClick={() => toggle(opt.slug)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13.5px] font-medium border transition-colors",
              isSelected
                ? "bg-ink border-ink text-white"
                : "bg-bg-raised border-line text-ink-soft hover:border-teal"
            )}
          >
            {isSelected && <Check size={13} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
