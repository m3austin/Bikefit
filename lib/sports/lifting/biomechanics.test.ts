import { describe, expect, it } from "vitest";

import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  buildLiftReport,
  MIN_REPS_FOR_REPORT,
  wristOverElbowPct,
  barPathDriftPct,
  type LiftMetricSpec,
} from "@/lib/sports/lifting/biomechanics";
import { evaluateLift, getLift, type LiftConfig } from "@/lib/sports/lifting/lifts";
import { LANDMARK, type PoseFrame } from "@/lib/pose-model";

/** A 33-landmark frame from a sparse map; unspecified joints are invisible. */
function frameWithPoints(
  points: Partial<Record<number, { x: number; y: number; visibility?: number }>>,
): PoseFrame {
  return Array.from({ length: 33 }, (_, i) => {
    const p = points[i];
    return p
      ? { x: p.x, y: p.y, z: 0, visibility: p.visibility ?? 1 }
      : { x: 0, y: 0, z: 0, visibility: 0 };
  });
}

const TWO_PI = Math.PI * 2;

/**
 * Phase generator for a set of reps with per-rep periods (so fatigue drift
 * is a knob). Yields [tMs, u] where u runs 1 at each anchor (lowest point)
 * and 0 at the lockout between. Anchors sit at integer phases 0..N-1 for N
 * periods (so N periods = N anchors = N-1 reps), with half a cycle of
 * lead-in and tail so no anchor lands on a series edge. Anchor k to anchor
 * k+1 takes exactly periodsMs[k].
 */
function* repPhases(
  periodsMs: readonly number[],
  fps = 30,
): Generator<[number, number]> {
  const dt = 1000 / fps;
  const lastIdx = periodsMs.length - 1;
  let t = 0;
  let phase = -0.5;
  while (phase <= lastIdx + 0.5 + 1e-9) {
    yield [t, 0.5 + 0.5 * Math.cos(TWO_PI * phase)];
    const idx = Math.min(lastIdx, Math.max(0, Math.floor(phase)));
    t += dt;
    phase += dt / (periodsMs[idx] ?? 2400);
  }
}

/**
 * A synthetic side-on back squat, LEFT side to the camera. u = 1 at the
 * bottom. The hips travel down AND back; the torso leans as they do, which
 * keeps the shoulder (bar proxy) over the midfoot like a real squat.
 */
function syntheticSquat(opts: {
  periodsMs?: readonly number[];
  heelLiftY?: number;
  hipBackX?: number;
} = {}): TimedFrame[] {
  const {
    periodsMs = [2400, 2400, 2400],
    heelLiftY = 0,
    hipBackX = 0.19,
  } = opts;
  const KNEE = { x: 0.5, y: 0.62 };
  const ANKLE = { x: 0.5, y: 0.85 };
  const HEEL = { x: 0.48, y: 0.88 };
  const FOOT = { x: 0.55, y: 0.88 };
  const TORSO = 0.3;

  const frames: TimedFrame[] = [];
  for (const [t, u] of repPhases(periodsMs)) {
    const hip = { x: 0.5 - hipBackX * u, y: 0.45 + 0.21 * u };
    const thetaDeg = 5 + 35 * u;
    const theta = (thetaDeg * Math.PI) / 180;
    const shoulder = {
      x: hip.x + TORSO * Math.sin(theta),
      y: hip.y - TORSO * Math.cos(theta),
    };
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.LEFT_SHOULDER]: shoulder,
        [LANDMARK.LEFT_HIP]: hip,
        [LANDMARK.LEFT_KNEE]: KNEE,
        [LANDMARK.LEFT_ANKLE]: ANKLE,
        [LANDMARK.LEFT_HEEL]: { x: HEEL.x, y: HEEL.y - heelLiftY * u },
        [LANDMARK.LEFT_FOOT_INDEX]: FOOT,
      }),
    });
  }
  return frames;
}

/** A synthetic side-on bench press: the wrist cycles lockout to chest. */
function syntheticBench(opts: {
  stackOffsetX?: number;
  arcX?: number;
} = {}): TimedFrame[] {
  const { stackOffsetX = 0, arcX = 0.06 } = opts;
  const frames: TimedFrame[] = [];
  for (const [t, u] of repPhases([2400, 2400, 2400])) {
    // u = 1 at the chest touch. The bar drifts toward the feet as it lowers
    // (the shallow arc), and the elbow hangs under the wrist at the touch.
    const wrist = { x: 0.55 + arcX * (1 - u), y: 0.3 + 0.25 * u };
    const elbow = { x: wrist.x - stackOffsetX, y: wrist.y + 0.18 };
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.LEFT_SHOULDER]: { x: 0.62, y: 0.58 },
        [LANDMARK.LEFT_ELBOW]: elbow,
        [LANDMARK.LEFT_WRIST]: wrist,
        [LANDMARK.LEFT_HIP]: { x: 0.92, y: 0.6 },
      }),
    });
  }
  return frames;
}

/**
 * A synthetic side-on deadlift. u = 1 at the setup (bar on floor). The
 * rounding knob shortens the hip-to-shoulder chord mid-pull, peaking halfway.
 */
