interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /**
   * When set, renders a "Save and return to profile" bar above the
   * normal step footer -- shown only when the wizard was opened in
   * edit mode (via ?step=N from the edit hub) so a person editing one
   * field can save just that change without continuing through every
   * remaining step. Added here, in the shared shell, rather than in
   * each of the 9 step blocks individually, since touching every step
   * footer by hand across a 900-line file risked missing one.
   */
  editModeSaveAction?: { onSave: () => void; saving: boolean };
}

export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  footer,
  editModeSaveAction,
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Progress bar -- thin, calm, top of viewport. No step-counter
          chrome competing with the headline below. */}
      <div className="h-1 bg-line-soft">
        <div
          className="h-full bg-teal transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-start md:items-center justify-center px-5 md:px-6 py-10 md:py-16">
        <div className="w-full max-w-[480px]">
          {editModeSaveAction && (
            <div className="mb-5 px-3 py-2 rounded-lg bg-teal-tint text-teal-deep text-[12.5px] font-semibold text-center">
              Editing this section only
            </div>
          )}

          <p className="text-xs font-semibold text-ink-faint mb-2 tracking-wide uppercase">
            Step {step} of {totalSteps}
          </p>
          <h1 className="font-serif text-[1.7rem] md:text-3xl font-semibold leading-tight mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-ink-soft mb-8 leading-relaxed">
              {subtitle}
            </p>
          )}
          {!subtitle && <div className="mb-8" />}

          <div className="mb-8">{children}</div>

          {editModeSaveAction && (
            <button
              type="button"
              onClick={editModeSaveAction.onSave}
              disabled={editModeSaveAction.saving}
              className="w-full bg-ink disabled:opacity-60 text-white font-semibold text-[14px] py-3 rounded-control hover:bg-teal-deep transition-colors mb-2.5"
            >
              {editModeSaveAction.saving ? "Saving…" : "Save and return to profile"}
            </button>
          )}

          {footer}
        </div>
      </div>
    </div>
  );
}
