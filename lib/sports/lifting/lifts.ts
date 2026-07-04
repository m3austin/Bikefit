/*
 * The LiftFit lift catalog: A LIFT IS A CONFIG ENTRY. Each entry wires the
 * shared extraction primitives (lib/sports/lifting/biomechanics.ts) to its
 * own tracker, event names, metrics, PLACEHOLDER targets, rules, and filming
 * cues. Adding a lift (overhead press, row, ...) means adding an entry here;
 * the engine and the UI read the registry and never name a lift themselves.
 * A vitest proves a new lift works with zero engine changes.
 *
 * ============================ PLACEHOLDERS ============================
 * EVERY numeric value in this file is a PLACEHOLDER: a reasonable-sounding
 * scaffold, NOT a sourced or validated number. Several metrics are 2D
 * PROXIES (back rounding = hip-to-shoulder chord shortening; bar = wrist or
 * shoulder). The owner replaces these with values confirmed by a strength
 * coach; no session may tune them silently.
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
import {
  backRoundingPct,
  barPathDriftPct,
  depthPct,
  heelLiftPct,
  lockoutHipDeg,
  overMidfootPct,
  setupHipHeightPct,
  torsoAtAnchorDeg,
  touchSpreadPct,
  wristOverElbowPct,
  type LiftMetricSpec,
  type LiftReport,
  type LiftTracker,
} from "@/lib/sports/lifting/biomechanics";
import type { LiftDrillId } from "@/lib/sports/lifting/drills";

export type { TargetRange, Verdict } from "@/lib/kernel/rules";

/** The measured snapshot rules reason over: metric id to across-rep value. */
export type MeasuredLift = Record<string, number | undefined>;

export type LiftRule = Omit<Rule<MeasuredLift>, "adjust"> & {
  adjust?: LiftDrillId;
};

export type LiftFinding = Omit<Finding, "adjust"> & { adjust?: LiftDrillId };

export type LiftConfig = {
  id: string;
  /** Display name, e.g. "Deadlift". */
  name: string;
  /** One-line card copy. */
  tagline: string;
  tracker: LiftTracker;
  /** Display names for the rep's two key moments. */
  anchorLabel: string;
  lockoutLabel: string;
  metrics: readonly LiftMetricSpec[];
  rules: readonly LiftRule[];
  /** Filming and setup cues shown before upload. */
  cues: readonly string[];
};

/* ------------------------------- Squat ---------------------------------- */

const SQUAT_METRICS: readonly LiftMetricSpec[] = [
  {
    id: "depth",
    label: "Depth",
    hint: "Hip crease vs knee at the bottom, % of thigh length (positive = below)",
    // PLACEHOLDER: 0 = parallel; anywhere at or below parallel is in range.
    target: { low: 0, high: 60, margin: 8, unit: "pct" },
    extract: depthPct,
  },
  {
    id: "torsoAtBottom",
    label: "Torso angle at the bottom",
    hint: "Lean from vertical; low-bar sits higher, high-bar lower",
    // PLACEHOLDER: a wide band on purpose; bar position moves it a lot.
    target: { low: 25, high: 60, margin: 10, unit: "deg" },
    extract: torsoAtAnchorDeg,
  },
  {
    id: "heelLift",
    label: "Heel lift",
    hint: "Heel rise at the bottom, % of foot length",
    // PLACEHOLDER: heels should stay planted.
    target: { low: 0, high: 12, margin: 6, unit: "pct" },
    extract: heelLiftPct,
  },
  {
    id: "barOverMidfoot",
    label: "Balance (bar over midfoot)",
    hint: "Shoulder (bar proxy) vs midfoot at the bottom, % of foot length",
    // PLACEHOLDER: near zero = balanced; positive = toward the toes.
    target: { low: -20, high: 20, margin: 10, unit: "pct" },
    extract: (rep) => overMidfootPct(rep.anchor.shoulder, rep.anchor, rep.forwardSign),
  },
];