function syntheticDeadlift(opts: { roundingFrac?: number } = {}): TimedFrame[] {
  const { roundingFrac = 0.02 } = opts;
  const KNEE = { x: 0.5, y: 0.7 };
  const ANKLE = { x: 0.5, y: 0.85 };
  const HEEL = { x: 0.48, y: 0.88 };
  const FOOT = { x: 0.55, y: 0.88 };
  const MIDFOOT_X = (HEEL.x + FOOT.x) / 2;
  const TORSO = 0.3;

  const frames: TimedFrame[] = [];
  for (const [t, u] of repPhases([2400, 2400, 2400])) {
    const p = 1 - u; // pull progress: 0 at setup, 1 at lockout
    const hip = { x: 0.5, y: 0.42 + 0.18 * u };
    const thetaDeg = 5 + 45 * u;
    const theta = (thetaDeg * Math.PI) / 180;
    const torsoLen = TORSO * (1 - roundingFrac * Math.sin(Math.PI * p));
    const shoulder = {
      x: hip.x + torsoLen * Math.sin(theta),
      y: hip.y - torsoLen * Math.cos(theta),
    };
    // The bar (wrist) rides a vertical path over the midfoot.
    const wrist = { x: MIDFOOT_X, y: 0.78 - 0.33 * p };
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.LEFT_SHOULDER]: shoulder,
        [LANDMARK.LEFT_WRIST]: wrist,
        [LANDMARK.LEFT_HIP]: hip,
        [LANDMARK.LEFT_KNEE]: KNEE,
        [LANDMARK.LEFT_ANKLE]: ANKLE,
        [LANDMARK.LEFT_HEEL]: HEEL,
        [LANDMARK.LEFT_FOOT_INDEX]: FOOT,
      }),
    });
  }
  return frames;
}

function mustGetLift(id: string): LiftConfig {
  const config = getLift(id);
  if (!config) throw new Error(`missing lift config: ${id}`);
  return config;
}

function metricValue(report: { metrics: Array<{ id: string; value: number | null }> }, id: string): number | null {
  return report.metrics.find((m) => m.id === id)?.value ?? null;
}

describe("squat", () => {
  const squat = mustGetLift("squat");

  it("segments reps from the hip cycle and reads depth, torso, and balance", () => {
    const outcome = buildLiftReport(syntheticSquat(), 1, squat);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    expect(r.repCount).toBe(2);
    expect(r.anchorTMs.length).toBe(3);
    expect(r.lockoutTMs.length).toBe(2);

    // Depth: bottom hip y 0.66 vs knee 0.62, thigh (standing) 0.17.
    const depth = metricValue(r, "depth");
    expect(depth).not.toBeNull();
    expect(Math.abs((depth ?? 0) - ((0.66 - 0.62) / 0.17) * 100)).toBeLessThan(4);

    const torso = metricValue(r, "torsoAtBottom");
    expect(Math.abs((torso ?? 0) - 40)).toBeLessThan(3);

    // Hips travel back as they descend, so the bar proxy stays balanced.
    const balance = metricValue(r, "barOverMidfoot");
    expect(balance).not.toBeNull();
    expect(Math.abs(balance ?? 99)).toBeLessThan(20);

    expect(metricValue(r, "heelLift") ?? 99).toBeLessThan(3);
    expect(r.fatigueDrift).toBe(false);
  });

  it("reads a lifted heel and the rule calls it first", () => {
    // 0.007 over a 0.07-long foot = 10% at the bottom.
    const outcome = buildLiftReport(syntheticSquat({ heelLiftY: 0.014 }), 1, squat);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const heel = metricValue(outcome.report, "heelLift");
    expect(heel).not.toBeNull();
    expect(Math.abs((heel ?? 0) - 20)).toBeLessThan(4);
    const { primary } = evaluateLift(squat, outcome.report);
    expect(primary?.ruleId).toBe("heels-lifting");
  });

  it("flags drifting rep durations as a fatigue signal", () => {
    const outcome = buildLiftReport(
      syntheticSquat({ periodsMs: [1800, 2900, 1800, 2900] }),
      1,
      squat,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.fatigueDrift).toBe(true);
  });

  it("refuses to report on fewer than the minimum reps", () => {
    const outcome = buildLiftReport(
      syntheticSquat({ periodsMs: [2400, 2400] }),
      1,
      squat,
    );
    // Two anchors = one rep, below the floor of two.
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain(String(MIN_REPS_FOR_REPORT));
  });
});

