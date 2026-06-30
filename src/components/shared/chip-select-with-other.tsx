"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipOption {
  slug: string;
  label: string;
}

interface ChipSelectWithOtherProps {
  options: ChipOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  customValues: string[];
  onCustomChange: (values: string[]) => void;
  multi?: boolean;
  otherLabel?: string;
}

/**
 * Same chip-select pattern as ChipSelect, but with a real "type your
 * own" escape hatch: clicking "Other" opens a text input, and a "+"
 * lets the person add as many additional custom entries as they need.
 * Used for software and dealbreakers, where the controlled vocabulary
 * is necessarily incomplete and a closed list with no way out was a
 * confirmed gap.
 *
 * Per product decision, custom entries are NOT held back for review --
 * they're treated as immediately valid for this person's own profile.
 * Whether they also get added to the shared site-wide vocabulary for
 * future candidates to pick from is a backend/admin concern (see
 * is_user_submitted on software_tags/dealbreaker_tags in migration
 * 0002), not something this component needs to know about.
 */
export function ChipSelectWithOther({
  options,
  selected,
  onChange,
  customValues,
  onCustomChange,
  multi = true,
  otherLabel = "Other (type your own)",
}: ChipSelectWithOtherProps) {
  const [otherOpen, setOtherOpen] = useState(customValues.length > 0);

  function toggle(slug: string) {
    if (multi) {
      onChange(
        selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]
      );
    } else {
      onChange([slug]);
    }
  }

  function updateCustom(index: number, value: string) {
    const next = [...customValues];
    next[index] = value;
    onCustomChange(next);
  }

  function addCustomField() {
    onCustomChange([...customValues, ""]);
  }

  function removeCustomField(index: number) {
    onCustomChange(customValues.filter((_, i) => i !== index));
  }

  return (
    <div>
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

        <button
          type="button"
          onClick={() => {
            if (!otherOpen) {
              setOtherOpen(true);
              if (customValues.length === 0) onCustomChange([""]);
            } else if (customValues.length === 0) {
              setOtherOpen(false);
            }
          }}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13.5px] font-medium border transition-colors",
            otherOpen
              ? "bg-ink border-ink text-white"
              : "bg-bg-raised border-line text-ink-soft hover:border-teal"
          )}
        >
          {otherLabel}
        </button>
      </div>

      {otherOpen && (
        <div className="mt-3 space-y-2">
          {customValues.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={val}
                onChange={(e) => updateCustom(i, e.target.value)}
                placeholder="Type here…"
                className="flex-1 px-3.5 py-2.5 rounded-control border border-line bg-bg-raised text-[13.5px] outline-none focus:border-teal"
                autoFocus={i === customValues.length - 1}
              />
              <button
                type="button"
                onClick={() => removeCustomField(i)}
                className="text-ink-faint hover:text-coral-deep p-1.5 shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCustomField}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-teal-deep"
          >
            <Plus size={13} /> Add another
          </button>
        </div>
      )}
    </div>
  );
}
