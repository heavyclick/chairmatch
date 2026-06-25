"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { OnboardingShell } from "@/components/shared/onboarding-shell";
import { ChipSelect } from "@/components/shared/chip-select";
import { AiWritingAssist } from "@/components/shared/ai-writing-assist";
import { SOFTWARE_OPTIONS } from "@/lib/constants";

const TOTAL_STEPS = 4;

interface FormState {
  practiceName: string;
  city: string;
  zip: string;
  practiceType: string[];
  software: string[];
  cultureText: string;
  thriveText: string;
  honestChallengesText: string;
}

const INITIAL_STATE: FormState = {
  practiceName: "",
  city: "",
  zip: "",
  practiceType: [],
  software: [],
  cultureText: "",
  thriveText: "",
  honestChallengesText: "",
};

const PRACTICE_TYPES = [
  { slug: "solo", label: "Solo practice" },
  { slug: "group", label: "Multi-doctor group" },
  { slug: "dso", label: "DSO / corporate" },
];

const inputClass =
  "w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14.5px] outline-none focus:border-teal transition-colors";

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 bg-teal disabled:bg-line disabled:text-ink-faint text-white font-semibold text-[15px] py-3.5 rounded-control transition-colors hover:bg-teal-deep"
    >
      {children}
      <ArrowRight size={16} />
    </button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-[13px] text-ink-faint hover:text-ink mt-3 mx-auto"
    >
      <ArrowLeft size={13} /> Back
    </button>
  );
}

export default function OwnerOnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (step === 1) {
    return (
      <OnboardingShell
        step={1}
        totalSteps={TOTAL_STEPS}
        title="Tell us about your practice"
        footer={
          <PrimaryButton
            onClick={() => setStep(2)}
            disabled={!form.practiceName || !form.city || form.practiceType.length === 0}
          >
            Continue
          </PrimaryButton>
        }
      >
        <input
          placeholder="Practice name"
          value={form.practiceName}
          onChange={(e) => update("practiceName", e.target.value)}
          className={inputClass + " mb-3"}
        />
        <div className="grid grid-cols-2 gap-3 mb-5">
          <input
            placeholder="City"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="ZIP code"
            value={form.zip}
            onChange={(e) => update("zip", e.target.value)}
            className={inputClass}
          />
        </div>
        <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Practice type</p>
        <ChipSelect
          options={PRACTICE_TYPES}
          selected={form.practiceType}
          onChange={(v) => update("practiceType", v.slice(-1))}
          multi={false}
        />
      </OnboardingShell>
    );
  }

  if (step === 2) {
    return (
      <OnboardingShell
        step={2}
        totalSteps={TOTAL_STEPS}
        title="What software do you run?"
        subtitle="Helps us surface candidates who already know your systems."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(3)} disabled={form.software.length === 0}>
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(1)} />
          </>
        }
      >
        <ChipSelect
          options={SOFTWARE_OPTIONS}
          selected={form.software}
          onChange={(v) => update("software", v)}
        />
      </OnboardingShell>
    );
  }

  if (step === 3) {
    return (
      <OnboardingShell
        step={3}
        totalSteps={TOTAL_STEPS}
        title="Tell candidates what it's actually like here."
        subtitle="This is required before you can browse or post — it's what makes ChairMatch's matching mean something. Candidates see exactly what you write."
        footer={
          <>
            <PrimaryButton
              onClick={() => setStep(4)}
              disabled={!form.cultureText || !form.thriveText}
            >
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(2)} />
          </>
        }
      >
        <div className="space-y-7">
          <div>
            <label className="text-[14px] font-semibold mb-1.5 block">
              Describe the culture here, honestly.
            </label>
            <textarea
              rows={3}
              value={form.cultureText}
              onChange={(e) => update("cultureText", e.target.value)}
              placeholder="e.g. Fast-paced, high patient volume, tight-knit team of 6 — we lean on each other a lot."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="culture" currentValue={form.cultureText} />
          </div>

          <div>
            <label className="text-[14px] font-semibold mb-1.5 block">
              What would make someone thrive here?
            </label>
            <textarea
              rows={3}
              value={form.thriveText}
              onChange={(e) => update("thriveText", e.target.value)}
              placeholder="e.g. Someone who likes structure and doesn't need much hand-holding once they're trained."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="thrive" currentValue={form.thriveText} />
          </div>

          <div>
            <label className="text-[14px] font-semibold mb-1.5 block">
              What&apos;s genuinely hard about this job? <span className="text-ink-faint font-normal">(optional, but builds trust)</span>
            </label>
            <textarea
              rows={2}
              value={form.honestChallengesText}
              onChange={(e) => update("honestChallengesText", e.target.value)}
              placeholder="e.g. We're short-staffed on Mondays and the schedule runs tight."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="honest_challenges" currentValue={form.honestChallengesText} />
          </div>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={4}
      totalSteps={TOTAL_STEPS}
      title="You're set up."
      subtitle="Your practice profile is live. Next, pick a plan — or start browsing free first."
      footer={
        <PrimaryButton onClick={() => (window.location.href = "/owner/browse")}>
          Start browsing
        </PrimaryButton>
      }
    >
      <div className="rounded-xl bg-teal-tint p-5 text-[13.5px] text-teal-deep leading-relaxed">
        Filters and full profile details are free, always. Upgrade only when you&apos;re ready to see names and reach out.
      </div>
    </OnboardingShell>
  );
}