describe("bench", () => {
  const bench = mustGetLift("bench");

  it("segments reps from the wrist cycle and reads the stack and the arc", () => {
    const outcome = buildLiftReport(syntheticBench(), 1, bench);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    expect(r.repCount).toBe(2);

    // Stacked fixture: wrist directly over elbow at the touch.
    expect(metricValue(r, "wristOverElbow") ?? 99).toBeLessThan(3);
    // Identical touches: near-zero spread.
    expect(metricValue(r, "touchSpread") ?? 99).toBeLessThan(3);
    // The 0.06 arc over a 0.3 torso = 20%.
    const arc = metricValue(r, "barPath");
    expect(Math.abs((arc ?? 0) - 20)).toBeLessThan(5);

    const { primary } = evaluateLift(bench, outcome.report);
    expect(primary).toBeNull();
  });

  it("reads an unstacked wrist and the rule calls it", () => {
    // 0.05 against a hypot(0.05, 0.18) forearm = 26.7%.
    const outcome = buildLiftReport(
      syntheticBench({ stackOffsetX: 0.05 }),
      1,
      bench,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const stack = metricValue(outcome.report, "wristOverElbow");
    const expected = (0.05 / Math.hypot(0.05, 0.18)) * 100;
    expect(Math.abs((stack ?? 0) - expected)).toBeLessThan(4);
    const { primary } = evaluateLift(bench, outcome.report);
    expect(primary?.ruleId).toBe("wrist-not-stacked");
  });
});

describe("deadlift", () => {
  const deadlift = mustGetLift("deadlift");

  it("reads a braced pull as clean: setup height, bar path, lockout", () => {
    const outcome = buildLiftReport(syntheticDeadlift(), 1, deadlift);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    expect(r.repCount).toBe(2);

    // Rounding stays near the 2% knob, inside the placeholder band.
    const rounding = metricValue(r, "backRounding");
    expect(rounding).not.toBeNull();
    expect(rounding ?? 99).toBeLessThan(4);

    // Hip between knee (0.7) and shoulder (~0.407) at setup: ~34%.
    const hipHeight = metricValue(r, "setupHipHeight");
    expect(Math.abs((hipHeight ?? 0) - 34)).toBeLessThan(5);

    // The bar rides the midfoot.
    expect(Math.abs(metricValue(r, "barOverMidfoot") ?? 99)).toBeLessThan(8);

    // Standing tall at the top.
    expect(metricValue(r, "lockout") ?? 0).toBeGreaterThan(160);

    const { primary } = evaluateLift(deadlift, outcome.report);
    expect(primary).toBeNull();
  });

  it("reads a rounding back and makes it the one change, above everything", () => {
    const outcome = buildLiftReport(
      syntheticDeadlift({ roundingFrac: 0.16 }),
      1,
      deadlift,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const rounding = metricValue(outcome.report, "backRounding");
    expect(Math.abs((rounding ?? 0) - 16)).toBeLessThan(2.5);

    const { primary, verdicts } = evaluateLift(deadlift, outcome.report);
    expect(primary?.ruleId).toBe("back-rounding");
    expect(primary?.priority).toBe(1);
    const roundingVerdict = verdicts.find((v) => v.id === "backRounding");
    expect(roundingVerdict?.verdict).toBe("out_of_range");
  });
});

describe("a lift is a config entry (the extensibility contract)", () => {
  it("a brand-new lift runs end to end with zero engine changes", () => {
    // An overhead press defined HERE, composing only exported primitives:
    // the proof that adding a fourth lift touches lifts.ts and nothing else.
    const pressMetrics: readonly LiftMetricSpec[] = [
      {
        id: "wristOverElbow",
        label: "Wrist over elbow at the rack",
        hint: "test",
        target: { low: 0, high: 15, margin: 8, unit: "pct" },
        extract: wristOverElbowPct,
      },
      {
        id: "barPath",
        label: "Bar path travel",
        hint: "test",
        target: { low: 0, high: 20, margin: 8, unit: "pct" },
        extract: barPathDriftPct,
      },
    ];
    const press: LiftConfig = {
      id: "press",
      name: "Overhead press",
      tagline: "test",
      tracker: "wrist",
      anchorLabel: "rack",
      lockoutLabel: "lockout",
      metrics: pressMetrics,
      rules: [
        {
          id: "wrist-not-stacked",
          description: "test",
          condition: (v) =>
            v.wristOverElbow !== undefined && v.wristOverElbow > 15,
          recommendation: { action: "test", direction: "stack", magnitude: "none" },
          priority: 1,
          confidence: "low",
        },
      ],
      cues: [],
    };

    // Standing press: the wrist cycles rack (y max) to lockout (y min).
    const frames: TimedFrame[] = [];
    for (const [t, u] of repPhases([2400, 2400, 2400])) {
      const wrist = { x: 0.52, y: 0.25 + 0.3 * u };
      frames.push({
        tMs: t,
        frame: frameWithPoints({
          [LANDMARK.LEFT_SHOULDER]: { x: 0.5, y: 0.5 },
          [LANDMARK.LEFT_ELBOW]: { x: 0.52, y: wrist.y + 0.15 },
          [LANDMARK.LEFT_WRIST]: wrist,
          [LANDMARK.LEFT_HIP]: { x: 0.5, y: 0.75 },
        }),
      });
    }

    const outcome = buildLiftReport(frames, 1, press);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.repCount).toBe(2);
    const { primary, verdicts } = evaluateLift(press, outcome.report);
    expect(verdicts.length).toBeGreaterThan(0);
    expect(primary).toBeNull();
  });
});
