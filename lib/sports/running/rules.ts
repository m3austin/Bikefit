/*
 * RunFit gait rules: targets, measured-value extraction, verdicts, and the
 * rule list, on the kernel rules engine (one change at a time). Cadence is
 * the hero metric (doc 02 section 1): the most cited, most changeable number
 * in gait retraining.
 *
 * ============================ PLACEHOLDERS ============================
 * EVERY numeric value in this file is a PLACEHOLDER: a reasonable-sounding
 * scaffold, NOT a sourced or validated number. Several metrics are 2D
 * PROXIES from one camera. The owner replaces these with values confirmed
 * by a running coach or physiotherapist; no session may tune them silently.
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
import type { GaitReport, RearGaitReport } from "@/lib/sports/running/biomechanics";
import type { RunDrillId } from "@/lib/sports/running/drills";

export { verdictFor } from "@/lib/kernel/rules";
export type { TargetRange, Verdict } from "@/lib/kernel/rules";

/** Target ranges per metric. Every number is a PLACEHOLDER (see header). */
export const RUN_TARGETS = {
  // PLACEHOLDER: steps per minute, both feet. The famous 180 is a ceiling
  // story, not a law; the band is deliberately wide.
  cadence: { low: 160, high: 190, margin: 10, unit: "spm" },
  // PLACEHOLDER: foot ahead of hip at contact, percent of leg length.
  overstride: { low: 0, high: 25, margin: 8, unit: "pct" },
  // PLACEHOLDER: knee flexion from straight at contact, degrees. A dead
  // straight landing leg (near 0) is the risk end.
  kneeFlexAtContact: { low: 10, high: 30, margin: 5, unit: "deg" },
  // PLACEHOLDER: per-stride hip vertical travel, percent of leg length.
  verticalOscillation: { low: 0, high: 10, margin: 3, unit: "pct" },
  // PLACEHOLDER: trunk lean from vertical, degrees. A touch of forward lean
  // from the ankles, not a fold at the waist.
  trunkLean: { low: 2, high: 10, margin: 4, unit: "deg" },
  // PLACEHOLDER: peak contralateral pelvic drop, percent of hip width (rear).
  pelvicDrop: { low: 0, high: 12, margin: 5, unit: "pct" },
} as const satisfies Record<string, TargetRange>;

export type RunTargetId = keyof typeof RUN_TARGETS;

/** The flattened snapshot the rules reason over. Undefined = not measured. */
export type MeasuredGait = {
  cadenceSpm?: number;
  overstridePct?: number;
  kneeFlexAtContactDeg?: number;
  verticalOscillationPct?: number;
  trunkLeanDeg?: number;
  pelvicDropPct?: number;
};

/**
 * Merge the side and rear reports into one snapshot. The side view owns
 * everything sagittal; the rear view owns pelvic drop (the worse stance side
 * is the one worth talking about). Cadence prefers the side view.
 */
export function extractMeasuredGait(
  side?: GaitReport | null,
  rear?: RearGaitReport | null,
): MeasuredGait {
  const num = (v: number | null | undefined): number | undefined =>
    v === null || v === undefined ? undefined : v;
  const leftDrop = num(rear?.pelvicDropLeftStancePct?.mean);
  const rightDrop = num(rear?.pelvicDropRightStancePct?.mean);
  const pelvicDropPct =
    leftDrop !== undefined || rightDrop !== undefined
      ? Math.max(leftDrop ?? -Infinity, rightDrop ?? -Infinity)
      : undefined;
  return {
    cadenceSpm: num(side?.cadenceSpm) ?? num(rear?.cadenceSpm),
    overstridePct: num(side?.overstridePct?.mean),
    kneeFlexAtContactDeg: num(side?.kneeFlexAtContactDeg?.mean),
    verticalOscillationPct: num(side?.verticalOscillationPct?.mean),
    trunkLeanDeg: num(side?.trunkLeanDeg?.mean),
    pelvicDropPct,
  };
}

/** One metric's measured value against its target, for the verdict cards. */
export type RunMetricVerdict = {
  id: RunTargetId;
  value: number;
  target: TargetRange;
  verdict: Verdict;
};

/** Verdicts for every metric that was actually measured, in display order.
 * Cadence first: it is the hero metric. */
export function computeRunVerdicts(v: MeasuredGait): RunMetricVerdict[] {
  const rows: Array<[RunTargetId, number | undefined]> = [
    ["cadence", v.cadenceSpm],
    ["overstride", v.overstridePct],
    ["kneeFlexAtContact", v.kneeFlexAtContactDeg],
    ["verticalOscillation", v.verticalOscillationPct],
    ["trunkLean", v.trunkLeanDeg],
    ["pelvicDrop", v.pelvicDropPct],
  ];
  const out: RunMetricVerdict[] = [];
  for (const [id, value] of rows) {
    if (value === undefined) continue;
    const target = RUN_TARGETS[id];
    out.push({ id, value, target, verdict: verdictFor(value, target) });
  }
  return out;
}

/** A running rule: the kernel shape with typed drill links. */
export type RunRule = Omit<Rule<MeasuredGait>, "adjust"> & {
  adjust?: RunDrillId;
};

/** A triggered running finding, with the drill link typed. */
export type RunFinding = Omit<Finding, "adjust"> & { adjust?: RunDrillId };

