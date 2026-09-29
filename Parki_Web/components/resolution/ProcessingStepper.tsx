"use client";

import { useAppState } from "@/lib/store";

const STEPS = [
  { label: "Downloading", threshold: 10 },
  { label: "Pre-processing", threshold: 25 },
  { label: "Super-Resolution", threshold: 40 },
  { label: "Uncertainty Map", threshold: 60 },
  { label: "Post-processing", threshold: 80 },
  { label: "Quality Metrics", threshold: 95 },
  { label: "Complete", threshold: 100 },
];

export function ProcessingStepper() {
  const { jobProgress, jobProgressLabel } = useAppState();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      {/* Animated processing icon */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-ink-muted/10" />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-secondary animate-spin"
          style={{ animationDuration: "1.5s" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold text-primary">
            {jobProgress}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-4">
        <div className="h-2 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
            style={{ width: `${jobProgress}%` }}
          />
        </div>
      </div>

      {/* Current step label */}
      <p className="text-sm font-medium text-ink mb-6">{jobProgressLabel}</p>

      {/* Step indicators */}
      <div className="flex items-center gap-1 w-full max-w-xs">
        {STEPS.map((step, i) => {
          const isComplete = jobProgress >= step.threshold;
          const isCurrent =
            jobProgress >= (STEPS[i - 1]?.threshold || 0) && jobProgress < step.threshold;

          return (
            <div key={step.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-1 rounded-full transition-all duration-300 ${
                  isComplete
                    ? "bg-gradient-to-r from-primary to-secondary"
                    : isCurrent
                    ? "bg-primary/40"
                    : "bg-surface"
                }`}
              />
              <span
                className={`text-[9px] leading-tight text-center transition-colors ${
                  isComplete ? "text-primary font-medium" : isCurrent ? "text-ink" : "text-ink-muted/50"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
