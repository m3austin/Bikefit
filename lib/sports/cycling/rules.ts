/*
 * Cycling (BikeFit) fit rules: targets, measured-value extraction, verdicts,
 * and the rule list, on top of the kernel rules engine. Moved from the
 * original lib/fit-rules.ts; behavior is identical.
 *
 * ============================ PLACEHOLDERS ============================
 * EVERY numeric value in this file (target ranges, marginal bands, rule
 * trigger points, and recommended adjustment magnitudes) is a PLACEHOLDER:
 * a reasonable-sounding scaffold value, NOT a sourced or validated number.
 * They exist so the engine's shape can be built and tested. The project
 * owner replaces them with sourced values; nobody else changes them, and
 * no session may tune them silently (CLAUDE.md video rules).
 * ======================================================================
 */

import {
  evaluateRules,
  verdictFor,
  type Finding,
  type Rule,
  type TargetRange,
  type Verdict,
} from "@/lib/kernel/rules";
import type { AdjustmentId } from "@/lib/sports/cycling/drills";
import type {
  FrontalStrokeReport,
  StrokeReport,
} from "@/lib/sports/cycling/biomechanics";

// Convenience re-exports so cycling consumers keep one import path.
export { verdictFor } from "@/lib/kernel/rules";
export type { Confidence, TargetRange, Verdict } from "@/lib/kernel/rules";

/**
 * Target ranges per metric. Degrees for angles; "pct" values are percent of
 * hip width (frontal metrics). Every number is a PLACEHOLDER (see header).
 */
export const TARGETS = {
  // PLACEHOLDER: knee extension at bottom dead center, degrees.
  kneeAtBdc: { low: 140, high: 148, margin: 4, unit: "deg" },
  // PLACEHOLDER: elbow angle, degrees.
  elbow: { low: 150, high: 165, margin: 8, unit: "deg" },
  // PLACEHOLDER: torso lean from horizontal, degrees.
  torso: { low: 35, high: 50, margin: 6, unit: "deg" },
  // PLACEHOLDER: hip angle at its most closed point in the stroke, degrees.
  hipMin: { low: 45, high: 90, margin: 10, unit: "deg" },
  // PLACEHOLDER: per-stroke peak knee deviation, percent of hip width.
  // Positive is inward (toward the top tube), negative is outward.
  peakKneeDev: { low: -10, high: 15, margin: 5, unit: "pct" },
  // PLACEHOLDER: |left - right| of the peak deviation means, percent.
  kneeDevAsymmetry: { low: 0, high: 8, margin: 4, unit: "pct" },
  // PLACEHOLDER: |mean hip drop| (static pelvic tilt), percent of hip width.
  hipDropAbs: { low: 0, high: 5, margin: 3, unit: "pct" },
  // PLACEHOLDER: left-right crank timing, degrees; 180 is perfect alternation.
  timingOffset: { low: 170, high: 190, margin: 10, unit: "deg" },
} as const satisfies Record<string, TargetRange>;

export type TargetId = keyof typeof TARGETS;

/**
 * The flattened measurement snapshot the rules reason over. Undefined means
 * that metric was not measured (view missing, or joints not visible enough).
 */
export type MeasuredValues = {
  kneeAtBdcMeanDeg?: number;
  elbowMeanDeg?: number;
  torsoMeanDeg?: number;
  hipMinDeg?: number;
  leftPeakDevMeanPct?: number;
  rightPeakDevMeanPct?: number;
  kneeDevAsymmetryPct?: number;
  hipDropAbsMeanPct?: number;
  timingOffsetMeanDeg?: number;
};

