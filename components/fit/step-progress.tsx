"use client";

import { cn } from "@/lib/utils";

export type StepProgressProps = {
  /** Ordered step labels. */
  steps: string[];
  /** Zero-based index of the current step. */
  currentIndex: number;
  /** Called when a completed step dot is chosen (jump back to edit). */
  onStepSelect?: (index: number) => void;
};

/*
 * StepProgress (UX-UI-Design §3): N dots + a fraction label + a thin accent
 * bar. Completed steps are links back; the current step is marked; upcoming
 * steps are inert. Step changes are announced politely via aria-live.
 */
export function StepProgress({
  steps,
  currentIndex,
  onStepSelect,
}: StepProgressProps) {
  const total = steps.length;
  const clamped = Math.min(Math.max(currentIndex, 0), total - 1);
  const fillPct = total > 1 ? (clamped / (total - 1)) * 100 : 0;
  const currentLabel = steps[clamped] ?? "";

  return (
    <nav aria-label="Wizard progress" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="measurement text-sm text-ink-muted">
          Step {clamped + 1} of {total}
        </p>
        <p className="text-sm font-medium text-ink" aria-live="polite">
          {currentLabel}
        </p>
      </div>

      <ol className="flex items-center justify-between gap-1">
        {steps.map((label, index) => {
          const isCompleted = index < clamped;
          const isCurrent = index === clamped;
          const canSelect = isCompleted && !!onStepSelect;

          return (
            <li key={label} className="flex">
              <button
                type="button"
                disabled={!canSelect}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={
                  isCompleted
                    ? `Go back to step ${index + 1}: ${label}`
                    : `Step ${index + 1}: ${label}`
                }
                onClick={canSelect ? () => onStepSelect(index) : undefined}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full",
                  canSelect ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "block size-3 rounded-full transition-colors",
                    isCurrent && "bg-accent ring-2 ring-accent/30",
                    isCompleted && "bg-accent",
                    !isCurrent && !isCompleted && "bg-line",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 ease-[var(--ease-instrument)]"
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </nav>
  );
}