const SQUAT_RULES: readonly LiftRule[] = [
  {
    id: "heels-lifting",
    description:
      "Your heels rise off the floor at the bottom, which puts the weight on your toes and your balance at risk.",
    condition: (v) => {
      const t = SQUAT_TARGETS.heelLift;
      return v.heelLift !== undefined && t !== undefined && v.heelLift > t.high;
    },
    recommendation: {
      action:
        "Keep the whole foot planted. Work the heels-down drill empty before adding the bar back.",
      direction: "plant",
      magnitude: "none",
    },
    priority: 1,
    confidence: "medium",
    adjust: "heels-down",
  },
  {
    id: "balance-forward",
    description:
      "The bar reads ahead of your midfoot at the bottom, loading your toes instead of your whole foot.",
    condition: (v) => {
      const t = SQUAT_TARGETS.barOverMidfoot;
      return (
        v.barOverMidfoot !== undefined &&
        t !== undefined &&
        v.barOverMidfoot > t.high
      );
    },
    recommendation: {
      action:
        "Sit back a touch as you descend so the bar stays over your midfoot. The box drill gives you the feel.",
      direction: "sit back",
      magnitude: "a touch",
    },
    priority: 2,
    confidence: "medium",
    adjust: "box-depth",
  },
  {
    id: "above-parallel",
    description:
      "Your squat reads above parallel at the bottom. If depth is a goal of yours, it is trainable; if it is not, this is only a note.",
    condition: (v) => {
      const t = SQUAT_TARGETS.depth;
      return v.depth !== undefined && t !== undefined && v.depth < t.low;
    },
    recommendation: {
      action:
        "Build depth with the box drill at light weight; lower the box as the position becomes yours.",
      direction: "deepen",
      magnitude: "gradually",
    },
    priority: 3,
    confidence: "medium",
    adjust: "box-depth",
  },
];

/* ------------------------------- Bench ---------------------------------- */

const BENCH_METRICS: readonly LiftMetricSpec[] = [
  {
    id: "wristOverElbow",
    label: "Wrist over elbow",
    hint: "Horizontal wrist-to-elbow offset at the chest, % of forearm (0 = stacked)",
    // PLACEHOLDER: stacked is strong; a large offset bleeds pressing force.
    target: { low: 0, high: 15, margin: 8, unit: "pct" },
    extract: wristOverElbowPct,
  },
  {
    id: "touchSpread",
    label: "Touch-point consistency",
    hint: "Spread of where the bar meets your chest across reps, % of forearm",
    // PLACEHOLDER: tight is skilled.
    target: { low: 0, high: 10, margin: 6, unit: "pct" },
    extract: () => null,
    across: touchSpreadPct,
  },
  {
    id: "barPath",
    label: "Bar path travel",
    hint: "Horizontal bar travel within a rep, % of torso length; a shallow arc is normal",
    // PLACEHOLDER: zero is not the goal; a straight vertical bench is rare.
    target: { low: 5, high: 35, margin: 10, unit: "pct" },
    extract: barPathDriftPct,
  },
];

const BENCH_RULES: readonly LiftRule[] = [
  {
    id: "wrist-not-stacked",
    description:
      "Your wrist reads offset from your elbow at the chest, which bleeds pressing force through the forearm angle.",
    condition: (v) => {
      const t = BENCH_TARGETS.wristOverElbow;
      return (
        v.wristOverElbow !== undefined &&
        t !== undefined &&
        v.wristOverElbow > t.high
      );
    },
    recommendation: {
      action:
        "Adjust your grip width so the wrist stacks over the elbow at the chest, then groove it with the bench drill.",
      direction: "stack",
      magnitude: "none",
    },
    priority: 1,
    confidence: "medium",
    adjust: "bench-groove",
  },
  {
    id: "touch-wandering",
    description:
      "The bar meets your chest in a different spot from rep to rep. Consistency is the skill that lets the weight go up.",
    condition: (v) => {
      const t = BENCH_TARGETS.touchSpread;
      return (
        v.touchSpread !== undefined && t !== undefined && v.touchSpread > t.high
      );
    },
    recommendation: {
      action:
        "Lighten the bar and press ten reps watching only the touch point. Same spot, every rep.",
      direction: "groove",
      magnitude: "none",
    },
    priority: 2,
    confidence: "medium",
    adjust: "bench-groove",
  },
];

