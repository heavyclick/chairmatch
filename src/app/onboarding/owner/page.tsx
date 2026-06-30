"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { OnboardingShell } from "@/components/shared/onboarding-shell";
import { ChipSelect } from "@/components/shared/chip-select";
import { ChipSelectWithOther } from "@/components/shared/chip-select-with-other";
import { AiWritingAssist } from "@/components/shared/ai-writing-assist";
import { AvailabilityPicker, type DayAvailability } from "@/components/shared/availability-picker";
import { PhotoUpload } from "@/components/shared/photo-upload";
import { GalleryUpload, type GalleryPhoto } from "@/components/shared/gallery-upload";
import { SOFTWARE_OPTIONS, SPECIALTY_OPTIONS, US_STATES } from "@/lib/constants";

const TOTAL_STEPS = 7;

interface FormState {
  practiceName: string;
  photoUrl: string | null;
  city: string;
  state: string;
  zip: string;
  practiceType: string[];
  specialty: string[];
  software: string[];
  customSoftware: string[];
  workdays: DayAvailability[];
  cultureText: string;
  thriveText: string;
  honestChallengesText: string;
  idealStaffText: string;
  galleryPhotos: GalleryPhoto[];
  googleReviewUrl: string;
}

const INITIAL_STATE: FormState = {
  practiceName: "",
  photoUrl: null,
  city: "",
  state: "",
  zip: "",
  practiceType: [],
  specialty: [],
  software: [],
  customSoftware: [],
  workdays: [],
  cultureText: "",
  thriveText: "",
  honestChallengesText: "",
  idealStaffText: "",
  galleryPhotos: [],
  googleReviewUrl: "",
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

const PLANS = [
  {
    kind: "standard" as const,
    name: "Standard",
    price: "$100/yr",
    features: ["Unblur every name & photo", "Direct message any candidate", "Full filter access (already free)", "Interview question packs"],
  },
  {
    kind: "pro" as const,
    name: "Pro",
    price: "$250/yr",
    recommended: true,
    features: ["Everything in Standard", "AI natural-language search", "AI-assisted outreach", "AI Hiring Advisor chat", "10 screening credits included"],
  },
];

export default function OwnerOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-ink-faint">Loading…</div>}>
      <OwnerOnboardingForm />
    </Suspense>
  );
}

