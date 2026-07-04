/*
 * Kernel geometry (SportFits, docs/sportfit/01-Architecture.md): pure 2D math
 * shared by every sport module. No React, Next, DOM, or MediaPipe imports.
 * Moved verbatim from the original lib/biomechanics.ts; the golden tests that
 * lock these functions moved with their sport callers.
 */

export type Point2 = { x: number; y: number };

/**
 * Interior angle at vertex b of the path a-b-c, in degrees within [0, 180].
 * Returns null when either segment has zero length (the angle is undefined).
 */
export function interiorAngleDeg(
  a: Point2,
  b: Point2,
  c: Point2,
): number | null {
  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;
  const lenAb = Math.hypot(abX, abY);
  const lenCb = Math.hypot(cbX, cbY);
  if (lenAb === 0 || lenCb === 0) return null;
  const cos = (abX * cbX + abY * cbY) / (lenAb * lenCb);
  const clamped = Math.min(1, Math.max(-1, cos));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/**
 * Segment lean relative to horizontal, in degrees: 0 is parallel to the
 * ground, 90 is vertical, independent of left/right direction. Image y grows
 * downward, so the upper point being above means lower.y - upper.y positive.
 * Null when the points coincide.
 */
export function torsoAngleDeg(lower: Point2, upper: Point2): number | null {
  const dx = Math.abs(upper.x - lower.x);
  const dy = lower.y - upper.y;
  if (dx === 0 && dy === 0) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Centered moving average. Windows are clamped odd and to the series length. */
export function movingAverage(
  values: readonly number[],
  window: number,
): number[] {
  if (values.length === 0) return [];
  const half = Math.floor(Math.max(1, Math.min(window, values.length)) / 2);
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let n = 0;
    for (let j = i - half; j <= i + half; j++) {
      const v = values[j];
      if (v !== undefined) {
        sum += v;
        n++;
      }
    }
    out.push(sum / n);
  }
  return out;
}

export type MetricStats = {
  min: number;
  max: number;
  mean: number;
  /** Sample standard deviation (n - 1); 0 when only one value. */
  stdDev: number;
  count: number;
};

/** Basic stats over a series. Null for an empty series. */
export function computeStats(values: readonly number[]): MetricStats | null {
  if (values.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  const mean = sum / values.length;
  let sq = 0;
  for (const v of values) sq += (v - mean) * (v - mean);
  const stdDev = values.length > 1 ? Math.sqrt(sq / (values.length - 1)) : 0;
  return { min, max, mean, stdDev, count: values.length };
}