/* ------------------------------ Deadlift -------------------------------- */

const DEADLIFT_METRICS: readonly LiftMetricSpec[] = [
  {
    id: "backRounding",
    label: "Back rounding (proxy)",
    hint: "Hip-to-shoulder shortening vs your setup, % (bigger = more rounding)",
    // PLACEHOLDER: the marquee safety metric. A 2D proxy: it reads the
    // straight-line torso chord, not the spine itself.
    target: { low: 0, high: 8, margin: 4, unit: "pct" },
    extract: backRoundingPct,
  },
  {
    id: "setupHipHeight",
    label: "Hip height at setup",
    hint: "Hips between knee (0) and shoulder (100) at the start of the pull",
    // PLACEHOLDER: deliberately wide; leg length moves this a lot.
    target: { low: 25, high: 65, margin: 10, unit: "pct" },
    extract: setupHipHeightPct,
  },
  {
    id: "barOverMidfoot",
    label: "Bar over midfoot at setup",
    hint: "Wrist (bar proxy) vs midfoot at setup, % of foot length",
    // PLACEHOLDER: over the midfoot is the strong start.
    target: { low: -15, high: 15, margin: 8, unit: "pct" },
    extract: (rep) => overMidfootPct(rep.anchor.wrist, rep.anchor, rep.forwardSign),
  },
  {
    id: "lockout",
    label: "Lockout",
    hint: "Hip opening at the top (180 = fully open)",
    // PLACEHOLDER: a finished pull stands tall.
    target: { low: 160, high: 180, margin: 8, unit: "deg" },
    extract: lockoutHipDeg,
  },
];

const DEADLIFT_RULES: readonly LiftRule[] = [
  {
    id: "back-rounding",
    description:
      "Your back reads as rounding during the pull, the one finding in this app to take most seriously. This is a 2D proxy, but it errs on the side of caution on purpose.",
    condition: (v) => {
      const t = DEADLIFT_TARGETS.backRounding;
      return (
        v.backRounding !== undefined &&
        t !== undefined &&
        v.backRounding > t.high
      );
    },
    recommendation: {
      action:
        "Lower the weight now and rebuild from the brace: the brace-and-hinge drill, light, fresh, filmed. If rounding persists at light weight, see a coach or physiotherapist before pulling again.",
      direction: "lighten and rebuild",
      magnitude: "now",
    },
    priority: 1,
    confidence: "medium",
    adjust: "brace-and-hinge",
  },
  {
    id: "bar-away-from-body",
    description:
      "The bar reads ahead of your midfoot at setup, which makes every rep start with a lever working against your back.",
    condition: (v) => {
      const t = DEADLIFT_TARGETS.barOverMidfoot;
      return (
        v.barOverMidfoot !== undefined &&
        t !== undefined &&
        v.barOverMidfoot > t.high
      );
    },
    recommendation: {
      action:
        "Set up with the bar over your midfoot, shins close. Walk through the setup-height drill before your next session.",
      direction: "bring closer",
      magnitude: "none",
    },
    priority: 2,
    confidence: "medium",
    adjust: "setup-height",
  },
  {
    id: "hips-out-of-range",
    description:
      "Your hips read outside the usual setup band: very high turns the pull stiff-legged, very low turns it into a squat and drags the bar forward.",
    condition: (v) => {
      const t = DEADLIFT_TARGETS.setupHipHeight;
      return (
        v.setupHipHeight !== undefined &&
        t !== undefined &&
        (v.setupHipHeight < t.low || v.setupHipHeight > t.high)
      );
    },
    recommendation: {
      action:
        "Find your own setup height with the drill below: shins to the bar, back flat, and start from wherever your hips land.",
      direction: "reset",
      magnitude: "none",
    },
    priority: 3,
    confidence: "low",
    adjust: "setup-height",
  },
  {
    id: "incomplete-lockout",
    description:
      "Your hips read short of fully open at the top: reps are finishing before you are standing tall.",
    condition: (v) => {
      const t = DEADLIFT_TARGETS.lockout;
      return v.lockout !== undefined && t !== undefined && v.lockout < t.low;
    },
    recommendation: {
      action:
        "Finish every rep: hips through, squeeze, stand tall for a beat. The lockout drill makes it a habit.",
      direction: "finish",
      magnitude: "none",
    },
    priority: 3,
    confidence: "medium",
    adjust: "lockout-finish",
  },
];

