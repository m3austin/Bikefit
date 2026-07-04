/*
 * GolfFit swing rules: targets, measured-value extraction, verdicts, and the
 * rule list, on the kernel rules engine (one change at a time).
 *
 * ============================ PLACEHOLDERS ============================
 * EVERY numeric value in this file is a PLACEHOLDER: a reasonable-sounding
 * scaffold, NOT a sourced or validated number. Several metrics are 2D
 * PROXIES (turn = apparent-width shrink on a face-on view), which is why
 * their rules carry low confidence. The owner replaces these with values
 * confirmed by a golf professional; no session may tune them silently.
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
import type { GolfDrillId } from "@/lib/sports/golf/drills";
import type { SwingReport } from "@/lib/sports/golf/biomechanics";

export { verdictFor } from "@/lib/kernel/rules";
export type { TargetRange, Verdict } from "@/lib/kernel/rules";

/** Target ranges per metric. Every number is a PLACEHOLDER (see header). */
export const GOLF_TARGETS = {
  // PLACEHOLDER: backswing-to-downswing time ratio; smooth swings sit near 3.
  tempo: { low: 2.2, high: 3.6, margin: 0.4, unit: "ratio" },
  // PLACEHOLDER: max change in spine lean through the swing, degrees (DTL).
  spineChange: { low: 0, high: 8, margin: 4, unit: "deg" },
  // PLACEHOLDER: max head drift from address, percent of torso length.
  headDrift: { low: 0, high: 15, margin: 8, unit: "pct" },
  // PLACEHOLDER: shoulder turn PROXY at the top (apparent-width shrink, %).
  shoulderTurn: { low: 30, high: 70, margin: 10, unit: "pct" },
  // PLACEHOLDER: hip turn PROXY at the top (apparent-width shrink, %).
  hipTurn: { low: 10, high: 45, margin: 10, unit: "pct" },
  // PLACEHOLDER: max lateral hip slide, percent of hip width (face-on).
  hipSlide: { low: 0, high: 20, margin: 10, unit: "pct" },
  // PLACEHOLDER: lead-arm elbow angle at the top, degrees (face-on).
  leadArmAtTop: { low: 150, high: 180, margin: 10, unit: "deg" },
} as const satisfies Record<string, TargetRange>;

export type GolfTargetId = keyof typeof GOLF_TARGETS;

/** The flattened snapshot the rules reason over. Undefined = not measured. */
export type MeasuredSwing = {
  tempoRatio?: number;
  spineChangeDeg?: number;
  headDriftPct?: number;
  shoulderTurnPct?: number;
  hipTurnPct?: number;
  hipSlidePct?: number;
  leadArmAtTopDeg?: number;
};

/**
 * Merge up to two view reports into one snapshot. DTL owns spine and is
 * preferred for tempo and head drift; face-on owns the turn proxies, slide,
 * and lead arm.
 */
export function extractMeasuredSwing(
  dtl?: SwingReport | null,
  face?: SwingReport | null,
): MeasuredSwing {
  const num = (v: number | null | undefined): number | undefined =>
    v === null || v === undefined ? undefined : v;
  return {
    tempoRatio: num(dtl?.tempoRatio) ?? num(face?.tempoRatio),
    spineChangeDeg: num(dtl?.spineChangeDeg),
    headDriftPct: num(dtl?.headDriftPct) ?? num(face?.headDriftPct),
    shoulderTurnPct: num(face?.shoulderTurnPct),
    hipTurnPct: num(face?.hipTurnPct),
    hipSlidePct: num(face?.hipSlidePct),
    leadArmAtTopDeg: num(face?.leadArmAtTopDeg),
  };
}

/** One metric's measured value against its target, for the verdict cards. */
export type GolfMetricVerdict = {
  id: GolfTargetId;
  value: number;
  target: TargetRange;
  verdict: Verdict;
};

/** Verdicts for every metric that was actually measured, in display order. */
export function computeGolfVerdicts(v: MeasuredSwing): GolfMetricVerdict[] {
  const rows: Array<[GolfTargetId, number | undefined]> = [
    ["tempo", v.tempoRatio],
    ["spineChange", v.spineChangeDeg],
    ["headDrift", v.headDriftPct],
    ["shoulderTurn", v.shoulderTurnPct],
    ["hipTurn", v.hipTurnPct],
    ["hipSlide", v.hipSlidePct],
    ["leadArmAtTop", v.leadArmAtTopDeg],
  ];
  const out: GolfMetricVerdict[] = [];
  for (const [id, value] of rows) {
    if (value === undefined) continue;
    const target = GOLF_TARGETS[id];
    out.push({ id, value, target, verdict: verdictFor(value, target) });
  }
  return out;
}

/** A golf rule: the kernel shape with typed drill links. */
export type GolfRule = Omit<Rule<MeasuredSwing>, "adjust"> & {
  adjust?: GolfDrillId;
};

