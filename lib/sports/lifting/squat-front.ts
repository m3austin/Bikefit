/*
 * Squat front-view analysis: the frontal plane the side view cannot see, for
 * the squat only. It reads knee tracking (knees caving inward, "valgus") and
 * left-right symmetry at the bottom of each rep, reusing the frontal
 * knee-deviation and hip-width math already proven in the cycling module. No
 * new geometry; a squat is segmented by the hip's vertical cycle, and each
 * bottom is measured the same way cycling measures a pedal stroke's frontal
 * plane.
 *
 * Deadlift and bench get no front view: their faults live in the sagittal
 * plane, which the side view already covers.
 *
 * Targets are PLACEHOLDER, like the rest of LiftFit, until a strength coach
 * confirms them.
 */

import { detectCyclePeaks } from "@/lib/kernel/cycles";
import { computeStats, type MetricStats } from "@/lib/kernel/geometry";
import type { MetricInput } from "@/lib/kernel/dashboard";
import { verdictFor, type TargetRange } from "@/lib/kernel/rules";
import { METRIC_VISIBILITY_FLOOR, type TimedFrame } from "@/lib/kernel/tracking";
import { LANDMARK, type PoseFrame } from "@/lib/pose-model";
import { computeFrontalFrameMetrics } from "@/lib/sports/cycling/biomechanics";
import { REP_SEGMENTATION, MIN_REPS_FOR_REPORT } from "@/lib/sports/lifting/biomechanics";
import type { LiftFinding } from "@/lib/sports/lifting/lifts";

/** Target ranges, PLACEHOLDER (see header). Both read as percent of hip width;
 * lower is better (0 = knees tracking straight, sides matched). */
export const SQUAT_FRONT_TARGETS = {
  // Peak medial (inward) knee travel at the bottom, worse leg.
  kneeTracking: { low: 0, high: 15, margin: 8, unit: "pct" },
  // Difference between the two knees' tracking.
  symmetry: { low: 0, high: 8, margin: 5, unit: "pct" },
} as const satisfies Record<string, TargetRange>;

/** Data-quality cutoff (PLACEHOLDER): per-rep knee-tracking spread beyond this
 * many percent flags the recording as too noisy (shake or off-angle). */
export const SQUAT_FRONT_HIGH_VARIANCE_PCT = 8;

export type SquatFrontReport = {
  sampleCount: number;
  analyzedMs: number;
  repCount: number;
  /** Per-rep peak medial deviation of the worse knee, percent of hip width. */
  kneeTrackingPct: MetricStats | null;
  /** Per-rep left-right gap in knee deviation, percent of hip width. */
  symmetryPct: MetricStats | null;
  highVariance: boolean;
};

export type SquatFrontAnalysis =
  | { ok: true; report: SquatFrontReport }
  | { ok: false; reason: string };

/** Visible mid-hip vertical position (y grows downward). Null when a hip is
 * missing; only y is needed, so aspect does not matter here. */
function midHipY(frame: PoseFrame): number | null {
  const l = frame[LANDMARK.LEFT_HIP];
  const r = frame[LANDMARK.RIGHT_HIP];
  if (!l || !r) return null;
  if ((l.visibility ?? 0) < METRIC_VISIBILITY_FLOOR) return null;
  if ((r.visibility ?? 0) < METRIC_VISIBILITY_FLOOR) return null;
  return (l.y + r.y) / 2;
}

/**
 * Segment the front-view squat by the hip's vertical cycle (bottom = lowest
 * hip, the largest image y), and measure knee tracking + symmetry at each
 * bottom. Reuses cycling's frontal per-frame metrics for the deviation math.
 */
