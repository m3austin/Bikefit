/*
 * Kernel event-sequence utilities (SportFits, docs/sportfit/01-Architecture):
 * generic motion-speed tools for sports whose action is a single event chain
 * (a golf swing: address, takeaway, top, impact, follow-through) rather than
 * a repeating cycle. The kernel supplies speed math and threshold searches;
 * the sport module owns the phase semantics. Pure; no React, DOM, or
 * MediaPipe runtime.
 */

import { movingAverage, type Point2 } from "@/lib/kernel/geometry";

export type MotionSample = { tMs: number; pos: Point2 | null };

export type SpeedPoint = { tMs: number; speed: number; index: number };

/**
 * Instantaneous speed (distance per second, in the input's units) between
 * consecutive samples that both have positions, smoothed with a centered
 * moving average. Each speed point remembers the index of its (second)
 * source sample, so callers can map results back to frames.
 */
export function computeSpeedSeries(
  samples: readonly MotionSample[],
  smoothWindow: number,
): SpeedPoint[] {
  const raw: SpeedPoint[] = [];
  let prev: { tMs: number; pos: Point2 } | null = null;
  samples.forEach((s, index) => {
    if (!s.pos) return;
    if (prev && s.tMs > prev.tMs) {
      const dt = (s.tMs - prev.tMs) / 1000;
      const dist = Math.hypot(s.pos.x - prev.pos.x, s.pos.y - prev.pos.y);
      raw.push({ tMs: s.tMs, speed: dist / dt, index });
    }
    prev = { tMs: s.tMs, pos: s.pos };
  });
  const smoothed = movingAverage(
    raw.map((p) => p.speed),
    smoothWindow,
  );
  return raw.map((p, i) => ({ ...p, speed: smoothed[i] ?? p.speed }));
}

/** Index (into `series`) of the greatest speed; -1 for an empty series. */
export function argmaxSpeed(series: readonly SpeedPoint[]): number {
  let best = -1;
  let bestSpeed = -Infinity;
  series.forEach((p, i) => {
    if (p.speed > bestSpeed) {
      bestSpeed = p.speed;
      best = i;
    }
  });
  return best;
}

/** Index of the smallest speed within [from, to] (inclusive); -1 if empty. */
export function argminSpeedBetween(
  series: readonly SpeedPoint[],
  from: number,
  to: number,
): number {
  let best = -1;
  let bestSpeed = Infinity;
  for (let i = Math.max(0, from); i <= Math.min(series.length - 1, to); i++) {
    const p = series[i];
    if (p && p.speed < bestSpeed) {
      bestSpeed = p.speed;
      best = i;
    }
  }
  return best;
}

/**
 * First index at or after `from` where speed stays at or above `threshold`
 * for at least `minDurationMs` (the start of sustained motion). -1 if never.
 */
export function firstSustainedAbove(
  series: readonly SpeedPoint[],
  from: number,
  threshold: number,
  minDurationMs: number,
): number {
  for (let i = Math.max(0, from); i < series.length; i++) {
    const start = series[i];
    if (!start || start.speed < threshold) continue;
    let j = i;
    while (j + 1 < series.length) {
      const next = series[j + 1];
      if (!next || next.speed < threshold) break;
      j++;
    }
    const end = series[j];
    if (end && end.tMs - start.tMs >= minDurationMs) return i;
    i = j;
  }
  return -1;
}

/**
 * First index at or after `from` where speed drops below `threshold` and
 * stays below for at least `minDurationMs` (motion settling). -1 if never.
 */
export function firstSustainedBelow(
  series: readonly SpeedPoint[],
  from: number,
  threshold: number,
  minDurationMs: number,
): number {
  for (let i = Math.max(0, from); i < series.length; i++) {
    const start = series[i];
    if (!start || start.speed >= threshold) continue;
    let j = i;
    while (j + 1 < series.length) {
      const next = series[j + 1];
      if (!next || next.speed >= threshold) break;
      j++;
    }
    const end = series[j];
    if (end && end.tMs - start.tMs >= minDurationMs) return i;
    i = j;
  }
  return -1;
}
