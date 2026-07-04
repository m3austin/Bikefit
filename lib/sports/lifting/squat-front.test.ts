import { describe, expect, it } from "vitest";

import type { TimedFrame } from "@/lib/kernel/tracking";
import { LANDMARK, type PoseFrame } from "@/lib/pose-model";
import {
  buildSquatFrontReport,
  evaluateSquatFront,
  SQUAT_FRONT_TARGETS,
} from "@/lib/sports/lifting/squat-front";

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
 * A synthetic front-view squat at 30 fps, both sides visible. Hips drop with
 * depth (larger image y at the bottom), so reps segment on the hip cycle.
 * Knees cave toward the midline in proportion to depth; caveL/caveR are the
 * fraction of hip width each knee travels inward at the bottom.
 */
function syntheticFrontSquat(opts: {
  caveL?: number;
  caveR?: number;
  reps?: number;
} = {}): TimedFrame[] {
  const { caveL = 0, caveR = 0, reps = 4 } = opts;
  const period = 2400;
  const HIP_W = 0.12; // 0.44..0.56
  const frames: TimedFrame[] = [];
  for (let t = 0; t <= (reps + 1) * period; t += 1000 / 30) {
    const phi = (TWO_PI * (t - period / 2)) / period;
    const u = 0.5 - 0.5 * Math.cos(phi); // 0 standing, 1 at the bottom
    const hipY = 0.45 + 0.2 * u;
    const kneeY = 0.7 + 0.05 * u;
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.LEFT_HIP]: { x: 0.44, y: hipY },
        [LANDMARK.RIGHT_HIP]: { x: 0.56, y: hipY },
        // Knees cave inward (toward 0.5) with depth.
        [LANDMARK.LEFT_KNEE]: { x: 0.435 + caveL * HIP_W * u, y: kneeY },
        [LANDMARK.RIGHT_KNEE]: { x: 0.565 - caveR * HIP_W * u, y: kneeY },
        [LANDMARK.LEFT_ANKLE]: { x: 0.43, y: 0.9 },
        [LANDMARK.RIGHT_ANKLE]: { x: 0.57, y: 0.9 },
      }),
    });
  }
  return frames;
}

describe("buildSquatFrontReport", () => {
  it("segments reps and reads clean tracking when knees stay out", () => {
    const outcome = buildSquatFrontReport(syntheticFrontSquat({}), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.repCount).toBe(4);
    expect(outcome.report.kneeTrackingPct?.mean ?? 99).toBeLessThan(3);
    expect(outcome.report.symmetryPct?.mean ?? 99).toBeLessThan(3);
  });

  it("measures inward knee cave as percent of hip width", () => {
    const outcome = buildSquatFrontReport(
      syntheticFrontSquat({ caveL: 0.25, caveR: 0.25 }),
      1,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // ~25% cave, symmetric so the left-right gap stays small.
    expect(Math.abs((outcome.report.kneeTrackingPct?.mean ?? 0) - 25)).toBeLessThan(4);
    expect(outcome.report.symmetryPct?.mean ?? 99).toBeLessThan(4);
  });

  it("catches a one-sided cave as asymmetry", () => {
    const outcome = buildSquatFrontReport(
      syntheticFrontSquat({ caveL: 0.04, caveR: 0.25 }),
      1,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.symmetryPct?.mean ?? 0).toBeGreaterThan(15);
  });

  it("refuses to report on too few reps", () => {
    const outcome = buildSquatFrontReport(syntheticFrontSquat({ reps: 1 }), 1);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain("reps");
  });

  it("fails plainly when hips are not visible", () => {
    const frames: TimedFrame[] = Array.from({ length: 40 }, (_, i) => ({
      tMs: i * 33,
      frame: frameWithPoints({
        [LANDMARK.LEFT_KNEE]: { x: 0.44, y: 0.7 },
      }),
    }));
    const outcome = buildSquatFrontReport(frames, 1);
    expect(outcome.ok).toBe(false);
  });
});

describe("evaluateSquatFront", () => {
  const report = (kneeTracking: number, symmetry: number) => ({
    sampleCount: 100,
    analyzedMs: 9000,
    repCount: 4,
    kneeTrackingPct: { min: kneeTracking, max: kneeTracking, mean: kneeTracking, stdDev: 0, count: 4 },
    symmetryPct: { min: symmetry, max: symmetry, mean: symmetry, stdDev: 0, count: 4 },
    highVariance: false,
  });

  it("scores clean tracking in range with no findings", () => {
    const { metrics, findings } = evaluateSquatFront(report(5, 2));
    expect(metrics.map((m) => m.key)).toEqual(["kneeTracking", "kneeSymmetry"]);
    expect(metrics[0]?.verdict).toBe("in_range");
    expect(findings).toEqual([]);
  });

  it("flags a caving knee as the higher-priority finding", () => {
    const { findings } = evaluateSquatFront(
      report(SQUAT_FRONT_TARGETS.kneeTracking.high + 8, 2),
    );
    expect(findings[0]?.ruleId).toBe("knee-cave");
    expect(findings[0]?.adjust).toBe("knees-out");
  });

  it("flags asymmetry as a secondary finding", () => {
    const { findings } = evaluateSquatFront(
      report(5, SQUAT_FRONT_TARGETS.symmetry.high + 6),
    );
    expect(findings.some((f) => f.ruleId === "knee-asymmetry")).toBe(true);
  });
});