/*
 * The rule set. Conditions read the PLACEHOLDER targets above. Order within
 * a priority level is the tie-break (deterministic). Foot strike never
 * appears here: it is reported, not judged.
 */
export const RUN_RULES: readonly RunRule[] = [
  {
    id: "cadence-low",
    description:
      "Your cadence reads below the target band. A slightly quicker, shorter step is the single highest-value change in gait retraining.",
    condition: (v) =>
      v.cadenceSpm !== undefined && v.cadenceSpm < RUN_TARGETS.cadence.low,
    recommendation: {
      action:
        "Nudge your cadence up around five percent, not more, using the metronome drill below. Shorter steps, same effort.",
      direction: "quicken",
      magnitude: "about 5 percent",
    },
    priority: 1,
    confidence: "medium",
    adjust: "cadence",
  },
  {
    id: "overstride",
    description:
      "Your foot lands further ahead of your hips than the target, which acts like a small brake on every step.",
    condition: (v) =>
      v.overstridePct !== undefined &&
      v.overstridePct > RUN_TARGETS.overstride.high,
    recommendation: {
      action:
        "Practice landing with your foot closer to under your body. The wall drill below gives you the feel; a cadence nudge usually helps too.",
      direction: "land closer",
      magnitude: "none",
    },
    priority: 2,
    confidence: "medium",
    adjust: "land-under-hips",
  },
  {
    id: "knee-straight-at-contact",
    description:
      "Your knee reads nearly straight at contact, below the target flexion band. A softer knee at landing absorbs load your joints otherwise take directly.",
    condition: (v) =>
      v.kneeFlexAtContactDeg !== undefined &&
      v.kneeFlexAtContactDeg < RUN_TARGETS.kneeFlexAtContact.low,
    recommendation: {
      action:
        "Think soft landings: a slightly bent knee as the foot touches down. The quiet-feet drill below trains it without overthinking.",
      direction: "soften",
      magnitude: "none",
    },
    priority: 2,
    confidence: "medium",
    adjust: "soft-steps",
  },
  {
    id: "trunk-lean-excess",
    description:
      "Your trunk leans further forward than the target, a fold at the waist rather than a lean from the ankles.",
    condition: (v) =>
      v.trunkLeanDeg !== undefined &&
      v.trunkLeanDeg > RUN_TARGETS.trunkLean.high,
    recommendation: {
      action:
        "Run tall: length through the spine, slight whole-body lean from the ankles. The posture drill below resets the feel.",
      direction: "straighten",
      magnitude: "none",
    },
    priority: 3,
    confidence: "medium",
    adjust: "posture",
  },
  {
    id: "trunk-upright",
    description:
      "Your trunk reads close to dead vertical, below the target lean. Many strong runners sit here; it only matters if you also overstride.",
    condition: (v) =>
      v.trunkLeanDeg !== undefined &&
      v.trunkLeanDeg < RUN_TARGETS.trunkLean.low,
    recommendation: {
      action:
        "If your landings also read out front, try a slight whole-body lean from the ankles with the posture drill below. Otherwise, carry on.",
      direction: "lean",
      magnitude: "slight",
    },
    priority: 4,
    confidence: "low",
    adjust: "posture",
  },
  {
    id: "vertical-oscillation-high",
    description:
      "Your body bounces more than the target each step, energy spent going up instead of forward.",
    condition: (v) =>
      v.verticalOscillationPct !== undefined &&
      v.verticalOscillationPct > RUN_TARGETS.verticalOscillation.high,
    recommendation: {
      action:
        "Think forward, not up: quicker, quieter steps flatten the bounce. Start with the quiet-feet drill below.",
      direction: "flatten",
      magnitude: "none",
    },
    priority: 4,
    confidence: "low",
    adjust: "soft-steps",
  },
  {
    id: "pelvic-drop",
    description:
      "Your free-side hip dips more than the target while the other leg is on the ground, which often points at hip strength rather than technique.",
    condition: (v) =>
      v.pelvicDropPct !== undefined &&
      v.pelvicDropPct > RUN_TARGETS.pelvicDrop.high,
    recommendation: {
      action:
        "Add the hip strength work below a few times a week. This one responds to strength, not cues, so give it weeks rather than days.",
      direction: "strengthen",
      magnitude: "none",
    },
    priority: 4,
    confidence: "low",
    adjust: "hip-strength",
  },
  {
    id: "cadence-high",
    description:
      "Your cadence reads above the target band. That is rarely a problem by itself; only worth a look if your stride feels choppy or effortful.",
    condition: (v) =>
      v.cadenceSpm !== undefined && v.cadenceSpm > RUN_TARGETS.cadence.high,
    recommendation: {
      action:
        "If running feels choppy, let your stride open up a touch and relax. If it feels fine, this is just a number.",
      direction: "relax",
      magnitude: "none",
    },
    priority: 5,
    confidence: "low",
    adjust: "cadence",
  },
];

/** Run every gait rule via the kernel engine (one change at a time). */
export function evaluateRunRules(v: MeasuredGait): {
  primary: RunFinding | null;
  secondary: RunFinding[];
  verdicts: RunMetricVerdict[];
} {
  const { primary, secondary } = evaluateRules(
    RUN_RULES as readonly Rule<MeasuredGait>[],
    v,
  );
  return {
    primary: primary as RunFinding | null,
    secondary: secondary as RunFinding[],
    verdicts: computeRunVerdicts(v),
  };
}
