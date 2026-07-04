/*
 * Kernel cyclic segmentation (SportFits, docs/sportfit/01-Architecture.md):
 * generic peak detection for repeating movements. Pedal strokes, running
 * strides, lift reps, and swim stroke cycles are all "find one peak per
 * cycle in a noisy 1D series"; each sport maps its own landmark to the series
 * and back. Extracted from the original cycling bottom-dead-center detector;
 * behavior is identical for cycling's inputs.
 */

import { movingAverage } from "@/lib/kernel/geometry";

export type CyclePoint = { tMs: number; value: number };

export type CycleOptions = {
  /** Two peaks closer than this are one cycle. */
  minSeparationMs: number;
  /** A peak must sit this far up the series' min-to-max travel, 0 to 1. */
  minRelativeHeight: number;
  /** Moving-average window (samples) applied before peak-picking. */
  smoothWindow: number;
};

/**
 * Indices (into `points`) of one peak per movement cycle: local maxima of the
 * smoothed series that clear a relative-height bar, picked greedily by height
 * with a minimum time gap so noise riding on a real peak can't double-count
 * it. Returned in time order. To find valleys, negate the values.
 */
export function detectCyclePeaks(
  points: readonly CyclePoint[],
  options: CycleOptions,
): number[] {
  if (points.length < 3) return [];

  const ys = movingAverage(
    points.map((p) => p.value),
    options.smoothWindow,
  );
  let min = Infinity;
  let max = -Infinity;
  for (const y of ys) {
    if (y < min) min = y;
    if (y > max) max = y;
  }
  if (max - min < 1e-9) return [];
  const bar = min + options.minRelativeHeight * (max - min);

  const candidates: number[] = [];
  for (let i = 1; i < ys.length - 1; i++) {
    const prev = ys[i - 1];
    const here = ys[i];
    const next = ys[i + 1];
    if (prev === undefined || here === undefined || next === undefined) continue;
    if (here < bar) continue;
    // >= on the left, > on the right: a flat-topped peak counts once.
    if (here >= prev && here > next) candidates.push(i);
  }

  // Greedy by height, keeping only peaks far enough (in time) from the ones
  // already accepted.
  candidates.sort((a, b) => (ys[b] ?? 0) - (ys[a] ?? 0));
  const accepted: number[] = [];
  for (const c of candidates) {
    const tc = points[c]?.tMs;
    if (tc === undefined) continue;
    const clear = accepted.every((a) => {
      const ta = points[a]?.tMs;
      return ta === undefined || Math.abs(ta - tc) >= options.minSeparationMs;
    });
    if (clear) accepted.push(c);
  }
  accepted.sort((a, b) => a - b);
  return accepted;
}