/* ------------------------------ Registry -------------------------------- */

const targetsOf = (
  metrics: readonly LiftMetricSpec[],
): Record<string, TargetRange> =>
  Object.fromEntries(metrics.map((m) => [m.id, m.target]));

const SQUAT_TARGETS = targetsOf(SQUAT_METRICS);
const BENCH_TARGETS = targetsOf(BENCH_METRICS);
const DEADLIFT_TARGETS = targetsOf(DEADLIFT_METRICS);

export const LIFTS: readonly LiftConfig[] = [
  {
    id: "squat",
    name: "Back squat",
    tagline: "Depth, balance, and heels, read from the side.",
    tracker: "hip",
    anchorLabel: "bottom",
    lockoutLabel: "lockout",
    metrics: SQUAT_METRICS,
    rules: SQUAT_RULES,
    cues: [
      "Side on, whole body in frame including the bar and your feet.",
      "Film a working set of two or more reps, lighter than your top set.",
      "Camera still: tripod, bench, or a propped phone.",
    ],
  },
  {
    id: "bench",
    name: "Bench press",
    tagline: "Touch point, wrist stack, and bar path.",
    tracker: "wrist",
    anchorLabel: "chest touch",
    lockoutLabel: "lockout",
    metrics: BENCH_METRICS,
    rules: BENCH_RULES,
    cues: [
      "Side on, level with the bench, whole bar path in frame.",
      "Two or more reps. NEVER bench heavy alone without pins or a spotter.",
      "Camera still: tripod, box, or a propped phone.",
    ],
  },
  {
    id: "deadlift",
    name: "Deadlift",
    tagline: "The back reading. Take this one seriously.",
    tracker: "hip",
    anchorLabel: "setup",
    lockoutLabel: "lockout",
    metrics: DEADLIFT_METRICS,
    rules: DEADLIFT_RULES,
    cues: [
      "Side on, whole body and the bar in frame, feet visible.",
      "Film every rep from floor to lockout; two or more reps.",
      "Film your lighter sets too: rounding often starts before the top set.",
    ],
  },
];

export function getLift(id: string): LiftConfig | undefined {
  return LIFTS.find((l) => l.id === id);
}

/* ----------------------------- Evaluation ------------------------------- */

export type LiftMetricVerdict = {
  id: string;
  label: string;
  hint: string;
  value: number;
  target: TargetRange;
  verdict: Verdict;
};

/** The measured snapshot from a report: metric id to across-rep value. */
export function extractMeasuredLift(report: LiftReport): MeasuredLift {
  const out: MeasuredLift = {};
  for (const m of report.metrics) {
    if (m.value !== null) out[m.id] = m.value;
  }
  return out;
}

/** Run the lift's own rules and verdict every measured metric. */
export function evaluateLift(
  config: LiftConfig,
  report: LiftReport,
): {
  primary: LiftFinding | null;
  secondary: LiftFinding[];
  verdicts: LiftMetricVerdict[];
} {
  const measured = extractMeasuredLift(report);
  const { primary, secondary } = evaluateRules(
    config.rules as readonly Rule<MeasuredLift>[],
    measured,
  );
  const verdicts: LiftMetricVerdict[] = [];
  for (const spec of config.metrics) {
    const value = measured[spec.id];
    if (value === undefined) continue;
    verdicts.push({
      id: spec.id,
      label: spec.label,
      hint: spec.hint,
      value,
      target: spec.target,
      verdict: verdictFor(value, spec.target),
    });
  }
  return {
    primary: primary as LiftFinding | null,
    secondary: secondary as LiftFinding[],
    verdicts,
  };
}
