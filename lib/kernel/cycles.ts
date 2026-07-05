/*
 * Kernel cyclic segmentation (SportFits, docs/sportfit/01-Architecture.md):
 * generic peak detection for repeating movements. Pedal strokes, running
 * strides, lift reps, and swim stroke cycles are all "find one peak per
 * cycle in a noisy 1D series"; each sport maps its own landmark to the series
 * and back. Extracted from the original cycling bottom-dead-center detector.
 *
 * Three robustness layers guard against real capture faults (see cycles.test):
 *  - a MEDIAN de-glitch pass removes single-frame tracker teleports before
 *    smoothing (a mean would smear a spike into a false peak instead);
 *  - optional PROMINENCE gating judges a peak by how far it rises above its
 *    own neighbours, so cycles stay detectable when amplitude drifts (the
 *    athlete moving toward or away from the camera) and a global height bar
 *    would drop the faded ones;
 *  - optional INTERVAL-CONSISTENCY drops peaks whose spacing is off the
 *    movement's own rhythm, killing phantom cycles from a hitch or splash.
 */

import { medianFilter, movingAverage } from "@/lib/kernel/geometry";

export type CyclePoint = { tMs: number; value: number };

export type CycleOptions = {
  /** Two peaks closer than this are one cycle. */
  minSeparationMs: number;
  /** A peak must sit this far up the series' min-to-max travel, 0 to 1.
   * Ignored when `minProminence` is set. */
  minRelativeHeight: number;
  /** Moving-average window (samples) applied before peak-picking. */
  smoothWindow: number;
  /** Median de-glitch window (samples); defaults to `smoothWindow`. A single
   * teleported frame inside this window is replaced by its neighbours. */
  medianWindow?: number;
  /** When set, gate peaks by topographic prominence (fraction of the series'
   * range) instead of the global height bar. Robust to amplitude drift. */
  minProminence?: number;
  /** When set, drop peaks whose gap to the previous kept peak is under
   * (1 - tolerance) x the median cycle interval: an off-rhythm phantom. */
  intervalTolerance?: number;
};

/** Topographic prominence of the peak at `i`: its height above the higher of
 * the two lowest points on the paths to a taller peak (or the ends). */
function prominenceAt(ys: readonly number[], i: number): number {
  const h = ys[i];
  if (h === undefined) return 0;
  let leftBase = h;
  for (let j = i - 1; j >= 0; j--) {
    const v = ys[j];
    if (v === undefined) break;
    if (v > h) break; // reached a taller peak
    if (v < leftBase) leftBase = v;
  }
  let rightBase = h;
  for (let j = i + 1; j < ys.length; j++) {
    const v = ys[j];
    if (v === undefined) break;
    if (v > h) break;
    if (v < rightBase) rightBase = v;
  }
  return h - Math.max(leftBase, rightBase);
}

/** Median of a numeric list (sorted copy); 0 for empty. */
function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Indices (into `points`) of one peak per movement cycle: local maxima of the
 * de-glitched, smoothed series that clear the height/prominence bar, picked
 * greedily by height with a minimum time gap so noise riding on a real peak
 * can't double-count it, then optionally thinned to the movement's rhythm.
 * Returned in time order. To find valleys, negate the values.
 */
export function detectCyclePeaks(
  points: readonly CyclePoint[],
  options: CycleOptions,
): number[] {
  if (points.length < 3) return [];

  const deglitched = medianFilter(
    points.map((p) => p.value),
    options.medianWindow ?? options.smoothWindow,
  );
  const ys = movingAverage(deglitched, options.smoothWindow);
  let min = Infinity;
  let max = -Infinity;
  for (const y of ys) {
    if (y < min) min = y;
    if (y > max) max = y;
  }
  const range = max - min;
  if (range < 1e-9) return [];
  const bar = min + options.minRelativeHeight * range;
  const promBar =
    options.minProminence === undefined ? null : options.minProminence * range;

  const candidates: number[] = [];
  for (let i = 1; i < ys.length - 1; i++) {
    const prev = ys[i - 1];
    const here = ys[i];
    const next = ys[i + 1];
    if (prev === undefined || here === undefined || next === undefined) continue;
    // >= on the left, > on the right: a flat-topped peak counts once.
    if (!(here >= prev && here > next)) continue;
    if (promBar === null) {
      if (here < bar) continue;
    } else if (prominenceAt(ys, i) < promBar) {
      continue;
    }
    candidates.push(i);
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

  if (options.intervalTolerance === undefined || accepted.length < 3) {
    return accepted;
  }

  // Rhythm thinning: with the median inter-peak interval as the beat, walk in
  // time and drop any peak that lands too soon after the last one we kept.
  const times = accepted.map((i) => points[i]?.tMs ?? 0);
  const gaps: number[] = [];
  for (let k = 1; k < times.length; k++) {
    gaps.push((times[k] ?? 0) - (times[k - 1] ?? 0));
  }
  const beat = median(gaps);
  if (beat <= 0) return accepted;
  const floorGap = (1 - options.intervalTolerance) * beat;

  const kept: number[] = [];
  let lastT = -Infinity;
  for (let k = 0; k < accepted.length; k++) {
    const idx = accepted[k];
    const t = times[k] ?? 0;
    if (kept.length === 0 || t - lastT >= floorGap) {
      if (idx !== undefined) kept.push(idx);
      lastT = t;
    }
  }
  return kept;
}
