/*
 * SwimFit front-crawl rules: targets, measured-value extraction, verdicts,
 * and the rule list, on the kernel rules engine (one change at a time).
 *
 * ============================ PLACEHOLDERS / BETA ======================
 * EVERY numeric value here is a PLACEHOLDER, and every metric is a weak 2D
 * PROXY from one side-on above-water camera. Confidence is capped LOW on
 * everything except stroke rate: this module is beta until a real clip
 * proves it. The owner replaces these with values confirmed by a swim
 * coach; no session may tune them silently.
 * =======================================================================
 */

import {
  evaluateRules,
  verdictFor,
  type Finding,
  type Rule,
  type TargetRange,
  type Verdict,
} from "@/lib/kernel/rules";
import type { SwimReport } from "@/lib/sports/swimming/biomechanics";
import type { SwimDrillId } from "@/lib/sports/swimming/drills";

export { verdictFor } from "@/lib/kernel/rules";
export type { TargetRange, Verdict } from "@/lib/kernel/rules";

/** Target ranges per metric. Every number is a PLACEHOLDER (see header). */
export const SWIM_TARGETS = {
  // PLACEHOLDER: total strokes per minute (both arms). Wide by design.
  strokeRate: { low: 50, high: 80, margin: 12, unit: "spm" },
  // PLACEHOLDER: head lift at the catch, % of torso. Higher = looking
  // forward, which sinks the hips.
  headLift: { low: 0, high: 20, margin: 10, unit: "pct" },
  // PLACEHOLDER: elbow height above shoulder at recovery, % of torso. A
  // high elbow sits above; a dropped elbow is the fault (below the low end).
  elbowRecovery: { low: 10, high: 60, margin: 10, unit: "pct" },
  // PLACEHOLDER: body-roll PROXY, near-shoulder vertical travel, % of torso.
  bodyRoll: { low: 8, high: 30, margin: 8, unit: "pct" },
} as const satisfies Record<string, TargetRange>;

export type SwimTargetId = keyof typeof SWIM_TARGETS;

export type MeasuredSwim = {
  strokeRateSpm?: number;
  headLiftPct?: number;
  elbowRecoveryPct?: number;
  bodyRollPct?: number;
};

/** Merge the report into the rule snapshot (means over the cycles). */
export function extractMeasuredSwim(report?: SwimReport | null): MeasuredSwim {
  const num = (v: number | null | undefined): number | undefined =>
    v === null || v === undefined ? undefined : v;
  return {
    strokeRateSpm: num(report?.strokeRateSpm),
    headLiftPct: num(report?.headLiftPct?.mean),
    elbowRecoveryPct: num(report?.elbowRecoveryPct?.mean),
    bodyRollPct: num(report?.bodyRollPct?.mean),
  };
}

export type SwimMetricVerdict = {
  id: SwimTargetId;
  value: number;
  target: TargetRange;
  verdict: Verdict;
};

export function computeSwimVerdicts(v: MeasuredSwim): SwimMetricVerdict[] {
  const rows: Array<[SwimTargetId, number | undefined]> = [
    ["strokeRate", v.strokeRateSpm],
    ["headLift", v.headLiftPct],
    ["elbowRecovery", v.elbowRecoveryPct],
    ["bodyRoll", v.bodyRollPct],
  ];
  const out: SwimMetricVerdict[] = [];
  for (const [id, value] of rows) {
    if (value === undefined) continue;
    const target = SWIM_TARGETS[id];
    out.push({ id, value, target, verdict: verdictFor(value, target) });
  }
  return out;
}

export type SwimRule = Omit<Rule<MeasuredSwim>, "adjust"> & {
  adjust?: SwimDrillId;
};

export type SwimFinding = Omit<Finding, "adjust"> & { adjust?: SwimDrillId };

/*
 * The rule set. Confidence is LOW across the board: beta, weak proxies, one
 * camera through water. The copy never dresses these as verdicts.
 */
export const SWIM_RULES: readonly SwimRule[] = [
  {
    id: "head-high",
    description:
      "Your head reads high at the catch, looking forward rather than down. Lifting the head tends to sink the hips and legs, which is where most drag hides. This is a rough proxy from one camera.",
    condition: (v) =>
      v.headLiftPct !== undefined && v.headLiftPct > SWIM_TARGETS.headLift.high,
    recommendation: {
      action:
        "Look at the bottom of the pool, not ahead. The head-position drill below trains a neutral, waterline gaze.",
      direction: "lower gaze",
      magnitude: "none",
    },
    priority: 1,
    confidence: "low",
    adjust: "head-position",
  },
  {
    id: "dropped-elbow",
    description:
      "Your elbow reads low through the recovery, below the usual range. A higher elbow sets up a cleaner catch, though plenty of swimmers recover differently.",
    condition: (v) =>
      v.elbowRecoveryPct !== undefined &&
      v.elbowRecoveryPct < SWIM_TARGETS.elbowRecovery.low,
    recommendation: {
      action:
        "Lead the recovery with a high elbow, hand relaxed and close to the surface. The high-elbow drill below gives you the shape.",
      direction: "lift elbow",
      magnitude: "none",
    },
    priority: 2,
    confidence: "low",
    adjust: "high-elbow",
  },
  {
    id: "flat-roll",
    description:
      "Your body roll reads small, a flat stroke. Some roll lets you reach and breathe without lifting the head. This roll proxy is the weakest reading in the app, so treat it lightly.",
    condition: (v) =>
      v.bodyRollPct !== undefined && v.bodyRollPct < SWIM_TARGETS.bodyRoll.low,
    recommendation: {
      action:
        "Feel a gentle roll from hip to hip, like turning in a narrow bed. The roll drill below builds it without over-rotating.",
      direction: "roll more",
      magnitude: "gentle",
    },
    priority: 3,
    confidence: "low",
    adjust: "roll",
  },
  {
    id: "rushed-tempo",
    description:
      "Your stroke rate reads quick. A rushed catch can slip water instead of holding it; a longer, patient front end often swims easier at the same speed. Only worth touching if you feel like you are spinning.",
    condition: (v) =>
      v.strokeRateSpm !== undefined &&
      v.strokeRateSpm > SWIM_TARGETS.strokeRate.high,
    recommendation: {
      action:
        "If the stroke feels frantic, lengthen the front end with the catch-up drill below and let each hand settle before it pulls.",
      direction: "lengthen",
      magnitude: "none",
    },
    priority: 4,
    confidence: "low",
    adjust: "catch-up",
  },
];

/** Run every swim rule via the kernel engine (one change at a time). */
export function evaluateSwimRules(v: MeasuredSwim): {
  primary: SwimFinding | null;
  secondary: SwimFinding[];
  verdicts: SwimMetricVerdict[];
} {
  const { primary, secondary } = evaluateRules(
    SWIM_RULES as readonly Rule<MeasuredSwim>[],
    v,
  );
  return {
    primary: primary as SwimFinding | null,
    secondary: secondary as SwimFinding[],
    verdicts: computeSwimVerdicts(v),
  };
}
