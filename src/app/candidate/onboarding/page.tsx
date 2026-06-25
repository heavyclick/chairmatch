"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Plane, Sparkles } from "lucide-react";
import { OnboardingShell } from "@/components/shared/onboarding-shell";
import { ChipSelect } from "@/components/shared/chip-select";
import { AiWritingAssist } from "@/components/shared/ai-writing-assist";
import { ROLES, SOFTWARE_OPTIONS, DEALBREAKER_OPTIONS, EMPLOYMENT_TYPES } from "@/lib/constants";

const TOTAL_STEPS = 7;

interface FormState {
  primaryRole: string[];
  aliasRoles: string[];
  city: string;
  zip: string;
  employmentTypes: string[];
  openToRelocation: boolean;
  payMin: string;
  payMax: string;
  payUnit: "hourly" | "annual";
  yearsExperience: string;
  software: string[];
  valueAdd: string;
  futureGoals: string;
  recoveryScenario: string;
  dealbreakers: string[];
}

const INITIAL_STATE: FormState = {
  primaryRole: [],
  aliasRoles: [],
  city: "",
  zip: "",
  employmentTypes: [],
  openToRelocation: false,
  payMin: "",
  payMax: "",
  payUnit: "hourly",
  yearsExperience: "",
  software: [],
  valueAdd: "",
  futureGoals: "",
  recoveryScenario: "",
  dealbreakers: [],
};

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

const inputClass =
  "w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14.5px] outline-none focus:border-teal transition-colors";

