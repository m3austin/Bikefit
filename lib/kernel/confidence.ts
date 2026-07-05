/*
 * Universal result confidence (SportFits, Tier 3). Every sport report carries
 * one of these so a noisy capture surfaces as "we're not sure, re-film"
 * instead of a confident-looking wrong dashboard. The score blends the
 * signals every report already has: how much of the clip the subject was
 * tracked, how steady the movement's rhythm was (erratic spacing means the
 * segmentation probably went wrong), how many cycles were found, how sure the
 * side-vote was, and — when a sport has a second independent signal — how
 * often the two agree. Pure and testable.
 */

import { computeStats } from "@/lib/kernel/geometry";

export type ConfidenceInputs = {
  /** Fraction of frames the primary tracker was visible, 0..1. */
  trackedFraction: number;
  /** Per-cycle durations (ms); their spread is the rhythm-steadiness signal. */
  cycleDurationsMs: readonly number[];
  /** Cycles found and the sport's minimum to report. */
  cycleCount: number;
  minCycles: number;
  /** Side-vote certainty (0..1), side-on sports only. */
  sideConfidence?: number;
  /** Two-signal agreement rate (0..1), when the sport cross-validates. */
  agreement?: number;
};

export type ConfidenceLevel = "high" | "fair" | "low";

export type ConfidenceReport = {
  /** 0..1 overall. */
  score: number;
  level: ConfidenceLevel;
  /** Plain-language drags on confidence, for the re-film hint; [] when high. */
  reasons: string[];
};

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** PLACEHOLDER data-quality thresholds (unsourced engineering defaults). */
const HIGH = 0.75;
const LOW = 0.5;
/** Rhythm coefficient of variation at/above which steadiness scores zero. */
const CV_FULL_PENALTY = 0.4;

export function scoreConfidence(inputs: ConfidenceInputs): ConfidenceReport {
  const reasons: string[] = [];

  const tracked = clamp01(inputs.trackedFraction);
  if (tracked < 0.6) {
    reasons.push(
      "We could only see you for part of the clip. Keep your whole body in frame, side on, in good light.",
    );
  }

  // Rhythm: coefficient of variation of cycle durations. Steady movement has
  // a low CV; erratic spacing means the segmentation likely misfired.
  const stats = computeStats([...inputs.cycleDurationsMs]);
  let rhythm = 1;
  if (stats && stats.mean > 0) {
    const cv = stats.stdDev / stats.mean;
    rhythm = clamp01(1 - cv / CV_FULL_PENALTY);
    if (cv > 0.2) {
      reasons.push(
        "Your rhythm looked uneven across the clip, so some cycles may be misread. A steadier camera and a few even reps help.",
      );
    }
  }

  // Density: at the bare minimum, one bad cycle sways everything; more cycles
  // average out. Saturates at twice the minimum.
  const density = clamp01(
    inputs.minCycles > 0
      ? (inputs.cycleCount - inputs.minCycles) / inputs.minCycles + 0.5
      : inputs.cycleCount > 0
        ? 1
        : 0,
  );

  const side = inputs.sideConfidence === undefined ? 1 : clamp01(inputs.sideConfidence * 3);
  const agreement = inputs.agreement === undefined ? null : clamp01(inputs.agreement);

  // Weighted blend. Tracking and rhythm dominate (they most decide whether the
  // numbers mean anything); density and side-vote are supporting; two-signal
  // agreement, when present, is a strong corroborator.
  let score =
    0.4 * tracked + 0.3 * rhythm + 0.15 * density + 0.15 * side;
  if (agreement !== null) score = 0.75 * score + 0.25 * agreement;
  // Tracking is a gate, not just a term: if the subject was barely visible,
  // nothing else (steady rhythm, agreement) can make the numbers trustworthy.
  score = clamp01(score * clamp01(tracked / 0.6));

  const level: ConfidenceLevel =
    score >= HIGH ? "high" : score >= LOW ? "fair" : "low";

  return { score, level, reasons };
}

/**
 * Reconcile two independent event tracks (both in ms): the fraction of
 * `primary` events with a `secondary` event within `toleranceMs`, and how
 * many were so confirmed. A footstrike seen by both the ankle low point and
 * the knee-flexion minimum is trustworthy; the agreement rate feeds
 * scoreConfidence. Used as a corroborator, never to drop data.
 */
export function crossValidateEvents(
  primaryTMs: readonly number[],
  secondaryTMs: readonly number[],
  toleranceMs: number,
): { agreement: number; confirmed: number } {
  if (primaryTMs.length === 0) return { agreement: 0, confirmed: 0 };
  let confirmed = 0;
  for (const t of primaryTMs) {
    if (secondaryTMs.some((s) => Math.abs(s - t) <= toleranceMs)) confirmed++;
  }
  return { agreement: confirmed / primaryTMs.length, confirmed };
}
