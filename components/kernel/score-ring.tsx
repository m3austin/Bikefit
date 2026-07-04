"use client";

import * as React from "react";

import { usePrefersReducedMotion } from "@/components/kernel/use-reduced-motion";
import type { ScoreTone } from "@/lib/kernel/scoring";
import { cn } from "@/lib/utils";

/*
 * A circular 0-10 score gauge: an arc that fills to the score and a number
 * that counts up to it, both easing in on mount. Honors prefers-reduced-
 * motion by snapping to the final state. Tone colors the arc; the track stays
 * neutral. Pure presentation, driven by the kernel score.
 */

const TONE_TEXT: Record<ScoreTone, string> = {
  great: "text-accent",
  good: "text-accent",
  watch: "text-warn",
  work: "text-danger",
};

export function ScoreRing({
  score,
  tone,
  size = 72,
  stroke = 7,
  label,
  className,
}: {
  /** 0-10. */
  score: number;
  tone: ScoreTone;
  size?: number;
  stroke?: number;
  /** Optional caption under the number (e.g. the grade). */
  label?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  // The animated value grows from 0; reduced motion bypasses it and shows the
  // final score directly (no setState in the effect for that path).
  const [animated, setAnimated] = React.useState(0);
  const shown = reduced ? score : animated;

  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const DURATION = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(score * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, reduced]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, shown / 10));
  const offset = circ * (1 - frac);
  const cx = size / 2;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn("-rotate-90", TONE_TEXT[tone])}
        role="img"
        aria-label={`Score ${score.toFixed(1)} out of 10`}
      >
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--color-surface-2, currentColor)"
          strokeWidth={stroke}
          className="text-surface-2 opacity-40"
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "measurement font-semibold tabular-nums text-ink",
            size >= 120 ? "text-3xl" : size >= 90 ? "text-xl" : "text-base",
          )}
        >
          {shown.toFixed(1)}
        </span>
        {label ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
