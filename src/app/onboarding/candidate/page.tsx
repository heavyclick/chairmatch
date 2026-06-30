"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Plane, Sparkles, Home, Plus, Trash2 } from "lucide-react";
import { OnboardingShell } from "@/components/shared/onboarding-shell";
import { ChipSelect } from "@/components/shared/chip-select";
import { ChipSelectWithOther } from "@/components/shared/chip-select-with-other";
import { AiWritingAssist } from "@/components/shared/ai-writing-assist";
import { AvailabilityPicker, type DayAvailability } from "@/components/shared/availability-picker";
import { PhotoUpload } from "@/components/shared/photo-upload";
import {
  ROLES,
  SOFTWARE_OPTIONS,
  DEALBREAKER_OPTIONS,
  EMPLOYMENT_TYPES,
  US_STATES,
} from "@/lib/constants";

const TOTAL_STEPS = 10;

interface WorkHistoryEntry {
  employerName: string;
  roleTitle: string;
  companyWebsite: string;
  startDate: string;
  endDate: string;
}

interface FormState {
  fullName: string;
  photoUrl: string | null;
  primaryRole: string[];
  aliasRoles: string[];
  city: string;
  state: string;
  zip: string;
  employmentTypes: string[];
  openToRelocation: boolean;
  openToRemote: boolean;
  payMin: string;
  payMax: string;
  payUnit: "hourly" | "annual" | "custom";
  collectionsPercent: string;
  collectionsNote: string;
  yearsExperience: string;
  university: string;
  certifications: string;
  ceCourses: string;
  skills: string;
  hobbies: string;
  software: string[];
  customSoftware: string[];
  workHistory: WorkHistoryEntry[];
  availability: DayAvailability[];
  valueAdd: string;
  futureGoals: string;
  recoveryScenario: string;
  idealPractice: string;
  dealbreakers: string[];
  customDealbreakers: string[];
  termsAccepted: boolean;
  marketingOptIn: boolean;
}

const INITIAL_STATE: FormState = {
  fullName: "",
  photoUrl: null,
  primaryRole: [],
  aliasRoles: [],
  city: "",
  state: "",
  zip: "",
  employmentTypes: [],
  openToRelocation: false,
  openToRemote: false,
  payMin: "",
  payMax: "",
  payUnit: "hourly",
  collectionsPercent: "",
  collectionsNote: "",
  yearsExperience: "",
  university: "",
  certifications: "",
  ceCourses: "",
  skills: "",
  hobbies: "",
  software: [],
  customSoftware: [],
  workHistory: [],
  availability: [],
  valueAdd: "",
  futureGoals: "",
  recoveryScenario: "",
  idealPractice: "",
  dealbreakers: [],
  customDealbreakers: [],
  termsAccepted: false,
  marketingOptIn: false,
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

const MONTH_OPTIONS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

// Last 50 years, most recent first -- covers any realistic career
// start date without an unbounded/freeform year field that's easy to
// fat-finger (e.g. typing "2102" instead of "2012").
const YEAR_OPTIONS = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i));

export default function CandidateOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-ink-faint">Loading…</div>}>
      <CandidateOnboardingForm />
    </Suspense>
  );
}

