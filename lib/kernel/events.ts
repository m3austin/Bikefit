/*
 * Kernel event-sequence utilities (SportFits, docs/sportfit/01-Architecture):
 * generic searches over time-stamped signal arrays for sports whose action is
 * a single event chain (a golf swing: address, takeaway, top, impact,
 * follow-through) rather than a repeating cycle. The kernel supplies speed
 * math and threshold/extremum searches; the sport module owns the phase
 * semantics. Pure; no React, DOM, or MediaPipe runtime.
 *
 * All searches work on parallel arrays (values[i] at timesMs[i]) and return
 * an index into those arrays, or -1.
 */

/** Per-point speed (units per second) from consecutive positions. Across a
 * tracking gap longer than maxGapMs the previous speed is carried forward,
 * so a dropout neither spikes (a re-acquisition jump read as huge speed) nor
 * fakes stillness. The first point's speed is 0. */
export function speedsFromTrack(
  timesMs: readonly number[],
  xs: readonly number[],
  ys: readonly number[],
  maxGapMs: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < timesMs.length; i++) {
    const t = timesMs[i];
    const tPrev = timesMs[i - 1];
    if (i === 0 || t === undefined || tPrev === undefined || t <= tPrev) {
      out.push(0);
      continue;
    }
    if (t - tPrev > maxGapMs) {
      out.push(out[i - 1] ?? 0);
      continue;
    }
    const dx = (xs[i] ?? 0) - (xs[i - 1] ?? 0);
    const dy = (ys[i] ?? 0) - (ys[i - 1] ?? 0);
    out.push(Math.hypot(dx, dy) / ((t - tPrev) / 1000));
  }
  return out;
}

/** Index of the greatest value within [from, to] (inclusive, clamped); -1 if
 * the window is empty. */
export function argmaxIndexBetween(
  values: readonly number[],
  from: number,
  to: number,
): number {
  let best = -1;
  let bestValue = -Infinity;
  for (let i = Math.max(0, from); i <= Math.min(values.length - 1, to); i++) {
    const v = values[i];
    if (v !== undefined && v > bestValue) {
      bestValue = v;
      best = i;
    }
  }
  return best;
}

/** Index of the smallest value within [from, to] (inclusive, clamped); -1 if
 * the window is empty. */
export function argminIndexBetween(
  values: readonly number[],
  from: number,
  to: number,
): number {
  let best = -1;
  let bestValue = Infinity;
  for (let i = Math.max(0, from); i <= Math.min(values.length - 1, to); i++) {
    const v = values[i];
    if (v !== undefined && v < bestValue) {
      bestValue = v;
      best = i;
    }
  }
  return best;
}

/** First index at or after `from` where the value stays at or above
 * `threshold` for at least `minDurationMs` (sustained motion starting). -1 if
 * never. */
export function firstSustainedAboveIdx(
  values: readonly number[],
  timesMs: readonly number[],
  from: number,
  threshold: number,
  minDurationMs: number,
): number {
  for (let i = Math.max(0, from); i < values.length; i++) {
    const v = values[i];
    if (v === undefined || v < threshold) continue;
    let j = i;
    while (j + 1 < values.length && (values[j + 1] ?? -Infinity) >= threshold)
      j++;
    if ((timesMs[j] ?? 0) - (timesMs[i] ?? 0) >= minDurationMs) return i;
    i = j;
  }
  return -1;
}

/** First index at or after `from` where the value drops below `threshold`
 * and stays below for at least `minDurationMs` (motion settling). -1 if
 * never. */
export function firstSustainedBelowIdx(
  values: readonly number[],
  timesMs: readonly number[],
  from: number,
  threshold: number,
  minDurationMs: number,
): number {
  for (let i = Math.max(0, from); i < values.length; i++) {
    const v = values[i];
    if (v === undefined || v >= threshold) continue;
    let j = i;
    while (j + 1 < values.length && (values[j + 1] ?? Infinity) < threshold)
      j++;
    if ((timesMs[j] ?? 0) - (timesMs[i] ?? 0) >= minDurationMs) return i;
    i = j;
  }
  return -1;
}

/** End index of the LATEST run of values below `threshold` lasting at least
 * `minDurationMs` that ends at or before `beforeIdx`: the last still moment
 * before an event. Robust to earlier pauses (a practice swing's re-address
 * wins over the walk-in stillness). -1 if no qualifying run exists. */
export function lastStillEndBefore(
  values: readonly number[],
  timesMs: readonly number[],
  beforeIdx: number,
  threshold: number,
  minDurationMs: number,
): number {
  let best = -1;
  let runStart = -1;
  const limit = Math.min(values.length - 1, beforeIdx);
  for (let i = 0; i <= limit; i++) {
    const v = values[i];
    if (v !== undefined && v < threshold) {
      if (runStart < 0) runStart = i;
      if ((timesMs[i] ?? 0) - (timesMs[runStart] ?? 0) >= minDurationMs)
        best = i;
    } else {
      runStart = -1;
    }
  }
  return best;
}
