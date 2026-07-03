"use client";

import {
  formatRangeText,
  formatValue,
  unitLabel,
  unitWord,
} from "@/lib/format";
import type { Unit } from "@/lib/units";
import { useCountUp } from "@/components/fit/use-count-up";

export type FitRangeProps = {
  /** Optional caption above the range (e.g. "Recommended start"). */
  caption?: string;
  low: number;
  high: number;
  /** Recommended starting point; marked with the accent tick. */
  start: number;
  /** The rider's existing setting, if entered; marked separately. */
  current?: number;
  unit: Unit;
  /** Count the start value up on mount (the results reveal). Default off. */
  animate?: boolean;
};

function pct(value: number, low: number, high: number): number {
  if (high <= low) return 50;
  return Math.min(Math.max(((value - low) / (high - low)) * 100, 0), 100);
}

/*
 * FitRange (UX-UI-Design §3): the signature results visual. A horizontal band
 * for the low-high range, an accent tick at the recommended start, and an
 * optional marker for the rider's current setting. All numbers are mono
 * (tabular-nums) and driven by mm, so a unit toggle re-renders values in place
 * with no layout shift. The whole thing is exposed as a single labelled image.
 */
export function FitRange({
  caption = "Recommended start",
  low,
  high,
  start,
  current,
  unit,
  animate = false,
}: FitRangeProps) {
  const startPct = pct(start, low, high);
  const hasCurrent = typeof current === "number";
  const currentPct = hasCurrent ? pct(current, low, high) : 0;
  // Headline start value counts up on reveal; the range bar geometry stays put.
  const displayStart = useCountUp(start, animate);

  const label =
    `${caption}: ${formatValue(start, unit)} ${unitLabel(unit)}. ` +
    `Range ${formatRangeText(low, high, unit)}.` +
    (hasCurrent
      ? ` Your current setting: ${formatValue(current, unit)} ${unitLabel(unit)}.`
      : "");

  return (
    <figure role="img" aria-label={label} className="m-0">
      <div className="flex items-end justify-between gap-4">
        <figcaption className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">{caption}</span>
          <span className="measurement text-3xl font-semibold text-ink">
            {formatValue(displayStart, unit)}
            <span className="ml-1 text-base font-normal text-ink-muted">
              {unitLabel(unit)}
            </span>
          </span>
        </figcaption>
        {hasCurrent ? (
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="text-sm text-ink-muted">Your setting</span>
            <span className="measurement text-lg text-ink">
              {formatValue(current, unit)}
              <span className="ml-1 text-sm text-ink-muted">
                {unitLabel(unit)}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {/* The track spans the low-high range; accent tint signals "this is the
          recommended range". */}
      <div className="relative mt-5 h-2 rounded-full bg-accent/15" aria-hidden="true">
        {hasCurrent ? (
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-surface"
            style={{ left: `${currentPct}%` }}
          />
        ) : null}
        <span
          className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${startPct}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between measurement text-xs text-ink-muted">
        <span>
          {formatValue(low, unit)} {unitLabel(unit)}
        </span>
        <span>
          {formatValue(high, unit)} {unitLabel(unit)}
        </span>
      </div>
      <span className="sr-only">Values shown in {unitWord(unit)}.</span>
    </figure>
  );
}
