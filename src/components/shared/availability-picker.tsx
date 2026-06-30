"use client";

import { DAYS_OF_WEEK } from "@/lib/constants";

export interface DayAvailability {
  day: number; // 0=Sun .. 6=Sat
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

interface AvailabilityPickerProps {
  value: DayAvailability[];
  onChange: (value: DayAvailability[]) => void;
}

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

export function AvailabilityPicker({ value, onChange }: AvailabilityPickerProps) {
  function isActive(day: number) {
    return value.some((v) => v.day === day);
  }

  function toggleDay(day: number) {
    if (isActive(day)) {
      onChange(value.filter((v) => v.day !== day));
    } else {
      onChange([...value, { day, startTime: DEFAULT_START, endTime: DEFAULT_END }]);
    }
  }

  function updateTime(day: number, field: "startTime" | "endTime", time: string) {
    onChange(value.map((v) => (v.day === day ? { ...v, [field]: time } : v)));
  }

  return (
    <div className="space-y-2">
      {DAYS_OF_WEEK.map(({ value: day, label }) => {
        const active = isActive(day);
        const dayValue = value.find((v) => v.day === day);
        return (
          <div
            key={day}
            role="button"
            tabIndex={0}
            // The whole row is clickable to toggle the day -- previously
            // only the small day-label button (e.g. "Mon") responded to
            // clicks, and the rest of the row (including the "Not
            // available" text) looked clickable but wasn't, which is
            // exactly the confusing-cursor problem described in feedback.
            // When the row is ACTIVE, clicking the row background still
            // toggles it off, but clicks on the time inputs themselves
            // are stopped from bubbling up (see stopPropagation below),
            // so adjusting a time doesn't accidentally untoggle the day.
            onClick={() => toggleDay(day)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleDay(day);
              }
            }}
            className={`flex items-center gap-3 rounded-control border px-3.5 py-2.5 transition-colors cursor-pointer ${
              active ? "border-teal bg-teal-tint/30" : "border-line bg-bg-raised hover:border-teal/50"
            }`}
          >
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-lg text-[12.5px] font-bold shrink-0 transition-colors pointer-events-none ${
                active ? "bg-teal text-white" : "bg-line-soft text-ink-faint"
              }`}
            >
              {label}
            </span>
            {active && dayValue && (
              <div
                className="flex items-center gap-2 flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="time"
                  value={dayValue.startTime}
                  onChange={(e) => updateTime(day, "startTime", e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-line bg-bg-raised text-[12.5px] outline-none focus:border-teal cursor-pointer"
                />
                <span className="text-ink-faint text-[12px] pointer-events-none">to</span>
                <input
                  type="time"
                  value={dayValue.endTime}
                  onChange={(e) => updateTime(day, "endTime", e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-line bg-bg-raised text-[12.5px] outline-none focus:border-teal cursor-pointer"
                />
              </div>
            )}
            {!active && <span className="text-[12.5px] text-ink-faint pointer-events-none">Not available</span>}
          </div>
        );
      })}
    </div>
  );
}