function CandidateOnboardingForm() {
  const searchParams = useSearchParams();
  // Editing a single field redirects here with ?field=X&step=Y so the
  // person lands directly on the relevant step instead of restarting
  // the whole wizard -- see /candidate/settings for the entry points.
  const startStep = Number(searchParams.get("step")) || 1;

  const [step, setStep] = useState(startStep);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Edit mode: arrived via /onboarding/candidate?step=N from the edit
  // hub (/candidate/settings/edit), meaning "edit just this section and
  // go back" rather than "walk through the entire wizard." This is the
  // fix for the audit finding that editing ANYTHING required redoing
  // all 7 (now 9) onboarding steps from scratch.
  const isEditMode = searchParams.get("step") !== null;

  // Load existing profile data if editing rather than starting fresh --
  // without this, "edit" always looked like an empty wizard, which is
  // confusing even with direct-step navigation.
  useEffect(() => {
    fetch("/api/candidate/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setForm((f) => ({ ...f, ...mapProfileToForm(data.profile) }));
        }
      })
      .catch(() => {});
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveAndReturnToHub() {
    const ok = await persistProfile();
    if (ok) window.location.href = "/candidate/settings/edit";
  }

  async function submitProfile(nextStep: number) {
    const ok = await persistProfile();
    if (ok) setStep(nextStep);
  }

  // Pure save -- does the POST, sets loading/error state, returns
  // whether it succeeded. Callers decide what happens next (advance a
  // step, or return to the edit hub) -- this function has no opinion
  // about navigation, which is what makes it reusable for both flows.
  async function persistProfile(): Promise<boolean> {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/candidate/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          photoUrl: form.photoUrl,
          primaryRoleSlug: form.primaryRole[0],
          aliasSlugs: form.aliasRoles,
          city: form.city,
          state: form.state,
          zip: form.zip,
          employmentTypes: form.employmentTypes,
          openToRelocation: form.openToRelocation,
          openToRemote: form.openToRemote,
          payMin: form.payMin,
          payMax: form.payMax,
          payUnit: form.payUnit,
          collectionsPercent: form.collectionsPercent || null,
          collectionsNote: form.collectionsNote || null,
          yearsExperience: form.yearsExperience,
          university: form.university,
          certifications: splitList(form.certifications),
          ceCourses: splitList(form.ceCourses),
          skills: splitList(form.skills),
          hobbies: splitList(form.hobbies),
          softwareSlugs: form.software,
          customSoftware: form.customSoftware,
          workHistory: form.workHistory,
          availability: form.availability,
          valueAddText: form.valueAdd,
          futureGoalsText: form.futureGoals,
          recoveryScenarioText: form.recoveryScenario,
          idealPracticeText: form.idealPractice,
          dealbreakerSlugs: form.dealbreakers,
          customDealbreakers: form.customDealbreakers,
          termsAcceptedAt: form.termsAccepted ? new Date().toISOString() : undefined,
          marketingOptIn: form.marketingOptIn,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong saving your profile.");
      }
      return true;
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Couldn't save your profile -- check your connection and try again."
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRole = ROLES.find((r) => r.slug === form.primaryRole[0]);

  // ---------- Step 1: Name + photo + primary role + aliases ----------
  if (step === 1) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={1}
        totalSteps={TOTAL_STEPS}
        title="What do you do?"
        subtitle="Pick the role that's closest to what you do day to day."
        footer={
          <PrimaryButton
            onClick={() => setStep(2)}
            disabled={form.primaryRole.length === 0 || !form.fullName.trim()}
          >
            Continue
          </PrimaryButton>
        }
      >
        <div className="mb-5">
          <PhotoUpload
            value={form.photoUrl}
            onChange={(url) => update("photoUrl", url)}
            bucket="candidate-photos"
            fallbackInitials={form.fullName ? form.fullName[0].toUpperCase() : "?"}
          />
        </div>

        <input
          placeholder="Your full name"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          className={inputClass + " mb-5"}
        />

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
              Also goes by, where you&apos;ve worked: <span className="text-ink-faint">(optional)</span>
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

  // ---------- Step 2: Location ----------
  if (step === 2) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={2}
        totalSteps={TOTAL_STEPS}
        title="Where are you based?"
        subtitle="State matters, not just city -- several cities share names across states, and this is how practices find you accurately."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(3)} disabled={!form.city || !form.state || !form.zip}>
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(1)} />
          </>
        }
      >
        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
          className={inputClass + " mb-3"}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            className={inputClass}
          >
            <option value="">State</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            placeholder="ZIP code"
            value={form.zip}
            onChange={(e) => update("zip", e.target.value)}
            className={inputClass}
          />
        </div>
      </OnboardingShell>
    );
  }

  // ---------- Step 3: Employment type + relocation + remote ----------
  if (step === 3) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={3}
        totalSteps={TOTAL_STEPS}
        title="How do you want to work?"
        footer={
          <>
            <PrimaryButton onClick={() => setStep(4)} disabled={form.employmentTypes.length === 0}>
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(2)} />
          </>
        }
      >
        <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Open to:</p>
        <ChipSelect
          options={EMPLOYMENT_TYPES.map((e) => ({ slug: e.slug, label: e.label }))}
          selected={form.employmentTypes}
          onChange={(v) => update("employmentTypes", v)}
        />

        <div className="space-y-3 mt-5">
          <label className="flex items-center gap-2.5 cursor-pointer">
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
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.openToRemote}
              onChange={(e) => update("openToRemote", e.target.checked)}
              className="w-4 h-4 rounded accent-teal"
            />
            <span className="text-[14px] flex items-center gap-1.5">
              <Home size={14} className="text-ink-faint" />
              Open to remote work (billing, scheduling, etc.)
            </span>
          </label>
        </div>
      </OnboardingShell>
    );
  }

  // ---------- Step 4: Availability (days + hours) ----------
  if (step === 4) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={4}
        totalSteps={TOTAL_STEPS}
        title="When are you available?"
        subtitle="Tap a day to mark it available, then set your hours for that day."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(5)} disabled={form.availability.length === 0}>
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(3)} />
          </>
        }
      >
        <AvailabilityPicker
          value={form.availability}
          onChange={(v) => update("availability", v)}
        />
      </OnboardingShell>
    );
  }

  // ---------- Step 5: Pay + experience + software ----------
  if (step === 5) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={5}
        totalSteps={TOTAL_STEPS}
        title="Pay and experience"
        subtitle="Your range stays visible to every practice -- even before they unlock your contact info."
        footer={
          <>
            <PrimaryButton
              onClick={() => setStep(6)}
              disabled={
                (form.payUnit !== "custom" && (!form.payMin || !form.payMax)) ||
                (form.payUnit === "custom" && !form.collectionsPercent && !form.collectionsNote) ||
                !form.yearsExperience
              }
            >
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(4)} />
          </>
        }
      >
        <div className="flex gap-2 mb-3">
          {(["hourly", "annual", "custom"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => update("payUnit", u)}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold ${
                form.payUnit === u ? "bg-ink text-white" : "bg-line-soft text-ink-soft"
              }`}
            >
              {u === "hourly" ? "Hourly" : u === "annual" ? "Annual" : "Custom / Collections"}
            </button>
          ))}
        </div>

        {form.payUnit !== "custom" ? (
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
        ) : (
          <div className="mb-5 space-y-3">
            <p className="text-[12.5px] text-ink-faint">
              For associates or roles paid on collections -- enter a percentage, a note, or both.
            </p>
            <input
              placeholder="% of collections (e.g. 30)"
              value={form.collectionsPercent}
              onChange={(e) => update("collectionsPercent", e.target.value)}
              className={inputClass}
              inputMode="numeric"
            />
            <textarea
              placeholder="Any nuance worth noting (e.g. 30% after lab fees, guaranteed minimum, etc.)"
              value={form.collectionsNote}
              onChange={(e) => update("collectionsNote", e.target.value)}
              rows={2}
              className={inputClass + " resize-none"}
            />
          </div>
        )}

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
        <ChipSelectWithOther
          options={SOFTWARE_OPTIONS}
          selected={form.software}
          onChange={(v) => update("software", v)}
          customValues={form.customSoftware}
          onCustomChange={(v) => update("customSoftware", v)}
        />
      </OnboardingShell>
    );
  }

  // ---------- Step 6: Work history, university, skills, CE, hobbies ----------
  if (step === 6) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={6}
        totalSteps={TOTAL_STEPS}
        title="Your background"
        subtitle="Work history, education, and what you're into outside the office."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(7)}>Continue</PrimaryButton>
            <BackLink onClick={() => setStep(5)} />
          </>
        }
      >
        <div className="mb-7">
          <p className="text-[13px] font-semibold text-ink-soft mb-3">Work history</p>
          {form.workHistory.map((entry, i) => (
            <div key={i} className="rounded-xl border border-line p-4 mb-3">
              <div className="flex justify-between items-start mb-2.5">
                <span className="text-[12.5px] font-semibold text-ink-faint">Position {i + 1}</span>
                <button
                  type="button"
                  onClick={() => update("workHistory", form.workHistory.filter((_, idx) => idx !== i))}
                  className="text-ink-faint hover:text-coral-deep"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                placeholder="Employer name"
                value={entry.employerName}
                onChange={(e) => {
                  const next = [...form.workHistory];
                  next[i] = { ...next[i], employerName: e.target.value };
                  update("workHistory", next);
                }}
                className={inputClass + " mb-2"}
              />
              <input
                placeholder="Your role there"
                value={entry.roleTitle}
                onChange={(e) => {
                  const next = [...form.workHistory];
                  next[i] = { ...next[i], roleTitle: e.target.value };
                  update("workHistory", next);
                }}
                className={inputClass + " mb-2"}
              />
              <input
                placeholder="Practice website (optional)"
                value={entry.companyWebsite}
                onChange={(e) => {
                  const next = [...form.workHistory];
                  next[i] = { ...next[i], companyWebsite: e.target.value };
                  update("workHistory", next);
                }}
                className={inputClass + " mb-2"}
              />
              <div className="mb-1">
                <p className="text-[11.5px] font-semibold text-ink-faint mb-1.5">Started</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={entry.startDate ? entry.startDate.split("-")[1] : ""}
                    onChange={(e) => {
                      const year = entry.startDate ? entry.startDate.split("-")[0] : String(new Date().getFullYear());
                      const next = [...form.workHistory];
                      next[i] = { ...next[i], startDate: e.target.value ? `${year}-${e.target.value}` : "" };
                      update("workHistory", next);
                    }}
                    className={inputClass}
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={entry.startDate ? entry.startDate.split("-")[0] : ""}
                    onChange={(e) => {
                      const month = entry.startDate ? entry.startDate.split("-")[1] : "01";
                      const next = [...form.workHistory];
                      next[i] = { ...next[i], startDate: e.target.value ? `${e.target.value}-${month}` : "" };
                      update("workHistory", next);
                    }}
                    className={inputClass}
                  >
                    <option value="">Year</option>
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 mb-2.5 mt-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entry.endDate === ""}
                  onChange={(e) => {
                    const next = [...form.workHistory];
                    next[i] = { ...next[i], endDate: e.target.checked ? "" : `${new Date().getFullYear()}-01` };
                    update("workHistory", next);
                  }}
                  className="w-4 h-4 rounded accent-teal"
                />
                <span className="text-[13px] text-ink-soft">I currently work here</span>
              </label>

              {entry.endDate !== "" && (
                <div>
                  <p className="text-[11.5px] font-semibold text-ink-faint mb-1.5">Ended</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={entry.endDate ? entry.endDate.split("-")[1] : ""}
                      onChange={(e) => {
                        const year = entry.endDate ? entry.endDate.split("-")[0] : String(new Date().getFullYear());
                        const next = [...form.workHistory];
                        next[i] = { ...next[i], endDate: e.target.value ? `${year}-${e.target.value}` : "" };
                        update("workHistory", next);
                      }}
                      className={inputClass}
                    >
                      <option value="">Month</option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={entry.endDate ? entry.endDate.split("-")[0] : ""}
                      onChange={(e) => {
                        const month = entry.endDate ? entry.endDate.split("-")[1] : "01";
                        const next = [...form.workHistory];
                        next[i] = { ...next[i], endDate: e.target.value ? `${e.target.value}-${month}` : "" };
                        update("workHistory", next);
                      }}
                      className={inputClass}
                    >
                      <option value="">Year</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update("workHistory", [
                ...form.workHistory,
                { employerName: "", roleTitle: "", companyWebsite: "", startDate: "", endDate: "" },
              ])
            }
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-teal-deep"
          >
            <Plus size={13} /> Add a position
          </button>
        </div>

        <input
          placeholder="University / school attended"
          value={form.university}
          onChange={(e) => update("university", e.target.value)}
          className={inputClass + " mb-3"}
        />
        <input
          placeholder="Certifications (comma separated)"
          value={form.certifications}
          onChange={(e) => update("certifications", e.target.value)}
          className={inputClass + " mb-3"}
        />
        <input
          placeholder="CE courses / training completed (comma separated)"
          value={form.ceCourses}
          onChange={(e) => update("ceCourses", e.target.value)}
          className={inputClass + " mb-3"}
        />
        <input
          placeholder="Skills (comma separated)"
          value={form.skills}
          onChange={(e) => update("skills", e.target.value)}
          className={inputClass + " mb-3"}
        />
        <input
          placeholder="Hobbies & interests (comma separated, optional)"
          value={form.hobbies}
          onChange={(e) => update("hobbies", e.target.value)}
          className={inputClass}
        />
      </OnboardingShell>
    );
  }

  // ---------- Step 7: The qualitative section (the differentiator) ----------
  if (step === 7) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={7}
        totalSteps={TOTAL_STEPS}
        title="This is the part that gets you noticed."
        subtitle="Practices read this before anything else on your profile. Take your time -- and use the writing helper if you get stuck."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(8)} disabled={!form.valueAdd}>
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(6)} />
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
            <textarea
              rows={3}
              value={form.recoveryScenario}
              onChange={(e) => update("recoveryScenario", e.target.value)}
              placeholder="e.g. I'd start by auditing unscheduled treatment and run a recall/reactivation push before touching marketing spend."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="recovery_scenario" currentValue={form.recoveryScenario} />
          </div>

          <div>
            <label className="text-[14px] font-semibold mb-1.5 block">
              Describe your ideal practice.
            </label>
            <textarea
              rows={3}
              value={form.idealPractice}
              onChange={(e) => update("idealPractice", e.target.value)}
              placeholder="e.g. A small, tight-knit team where I'm trusted to own my schedule and patients feel like more than a number."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="ideal_practice" currentValue={form.idealPractice} />
          </div>
        </div>
      </OnboardingShell>
    );
  }

  // ---------- Step 8: Dealbreakers ----------
  if (step === 8) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={8}
        totalSteps={TOTAL_STEPS}
        title="Anything you won't work with?"
        subtitle="No judgment -- this just keeps you from wasting time on the wrong fit. Skip if nothing applies."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(9)}>Continue</PrimaryButton>
            <BackLink onClick={() => setStep(7)} />
          </>
        }
      >
        <ChipSelectWithOther
          options={DEALBREAKER_OPTIONS}
          selected={form.dealbreakers}
          onChange={(v) => update("dealbreakers", v)}
          customValues={form.customDealbreakers}
          onCustomChange={(v) => update("customDealbreakers", v)}
        />
      </OnboardingShell>
    );
  }

  // ---------- Step 9: Terms + marketing + submit ----------
  if (step === 9) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={9}
        totalSteps={TOTAL_STEPS}
        title="Almost there."
        subtitle="Your profile, including this writing, is visible to every practice searching for your role -- your name and photo stay hidden until a practice unlocks contact."
        footer={
          <>
            <PrimaryButton onClick={() => submitProfile(10)} disabled={submitting || !form.termsAccepted}>
              {submitting ? "Saving…" : "Finish"}
            </PrimaryButton>
            {submitError && (
              <p className="text-[13px] text-coral-deep text-center mt-3">{submitError}</p>
            )}
            <BackLink onClick={() => setStep(8)} />
          </>
        }
      >
        <div className="rounded-xl border border-line bg-bg-raised p-5 flex items-start gap-3 mb-5">
          <Sparkles size={16} className="text-teal-deep mt-0.5 shrink-0" />
          <div>
            <p className="text-[14px] font-semibold mb-1">Discoverable in practice search</p>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              You can change this anytime from your dashboard.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={form.termsAccepted}
            onChange={(e) => update("termsAccepted", e.target.checked)}
            className="w-4 h-4 rounded accent-teal mt-0.5"
          />
          <span className="text-[13.5px] text-ink-soft">
            I agree to ChairMatch&apos;s{" "}
            <a href="/terms" className="text-teal-deep font-semibold" target="_blank">Terms of Service</a> and{" "}
            <a href="/privacy" className="text-teal-deep font-semibold" target="_blank">Privacy Policy</a>.
          </span>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.marketingOptIn}
            onChange={(e) => update("marketingOptIn", e.target.checked)}
            className="w-4 h-4 rounded accent-teal mt-0.5"
          />
          <span className="text-[13.5px] text-ink-soft">
            Send me updates about new opportunities and ChairMatch features.
          </span>
        </label>
      </OnboardingShell>
    );
  }

  // ---------- Step 10: Done ----------
  return (
    <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
      step={10}
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

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Maps the GET /api/candidate/profile/me response shape back into form
// state, for the "edit existing profile" case. Best-effort -- any field
// not present just keeps its initial value.
function mapProfileToForm(profile: Record<string, unknown>): Partial<FormState> {
  return {
    fullName: (profile.full_name as string) ?? "",
    photoUrl: (profile.photo_url as string) ?? null,
    city: (profile.city as string) ?? "",
    state: (profile.state as string) ?? "",
    zip: (profile.zip as string) ?? "",
    employmentTypes: (profile.employment_types as string[]) ?? [],
    openToRelocation: Boolean(profile.open_to_relocation),
    openToRemote: Boolean(profile.open_to_remote),
    payMin: profile.pay_range_min != null ? String(profile.pay_range_min) : "",
    payMax: profile.pay_range_max != null ? String(profile.pay_range_max) : "",
    payUnit: (profile.pay_unit as "hourly" | "annual" | "custom") ?? "hourly",
    yearsExperience: profile.years_experience != null ? String(profile.years_experience) : "",
    university: (profile.university as string) ?? "",
    valueAdd: (profile.value_add_text as string) ?? "",
    futureGoals: (profile.future_goals_text as string) ?? "",
    recoveryScenario: (profile.recovery_scenario_text as string) ?? "",
  };
}