export function buildSquatFrontReport(
  timedFrames: readonly TimedFrame[],
  aspectRatio: number,
): SquatFrontAnalysis {
  const samples = timedFrames.map((t) => ({
    tMs: t.tMs,
    frontal: computeFrontalFrameMetrics(t.frame, aspectRatio),
    hipY: midHipY(t.frame),
  }));

  const usable: Array<{ index: number; tMs: number; value: number }> = [];
  samples.forEach((s, index) => {
    if (s.hipY !== null) usable.push({ index, tMs: s.tMs, value: s.hipY });
  });
  if (usable.length < 10) {
    return {
      ok: false,
      reason:
        "We couldn't see both hips and knees for enough of the video. Film from directly in front, whole body in frame, good light.",
    };
  }

  const peaks = detectCyclePeaks(
    usable.map((u) => ({ tMs: u.tMs, value: u.value })),
    REP_SEGMENTATION,
  );
  const bottoms = peaks
    .map((p) => usable[p]?.index)
    .filter((i): i is number => i !== undefined);

  if (bottoms.length < MIN_REPS_FOR_REPORT) {
    return {
      ok: false,
      reason: `We need at least ${MIN_REPS_FOR_REPORT} full reps from the front to read knee tracking. Film the whole set, straight on.`,
    };
  }

  const kneeTrack: number[] = [];
  const symmetry: number[] = [];
  for (const i of bottoms) {
    const m = samples[i]?.frontal;
    if (!m) continue;
    const left = m.leftKneeDeviation;
    const right = m.rightKneeDeviation;
    if (left === null || right === null) continue;
    // Medial-positive fraction of hip width -> percent. Worse (more caved)
    // leg drives the tracking read; the gap is the symmetry read.
    kneeTrack.push(Math.max(left, right) * 100);
    symmetry.push(Math.abs(left - right) * 100);
  }

  const trackStats = computeStats(kneeTrack);
  const last = samples[samples.length - 1];

  return {
    ok: true,
    report: {
      sampleCount: samples.length,
      analyzedMs: last ? last.tMs : 0,
      repCount: bottoms.length,
      kneeTrackingPct: trackStats,
      symmetryPct: computeStats(symmetry),
      highVariance:
        trackStats !== null && trackStats.stdDev > SQUAT_FRONT_HIGH_VARIANCE_PCT,
    },
  };
}

/**
 * Turn a front report into scored metrics for the dashboard and any findings
 * for the one-change list. Knee cave is the higher-priority note; asymmetry
 * is a secondary one.
 */
export function evaluateSquatFront(report: SquatFrontReport): {
  metrics: MetricInput[];
  findings: LiftFinding[];
} {
  const metrics: MetricInput[] = [];
  const findings: LiftFinding[] = [];

  const track = report.kneeTrackingPct?.mean;
  if (track !== undefined) {
    const target = SQUAT_FRONT_TARGETS.kneeTracking;
    metrics.push({
      key: "kneeTracking",
      label: "Knee tracking",
      hint: "Knees caving inward at the bottom, % of hip width (front view)",
      value: track,
      target,
      verdict: verdictFor(track, target),
    });
    if (track > target.high) {
      findings.push({
        ruleId: "knee-cave",
        description:
          "Your knees track inward at the bottom of the squat, more than the target. Caving knees load the joint sideways and leak power.",
        action:
          "Push your knees out to track over your toes. The knees-out drill below trains it at light load.",
        direction: "knees out",
        magnitude: "none",
        priority: 2,
        confidence: "medium",
        adjust: "knees-out",
      });
    }
  }

  const sym = report.symmetryPct?.mean;
  if (sym !== undefined) {
    const target = SQUAT_FRONT_TARGETS.symmetry;
    metrics.push({
      key: "kneeSymmetry",
      label: "Left-right symmetry",
      hint: "Gap between the two knees' tracking, % of hip width (front view)",
      value: sym,
      target,
      verdict: verdictFor(sym, target),
    });
    if (sym > target.high) {
      findings.push({
        ruleId: "knee-asymmetry",
        description:
          "One knee caves more than the other, a side-to-side difference worth watching for a nagging imbalance.",
        action:
          "Film a few sets and see if it is consistent. If one side always caves, the knees-out drill plus single-leg strength usually helps; a physiotherapist can check a persistent gap.",
        direction: "even out",
        magnitude: "none",
        priority: 4,
        confidence: "low",
        adjust: "knees-out",
      });
    }
  }

  return { metrics, findings };
}