/** A triggered golf finding, with the drill link typed. */
export type GolfFinding = Omit<Finding, "adjust"> & { adjust?: GolfDrillId };

/*
 * The rule set. Conditions read the PLACEHOLDER targets above. Order within
 * a priority level is the tie-break (deterministic).
 */
export const GOLF_RULES: readonly GolfRule[] = [
  {
    id: "spine-angle-loss",
    description:
      "Your spine angle changes more than the target between address and impact, the classic stand-up move that costs contact.",
    condition: (v) =>
      v.spineChangeDeg !== undefined &&
      v.spineChangeDeg > GOLF_TARGETS.spineChange.high,
    recommendation: {
      action:
        "Work on holding your address tilt through the strike. Start with the chair drill below.",
      direction: "hold",
      magnitude: "none",
    },
    priority: 1,
    confidence: "medium",
    adjust: "posture",
  },
  {
    id: "head-drift",
    description:
      "Your head moves further from its address position than the target during the swing.",
    condition: (v) =>
      v.headDriftPct !== undefined &&
      v.headDriftPct > GOLF_TARGETS.headDrift.high,
    recommendation: {
      action:
        "Quiet the head: swing while keeping your eyes level and your nose roughly over the same spot.",
      direction: "steady",
      magnitude: "none",
    },
    priority: 2,
    confidence: "medium",
    adjust: "head-still",
  },
  {
    id: "tempo-quick",
    description:
      "Your downswing starts faster than the target ratio; rushed transitions cost sequence and strike.",
    condition: (v) =>
      v.tempoRatio !== undefined && v.tempoRatio < GOLF_TARGETS.tempo.low,
    recommendation: {
      action:
        "Slow the transition, not the swing: count the tempo drill below and let the club fall before you fire.",
      direction: "smooth",
      magnitude: "none",
    },
    priority: 2,
    confidence: "medium",
    adjust: "tempo",
  },
  {
    id: "hip-slide",
    description:
      "Your hips slide sideways past the target instead of turning, which drains power and consistency.",
    condition: (v) =>
      v.hipSlidePct !== undefined && v.hipSlidePct > GOLF_TARGETS.hipSlide.high,
    recommendation: {
      action:
        "Turn instead of sway: try the bump drill with a stick or bag just outside your lead hip.",
      direction: "turn",
      magnitude: "none",
    },
    priority: 3,
    confidence: "medium",
    adjust: "bump",
  },
  {
    id: "shoulder-turn-short",
    description:
      "Your shoulder turn at the top reads shorter than the target. This is a 2D proxy, so treat it as a hint, not a ruling.",
    condition: (v) =>
      v.shoulderTurnPct !== undefined &&
      v.shoulderTurnPct < GOLF_TARGETS.shoulderTurn.low,
    recommendation: {
      action:
        "Feel a fuller turn: chest away from the target at the top. The turn drill below gives you a reference.",
      direction: "turn",
      magnitude: "none",
    },
    priority: 4,
    confidence: "low",
    adjust: "turn",
  },
  {
    id: "lead-arm-bent",
    description:
      "Your lead arm reads more bent at the top than the target. Plenty of good golfers play from there, so this is a note, not a problem.",
    condition: (v) =>
      v.leadArmAtTopDeg !== undefined &&
      v.leadArmAtTopDeg < GOLF_TARGETS.leadArmAtTop.low,
    recommendation: {
      action:
        "If your strikes feel inconsistent, try the structure drill for a wider, calmer backswing. If you strike it fine, carry on.",
      direction: "widen",
      magnitude: "none",
    },
    priority: 5,
    confidence: "low",
    adjust: "structure",
  },
  {
    id: "tempo-slow",
    description:
      "Your tempo ratio reads above the target, a very deliberate backswing. Only worth touching if strikes feel stalled.",
    condition: (v) =>
      v.tempoRatio !== undefined && v.tempoRatio > GOLF_TARGETS.tempo.high,
    recommendation: {
      action:
        "If shots feel weak or steery, try the tempo drill to blend the backswing into the downswing.",
      direction: "smooth",
      magnitude: "none",
    },
    priority: 5,
    confidence: "low",
    adjust: "tempo",
  },
];

/** Run every golf rule via the kernel engine (one change at a time). */
export function evaluateGolfRules(v: MeasuredSwing): {
  primary: GolfFinding | null;
  secondary: GolfFinding[];
  verdicts: GolfMetricVerdict[];
} {
  const { primary, secondary } = evaluateRules(
    GOLF_RULES as readonly Rule<MeasuredSwing>[],
    v,
  );
  return {
    primary: primary as GolfFinding | null,
    secondary: secondary as GolfFinding[],
    verdicts: computeGolfVerdicts(v),
  };
}