/** Pull the rule-relevant values out of whichever reports exist. */
export function extractMeasuredValues(
  sagittal?: StrokeReport | null,
  frontal?: FrontalStrokeReport | null,
): MeasuredValues {
  const left = frontal?.stats.leftPeakDeviationPct?.mean;
  const right = frontal?.stats.rightPeakDeviationPct?.mean;
  const hipDropMean = frontal?.stats.hipDropPct?.mean;
  return {
    kneeAtBdcMeanDeg: sagittal?.stats.kneeAtBdc?.mean,
    elbowMeanDeg: sagittal?.stats.elbow?.mean,
    torsoMeanDeg: sagittal?.stats.torso?.mean,
    hipMinDeg: sagittal?.stats.hip?.min,
    leftPeakDevMeanPct: left,
    rightPeakDevMeanPct: right,
    kneeDevAsymmetryPct:
      left !== undefined && right !== undefined
        ? Math.abs(left - right)
        : undefined,
    hipDropAbsMeanPct:
      hipDropMean !== undefined ? Math.abs(hipDropMean) : undefined,
    timingOffsetMeanDeg: frontal?.stats.timingOffsetDeg?.mean,
  };
}

/** One metric's measured value against its target, for the verdict cards. */
export type MetricVerdict = {
  /** Display identity (left/right knee share the peakKneeDev target). */
  id:
    | "kneeAtBdc"
    | "elbow"
    | "torso"
    | "hipMin"
    | "leftPeakDev"
    | "rightPeakDev"
    | "kneeDevAsymmetry"
    | "hipDropAbs"
    | "timingOffset";
  targetId: TargetId;
  value: number;
  target: TargetRange;
  verdict: Verdict;
};

/** Verdicts for every metric that was actually measured, in display order. */
export function computeMetricVerdicts(v: MeasuredValues): MetricVerdict[] {
  const rows: Array<[MetricVerdict["id"], TargetId, number | undefined]> = [
    ["kneeAtBdc", "kneeAtBdc", v.kneeAtBdcMeanDeg],
    ["elbow", "elbow", v.elbowMeanDeg],
    ["torso", "torso", v.torsoMeanDeg],
    ["hipMin", "hipMin", v.hipMinDeg],
    ["leftPeakDev", "peakKneeDev", v.leftPeakDevMeanPct],
    ["rightPeakDev", "peakKneeDev", v.rightPeakDevMeanPct],
    ["kneeDevAsymmetry", "kneeDevAsymmetry", v.kneeDevAsymmetryPct],
    ["hipDropAbs", "hipDropAbs", v.hipDropAbsMeanPct],
    ["timingOffset", "timingOffset", v.timingOffsetMeanDeg],
  ];
  const out: MetricVerdict[] = [];
  for (const [id, targetId, value] of rows) {
    if (value === undefined) continue;
    const target = TARGETS[targetId];
    out.push({ id, targetId, value, target, verdict: verdictFor(value, target) });
  }
  return out;
}

/** A cycling rule: the kernel shape with typed drill links. */
export type FitRule = Omit<Rule<MeasuredValues>, "adjust"> & {
  adjust?: AdjustmentId;
};

/** A triggered cycling finding, with the drill link typed. */
export type FitFinding = Omit<Finding, "adjust"> & { adjust?: AdjustmentId };

/*
 * The rule set. Conditions read the PLACEHOLDER targets above; magnitudes in
 * the recommendations are PLACEHOLDERS too. Order within a priority level is
 * the tie-break, so the array order is part of the engine's contract.
 */
