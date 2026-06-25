interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  footer,
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

          {footer}
        </div>
      </div>
    </div>
  );
}