function OwnerOnboardingForm() {
  const searchParams = useSearchParams();
  const startStep = Number(searchParams.get("step")) || 1;
  const isEditMode = searchParams.get("step") !== null;

  const [step, setStep] = useState(startStep);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/owner/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setForm((f) => ({
            ...f,
            practiceName: data.profile.practice_name ?? "",
            photoUrl: data.profile.photo_url ?? null,
            city: data.profile.locations?.[0]?.city ?? "",
            state: data.profile.locations?.[0]?.state ?? "",
            zip: data.profile.locations?.[0]?.zip ?? "",
            practiceType: data.profile.practice_type ? [data.profile.practice_type] : [],
            specialty: data.profile.specialty ? [data.profile.specialty] : [],
            cultureText: data.profile.culture_text ?? "",
            thriveText: data.profile.thrive_text ?? "",
            honestChallengesText: data.profile.honest_challenges_text ?? "",
            idealStaffText: data.profile.ideal_staff_text ?? "",
            galleryPhotos: (data.profile.gallery ?? [])
              .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
              .map((g: { id: string; photo_url: string; caption: string | null }) => ({
                id: g.id,
                photoUrl: g.photo_url,
                caption: g.caption ?? "",
              })),
            googleReviewUrl: data.profile.google_review_url ?? "",
          }));
        }
      })
      .catch(() => {});
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveAndReturnToHub() {
    const ok = await persistProfile();
    if (ok) window.location.href = "/owner/settings/edit";
  }

  async function submitProfile() {
    const ok = await persistProfile();
    if (ok) setStep(6);
  }

  async function persistProfile(): Promise<boolean> {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/owner/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceName: form.practiceName,
          photoUrl: form.photoUrl,
          practiceType: form.practiceType[0],
          specialty: form.specialty[0],
          city: form.city,
          state: form.state,
          zip: form.zip,
          softwareSlugs: form.software,
          customSoftware: form.customSoftware,
          workdays: form.workdays,
          cultureText: form.cultureText,
          thriveText: form.thriveText,
          honestChallengesText: form.honestChallengesText,
          idealStaffText: form.idealStaffText,
          galleryPhotos: form.galleryPhotos,
          googleReviewUrl: form.googleReviewUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong saving your practice profile.");
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

  const choosePlan = async (kind: "standard" | "pro") => {
    setCheckingOut(kind);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Couldn't start checkout.");
        setCheckingOut(null);
      }
    } catch {
      alert("Couldn't start checkout -- check your connection and try again.");
      setCheckingOut(null);
    }
  };

  // ---------- Step 1: Practice basics + photo + state + specialty ----------
  if (step === 1) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={1}
        totalSteps={TOTAL_STEPS}
        title="Tell us about your practice"
        footer={
          <PrimaryButton
            onClick={() => setStep(2)}
            disabled={!form.practiceName || !form.city || !form.state || form.practiceType.length === 0}
          >
            Continue
          </PrimaryButton>
        }
      >
        <div className="mb-5">
          <PhotoUpload
            value={form.photoUrl}
            onChange={(url) => update("photoUrl", url)}
            bucket="practice-photos"
            fallbackInitials={form.practiceName ? form.practiceName[0].toUpperCase() : "?"}
          />
        </div>

        <input
          placeholder="Practice name"
          value={form.practiceName}
          onChange={(e) => update("practiceName", e.target.value)}
          className={inputClass + " mb-3"}
        />
        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
          className={inputClass + " mb-3"}
        />
        <div className="grid grid-cols-2 gap-3 mb-5">
          <select value={form.state} onChange={(e) => update("state", e.target.value)} className={inputClass}>
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

        <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Practice type</p>
        <ChipSelect
          options={PRACTICE_TYPES}
          selected={form.practiceType}
          onChange={(v) => update("practiceType", v.slice(-1))}
          multi={false}
        />

        <p className="text-[13px] font-semibold text-ink-soft mb-2.5 mt-5">Specialty</p>
        <ChipSelect
          options={SPECIALTY_OPTIONS}
          selected={form.specialty}
          onChange={(v) => update("specialty", v.slice(-1))}
          multi={false}
        />
      </OnboardingShell>
    );
  }

  // ---------- Step 2: Software + workdays ----------
  if (step === 2) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={2}
        totalSteps={TOTAL_STEPS}
        title="Software and schedule"
        subtitle="Helps us surface candidates who already know your systems and can match your hours."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(3)} disabled={form.software.length === 0 && form.customSoftware.length === 0}>
              Continue
            </PrimaryButton>
            <BackLink onClick={() => setStep(1)} />
          </>
        }
      >
        <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Practice software</p>
        <ChipSelectWithOther
          options={SOFTWARE_OPTIONS}
          selected={form.software}
          onChange={(v) => update("software", v)}
          customValues={form.customSoftware}
          onCustomChange={(v) => update("customSoftware", v)}
        />

        <p className="text-[13px] font-semibold text-ink-soft mb-2.5 mt-6">Operating days & hours</p>
        <AvailabilityPicker value={form.workdays} onChange={(v) => update("workdays", v)} />
      </OnboardingShell>
    );
  }

  // ---------- Step 3: Culture disclosure ----------
  if (step === 3) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={3}
        totalSteps={TOTAL_STEPS}
        title="Tell candidates what it's actually like here."
        subtitle="This is required before you can browse or post -- it's what makes ChairMatch's matching mean something. Candidates see exactly what you write."
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
              placeholder="e.g. Fast-paced, high patient volume, tight-knit team of 6 -- we lean on each other a lot."
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

          <div>
            <label className="text-[14px] font-semibold mb-1.5 block">
              Describe your ideal staff member.
            </label>
            <textarea
              rows={3}
              value={form.idealStaffText}
              onChange={(e) => update("idealStaffText", e.target.value)}
              placeholder="e.g. Someone proactive who notices gaps in the schedule before being told, and is comfortable speaking up."
              className={inputClass + " resize-none mb-2"}
            />
            <AiWritingAssist field="ideal_staff" currentValue={form.idealStaffText} />
          </div>
        </div>
      </OnboardingShell>
    );
  }

  // ---------- Step 4: Photos + Google reviews ----------
  if (step === 4) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={4}
        totalSteps={TOTAL_STEPS}
        title="Show candidates your practice."
        subtitle="Team photos, your office, anything that helps someone picture themselves here."
        footer={
          <>
            <PrimaryButton onClick={() => setStep(5)}>Continue</PrimaryButton>
            <BackLink onClick={() => setStep(3)} />
          </>
        }
      >
        <div className="mb-6">
          <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Photos</p>
          <GalleryUpload value={form.galleryPhotos} onChange={(v) => update("galleryPhotos", v)} />
        </div>

        <div>
          <p className="text-[13px] font-semibold text-ink-soft mb-1.5">Google reviews link <span className="text-ink-faint font-normal">(optional)</span></p>
          <p className="text-[12px] text-ink-faint mb-2.5">
            Paste your practice&apos;s Google Maps/Business link -- we&apos;ll show your rating on your profile.
          </p>
          <input
            placeholder="https://g.page/your-practice or Google Maps link"
            value={form.googleReviewUrl}
            onChange={(e) => update("googleReviewUrl", e.target.value)}
            className={inputClass}
          />
        </div>
      </OnboardingShell>
    );
  }

  // ---------- Step 5: Save profile (transition step) ----------
  if (step === 5) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={5}
        totalSteps={TOTAL_STEPS}
        title="Ready to save your profile?"
        subtitle="Next you'll choose how you want to start -- browsing free, or with a plan."
        footer={
          <>
            <PrimaryButton onClick={submitProfile} disabled={submitting}>
              {submitting ? "Saving…" : "Save and continue"}
            </PrimaryButton>
            {submitError && (
              <p className="text-[13px] text-coral-deep text-center mt-3">{submitError}</p>
            )}
            <BackLink onClick={() => setStep(4)} />
          </>
        }
      >
        <div className="rounded-xl bg-teal-tint p-5 text-[13.5px] text-teal-deep leading-relaxed">
          Filters and full profile details are free, always. Upgrade only when you&apos;re ready to see names and reach out.
        </div>
      </OnboardingShell>
    );
  }

  // ---------- Step 6: REAL plan choice (this used to be missing -- only
  // a single "start browsing" button existed despite the copy promising
  // a plan choice) ----------
  if (step === 6) {
    return (
      <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
        step={6}
        totalSteps={TOTAL_STEPS}
        title="Choose how to start"
        subtitle="You can always upgrade later -- nothing here is permanent."
        footer={
          <>
            <button
              onClick={() => (window.location.href = "/owner/browse")}
              className="w-full text-center text-teal-deep font-semibold text-[14px] py-2"
            >
              Start browsing free instead →
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.kind}
              className={`relative rounded-2xl border p-5 ${
                plan.recommended ? "border-teal bg-teal-tint/30" : "border-line bg-bg-raised"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-2.5 left-4 bg-coral text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full">
                  Recommended
                </span>
              )}
              <div className="flex items-center gap-2 mb-1 mt-1">
                <h3 className="font-serif text-lg font-semibold">{plan.name}</h3>
                {plan.recommended && <Sparkles size={14} className="text-teal-deep" />}
              </div>
              <p className="text-[22px] font-semibold text-teal-deep mb-4">{plan.price}</p>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-ink-soft">
                    <Check size={13} className="text-teal-deep mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => choosePlan(plan.kind)}
                disabled={checkingOut === plan.kind}
                className="w-full py-2.5 rounded-control text-[13.5px] font-semibold bg-teal text-white hover:bg-teal-deep transition-colors disabled:opacity-60"
              >
                {checkingOut === plan.kind ? "Redirecting…" : `Choose ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
        editModeSaveAction={isEditMode ? { onSave: saveAndReturnToHub, saving: submitting } : undefined}
      step={7}
      totalSteps={TOTAL_STEPS}
      title="You're set up."
      subtitle="Your practice profile is live."
      footer={
        <PrimaryButton onClick={() => (window.location.href = "/owner/dashboard")}>
          Go to your dashboard
        </PrimaryButton>
      }
    >
      <div className="rounded-xl bg-teal-tint p-5 text-[13.5px] text-teal-deep leading-relaxed">
        You can change your plan or browse free anytime from Settings → Billing.
      </div>
    </OnboardingShell>
  );
}