export const FIT_RULES: readonly FitRule[] = [
  {
    id: "saddle-too-low",
    description:
      "Your knee stays more bent than the target at the bottom of the stroke, which usually means the saddle sits low.",
    condition: (v) =>
      v.kneeAtBdcMeanDeg !== undefined &&
      v.kneeAtBdcMeanDeg < TARGETS.kneeAtBdc.low,
    recommendation: {
      action: "Raise your saddle 3 to 5 mm.",
      direction: "raise",
      magnitude: "3 to 5 mm", // PLACEHOLDER magnitude
    },
    priority: 1,
    confidence: "high",
    adjust: "saddle-height",
  },
  {
    id: "saddle-too-high",
    description:
      "Your knee extends past the target at the bottom of the stroke, which usually means the saddle sits high.",
    condition: (v) =>
      v.kneeAtBdcMeanDeg !== undefined &&
      v.kneeAtBdcMeanDeg > TARGETS.kneeAtBdc.high,
    recommendation: {
      action: "Lower your saddle 3 to 5 mm.",
      direction: "lower",
      magnitude: "3 to 5 mm", // PLACEHOLDER magnitude
    },
    priority: 1,
    confidence: "high",
    adjust: "saddle-height",
  },
  {
    id: "reach-too-long",
    description:
      "Your elbows sit straighter than the target, which often means you are stretched out to the bars.",
    condition: (v) =>
      v.elbowMeanDeg !== undefined && v.elbowMeanDeg > TARGETS.elbow.high,
    recommendation: {
      action:
        "Shorten your reach: try a 10 mm shorter stem, or raise the bars 5 to 10 mm.",
      direction: "shorten",
      magnitude: "10 mm", // PLACEHOLDER magnitude
    },
    priority: 2,
    confidence: "medium",
    adjust: "reach",
  },
  {
    id: "bars-too-low",
    description:
      "Your torso sits flatter than the target, which many riders find hard to hold comfortably.",
    condition: (v) =>
      v.torsoMeanDeg !== undefined && v.torsoMeanDeg < TARGETS.torso.low,
    recommendation: {
      action: "Raise your handlebars 5 to 10 mm.",
      direction: "raise",
      magnitude: "5 to 10 mm", // PLACEHOLDER magnitude
    },
    priority: 2,
    confidence: "medium",
    adjust: "bar-height",
  },
  {
    id: "left-knee-collapse",
    description:
      "Your left knee tracks inward past the target during the power phase.",
    condition: (v) =>
      v.leftPeakDevMeanPct !== undefined &&
      v.leftPeakDevMeanPct > TARGETS.peakKneeDev.high,
    recommendation: {
      action:
        "Try moving your left cleat inboard 1 to 2 mm (this pushes the foot outboard), or consider arch support in that shoe.",
      direction: "inboard",
      magnitude: "1 to 2 mm", // PLACEHOLDER magnitude
    },
    priority: 2,
    confidence: "medium",
    adjust: "cleats",
  },
  {
    id: "right-knee-collapse",
    description:
      "Your right knee tracks inward past the target during the power phase.",
    condition: (v) =>
      v.rightPeakDevMeanPct !== undefined &&
      v.rightPeakDevMeanPct > TARGETS.peakKneeDev.high,
    recommendation: {
      action:
        "Try moving your right cleat inboard 1 to 2 mm (this pushes the foot outboard), or consider arch support in that shoe.",
      direction: "inboard",
      magnitude: "1 to 2 mm", // PLACEHOLDER magnitude
    },
    priority: 2,
    confidence: "medium",
    adjust: "cleats",
  },
  {
    id: "hip-too-closed",
    description:
      "Your hip closes past the target at the top of the stroke, which can feel cramped and pinch power.",
    condition: (v) => v.hipMinDeg !== undefined && v.hipMinDeg < TARGETS.hipMin.low,
    recommendation: {
      action:
        "Raise your handlebars 5 to 10 mm, or slide your saddle back 3 to 5 mm.",
      direction: "raise",
      magnitude: "5 to 10 mm", // PLACEHOLDER magnitude
    },
    priority: 3,
    confidence: "low",
    adjust: "bar-height",
  },
  {
    id: "knee-bows-out",
    description:
      "A knee tracks outward past the target, which can point to stance width or saddle height.",
    condition: (v) =>
      (v.leftPeakDevMeanPct !== undefined &&
        v.leftPeakDevMeanPct < TARGETS.peakKneeDev.low) ||
      (v.rightPeakDevMeanPct !== undefined &&
        v.rightPeakDevMeanPct < TARGETS.peakKneeDev.low),
    recommendation: {
      action:
        "Try moving that side's cleat outboard 1 to 2 mm (this brings the foot inboard), and re-check your saddle height.",
      direction: "outboard",
      magnitude: "1 to 2 mm", // PLACEHOLDER magnitude
    },
    priority: 3,
    confidence: "low",
    adjust: "cleats",
  },
  {
    id: "left-right-asymmetry",
    description:
      "Your left and right knees track differently by more than the target.",
    condition: (v) =>
      v.kneeDevAsymmetryPct !== undefined &&
      v.kneeDevAsymmetryPct > TARGETS.kneeDevAsymmetry.high,
    recommendation: {
      action:
        "Re-record to confirm it is consistent. If it persists across recordings, it is worth an in-person assessment.",
      direction: "recheck",
      magnitude: "none",
    },
    priority: 3,
    confidence: "low",
  },
  {
    id: "reach-too-short",
    description:
      "Your elbows sit more bent than the target, which can mean the cockpit is short for you.",
    condition: (v) =>
      v.elbowMeanDeg !== undefined && v.elbowMeanDeg < TARGETS.elbow.low,
    recommendation: {
      action:
        "If you feel cramped, try a 10 mm longer stem. If you feel fine, riding with relaxed, bent elbows is not a problem.",
      direction: "lengthen",
      magnitude: "10 mm", // PLACEHOLDER magnitude
    },
    priority: 4,
    confidence: "low",
    adjust: "reach",
  },
  {
    id: "hip-tilt",
    description:
      "Your pelvis sits tilted to one side by more than the target while pedaling.",
    condition: (v) =>
      v.hipDropAbsMeanPct !== undefined &&
      v.hipDropAbsMeanPct > TARGETS.hipDropAbs.high,
    recommendation: {
      action:
        "Check that you sit centered on the saddle and re-record. A tilt that persists across recordings is worth an in-person assessment.",
      direction: "recheck",
      magnitude: "none",
    },
    priority: 4,
    confidence: "low",
  },
  {
    id: "bars-too-high",
    description:
      "Your torso sits more upright than the target. Comfortable is fine; this only matters if you want more speed.",
    condition: (v) =>
      v.torsoMeanDeg !== undefined && v.torsoMeanDeg > TARGETS.torso.high,
    recommendation: {
      action:
        "If you want a faster position, lower your handlebars 5 to 10 mm and see how it feels.",
      direction: "lower",
      magnitude: "5 to 10 mm", // PLACEHOLDER magnitude
    },
    priority: 5,
    confidence: "low",
    adjust: "bar-height",
  },
  {
    id: "timing-uneven",
    description:
      "Your legs alternate further from evenly opposite than the target, which is most often a tracking artifact.",
    condition: (v) =>
      v.timingOffsetMeanDeg !== undefined &&
      (v.timingOffsetMeanDeg < TARGETS.timingOffset.low ||
        v.timingOffsetMeanDeg > TARGETS.timingOffset.high),
    recommendation: {
      action:
        "Re-record with a steadier camera and even lighting before reading anything into this.",
      direction: "recheck",
      magnitude: "none",
    },
    priority: 5,
    confidence: "low",
  },
];

/**
 * Run every cycling rule via the kernel engine. The casts narrow the kernel's
 * `adjust?: string` back to AdjustmentId, which is sound because FIT_RULES is
 * typed with AdjustmentId links.
 */
export function evaluateFitRules(v: MeasuredValues): {
  primary: FitFinding | null;
  secondary: FitFinding[];
  verdicts: MetricVerdict[];
} {
  const { primary, secondary } = evaluateRules(
    FIT_RULES as readonly Rule<MeasuredValues>[],
    v,
  );
  return {
    primary: primary as FitFinding | null,
    secondary: secondary as FitFinding[],
    verdicts: computeMetricVerdicts(v),
  };
}