export default function CandidateOnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const selectedRole = ROLES.find((r) => r.slug === form.primaryRole[0]);

  // ---------- Step 1: Primary role + aliases ----------
  if (step === 1) {
    return (
      <OnboardingShell
        step={1}
        totalSteps={TOTAL_STEPS}
        title="What do you do?"
        subtitle="Pick the role that's closest to what you do day to day."
        footer={<PrimaryButton onClick={() => setStep(2)} disabled={form.primaryRole.length === 0}>Continue</PrimaryButton>}
      >
        <ChipSelect
          options={ROLES.map((r) => ({ slug: r.slug, label: r.label }))}
          selected={form.primaryRole}
          onChange={(v) => {
            update("primaryRole", v.slice(-1));
            update("aliasRoles", []);
          }}
          multi={false}
        />

        {selectedRole && selectedRole.aliases.length > 0 && (
          <div className="mt-6">
            <p className="text-[13px] text-ink-soft mb-2.5">
              Also goes by, where you&apos;ve worked: <span className="text-ink-faint">(optional, helps practices find you)</span>
            </p>
            <ChipSelect
              options={selectedRole.aliases}
              selected={form.aliasRoles}
              onChange={(v) => update("aliasRoles", v)}
            />
          </div>
        )}
      </OnboardingShell>
    );
  }

  // ---------- Step 2: Location + employment type + relocation ----------
  if (step === 2) {
    return (
      <OnboardingShell
        step={2}
        totalSteps={TOTAL_STEPS}
        title="Where, and how often?"
        footer={
          <>
            <PrimaryButton
              onClick={() => setStep(3)}
              disabled={!form.city || !form.zip || form.employmentTypes.length === 0}
            >
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(1)} />
          </>
        }
      >
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

        <p className="text-[13px] font-semibold text-ink-soft mb-2.5">
          Open to:
        </p>
        <ChipSelect
          options={EMPLOYMENT_TYPES.map((e) => ({ slug: e.slug, label: e.label }))}
          selected={form.employmentTypes}
          onChange={(v) => update("employmentTypes", v)}
        />

        <label className="flex items-center gap-2.5 mt-5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.openToRelocation}
            onChange={(e) => update("openToRelocation", e.target.checked)}
            className="w-4 h-4 rounded accent-teal"
          />
          <span className="text-[14px] flex items-center gap-1.5">
            <Plane size={14} className="text-ink-faint" />
            Open to relocating for the right practice
          </span>
        </label>
      </OnboardingShell>
    );
  }

  // ---------- Step 3: Comp + experience + software ----------
  if (step === 3) {
    return (
      <OnboardingShell
        step={3}
        totalSteps={TOTAL_STEPS}
        title="Pay and experience"
        subtitle="Your range stays visible to every practice — even before they unlock your contact info. It's how the right ones find you."
        footer={
          <>
            <PrimaryButton
              onClick={() => setStep(4)}
              disabled={!form.payMin || !form.payMax || !form.yearsExperience}
            >
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(2)} />
          </>
        }
      >
        <div className="flex gap-2 mb-2">
          {(["hourly", "annual"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => update("payUnit", u)}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold ${
                form.payUnit === u ? "bg-ink text-white" : "bg-line-soft text-ink-soft"
              }`}
            >
              {u === "hourly" ? "Hourly" : "Annual"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <input
            placeholder={form.payUnit === "hourly" ? "Min $/hr" : "Min $/yr"}
            value={form.payMin}
            onChange={(e) => update("payMin", e.target.value)}
            className={inputClass}
            inputMode="numeric"
          />
          <input
            placeholder={form.payUnit === "hourly" ? "Max $/hr" : "Max $/yr"}
            value={form.payMax}
            onChange={(e) => update("payMax", e.target.value)}
            className={inputClass}
            inputMode="numeric"
          />
        </div>

        <input
          placeholder="Years of experience"
          value={form.yearsExperience}
          onChange={(e) => update("yearsExperience", e.target.value)}
          className={inputClass + " mb-5"}
          inputMode="numeric"
        />

        <p className="text-[13px] font-semibold text-ink-soft mb-2.5">
          Practice software you&apos;ve used:
        </p>
        <ChipSelect
          options={SOFTWARE_OPTIONS}
          selected={form.software}
          onChange={(v) => update("software", v)}
        />
      </OnboardingShell>
    );
  }

  // ---------- Step 4: The qualitative section (the differentiator) ----------
  if (step === 4) {
    return (
      <OnboardingShell
        step={4}
        totalSteps={TOTAL_STEPS}
        title="This is the part that gets you noticed."
        subtitle="Practices read this before anything else on your profile. Take your time — and use the writing helper if you get stuck."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(5)} disabled={!form.valueAdd}>
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(3)} />
          </>
        }
      >
        <div className="space-y-7">
          <div>
            <label className="text-[14px] font-semibold mb-1.5 block">
              What unique skill or quality do you bring to a practice?
            </label>
            <textarea
              rows={3}
              value={form.valueAdd}
              onChange={(e) => update("valueAdd", e.target.value)}
              placeholder="e.g. I'm the one who notices when a patient's gone quiet and follows up before they fall off the schedule entirely."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="value_add" currentValue={form.valueAdd} />
          </div>

          <div>
            <label className="text-[14px] font-semibold mb-1.5 block">
              Where do you want to be in your career in 2 years?
            </label>
            <textarea
              rows={2}
              value={form.futureGoals}
              onChange={(e) => update("futureGoals", e.target.value)}
              placeholder="e.g. Taking on more chairside responsibility, maybe mentoring newer assistants."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="future_goals" currentValue={form.futureGoals} />
          </div>

          <div>
            <label className="text-[14px] font-semibold mb-1.5 block">
              If a practice were struggling with low patient volume, how would you help bring it back up?
            </label>
            <p className="text-[12.5px] text-ink-faint mb-2">
              This is the single most-read field on your profile. Be specific.
            </p>
            <textarea
              rows={3}
              value={form.recoveryScenario}
              onChange={(e) => update("recoveryScenario", e.target.value)}
              placeholder="e.g. I'd start by auditing unscheduled treatment and run a recall/reactivation push before touching marketing spend."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="recovery_scenario" currentValue={form.recoveryScenario} />
          </div>
        </div>
      </OnboardingShell>
    );
  }

  // ---------- Step 5: Dealbreakers ----------
  if (step === 5) {
    return (
      <OnboardingShell
        step={5}
        totalSteps={TOTAL_STEPS}
        title="Anything you won't work with?"
        subtitle="No judgment — this just keeps you from wasting time on the wrong fit. Skip if nothing applies."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(6)}>Continue</PrimaryButton>
            <BackLink onClick={() => setStep(4)} />
          </>
        }
      >
        <ChipSelect
          options={DEALBREAKER_OPTIONS}
          selected={form.dealbreakers}
          onChange={(v) => update("dealbreakers", v)}
        />
      </OnboardingShell>
    );
  }

  // ---------- Step 6: Visibility ----------
  if (step === 6) {
    return (
      <OnboardingShell
        step={6}
        totalSteps={TOTAL_STEPS}
        title="Make your profile visible?"
        subtitle="Practices can find and reach out to you, even for roles you haven't searched for yet. You control this anytime in Settings."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(7)}>Continue</PrimaryButton>
            <BackLink onClick={() => setStep(5)} />
          </>
        }
      >
        <div className="rounded-xl border border-line bg-bg-raised p-5 flex items-start gap-3">
          <Sparkles size={16} className="text-teal-deep mt-0.5 shrink-0" />
          <div>
            <p className="text-[14px] font-semibold mb-1">Discoverable in practice search</p>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Your name and photo stay hidden until a practice unlocks contact — but your profile, including this writing, is visible to every practice searching for your role.
            </p>
          </div>
        </div>
      </OnboardingShell>
    );
  }

  // ---------- Step 7: Done ----------
  return (
    <OnboardingShell
      step={7}
      totalSteps={TOTAL_STEPS}
      title="You're in."
      subtitle="Your profile is live. We'll let you know the moment a practice views or messages you."
      footer={
        <PrimaryButton onClick={() => (window.location.href = "/candidate/dashboard")}>
          Go to your dashboard
        </PrimaryButton>
      }
    >
      <div className="rounded-xl bg-teal-tint p-5 text-[13.5px] text-teal-deep leading-relaxed">
        Tip: profiles updated in the last 90 days get prioritized in search. Come back and refresh yours if anything changes.
      </div>
    </OnboardingShell>
  );
}
