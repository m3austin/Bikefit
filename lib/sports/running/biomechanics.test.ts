import { describe, expect, it } from "vitest";

import { interiorAngleDeg } from "@/lib/kernel/geometry";
import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  buildGaitReport,
  buildRearGaitReport,
  classifyFootStrike,
  computeRunFrameMetrics,
  detectRunForwardSign,
  MIN_STRIDES_FOR_REPORT,
} from "@/lib/sports/running/biomechanics";
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
 * A synthetic side-view treadmill gait at 30 fps, LEFT side toward the
 * camera (only left landmarks visible, so the side vote lands on left).
 * The ankle runs a cosine: lowest (footstrike, max image y) at
 * t = strideMs/2 + k * strideMs, so no contact sits on a series edge.
 * Knobs: stride period, stride count, foot reach at contact (overstride),
 * hip bounce, trunk lean, and the foot-strike tilt.
 */
function syntheticGait(opts: {
  strideMs?: number;
  strides?: number;
  reachX?: number;
  hipOscY?: number;
  trunkLeanDeg?: number;
  strike?: "heel" | "mid" | "fore";
} = {}): TimedFrame[] {
  const {
    strideMs = 700,
    strides = 6,
    reachX = 0.05,
    hipOscY = 0.03,
    trunkLeanDeg = 7,
    strike = "heel",
  } = opts;

  const HIP_X = 0.5;
  const HIP_BASE_Y = 0.52;
  const ANKLE_CONTACT_Y = 0.85;
  const LIFT = 0.08;
  const TRUNK_LEN = 0.3;
  const theta = (trunkLeanDeg * Math.PI) / 180;

  // Heel-toe tilt at the foot (image y grows downward; heel lower = heel strike).
  const foot = { dx: 0.05, dy: strike === "fore" ? 0.03 : 0.005 };
  const heel = { dx: -0.02, dy: strike === "heel" ? 0.03 : 0.005 };
  if (strike === "mid") {
    foot.dy = 0.01;
    heel.dy = 0.01;
  }

  const durationMs = (strides + 1) * strideMs;
  const frames: TimedFrame[] = [];
  for (let t = 0; t <= durationMs; t += 1000 / 30) {
    const phi = (TWO_PI * (t - strideMs / 2)) / strideMs;
    const ankle = {
      x: HIP_X + reachX * Math.cos(phi),
      y: ANKLE_CONTACT_Y - LIFT * (0.5 - 0.5 * Math.cos(phi)),
    };
    // The body bounces twice per stride, lowest around contact.
    const hip = {
      x: HIP_X,
      y: HIP_BASE_Y - (hipOscY / 2) * (1 - Math.cos(2 * phi)),
    };
    const knee = {
      x: (hip.x + ankle.x) / 2 + 0.03,
      y: (hip.y + ankle.y) / 2,
    };
    const shoulder = {
      x: hip.x + TRUNK_LEN * Math.sin(theta),
      y: hip.y - TRUNK_LEN * Math.cos(theta),
    };
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.LEFT_SHOULDER]: shoulder,
        [LANDMARK.LEFT_HIP]: hip,
        [LANDMARK.LEFT_KNEE]: knee,
        [LANDMARK.LEFT_ANKLE]: ankle,
        [LANDMARK.LEFT_HEEL]: { x: ankle.x + heel.dx, y: ankle.y + heel.dy },
        [LANDMARK.LEFT_FOOT_INDEX]: {
          x: ankle.x + foot.dx,
          y: ankle.y + foot.dy,
        },
      }),
    });
  }
  return frames;
}

describe("computeRunFrameMetrics", () => {
  it("computes knee angle, trunk lean, and keeps the foot points", () => {
    const frame = frameWithPoints({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.54, y: 0.22 },
      [LANDMARK.LEFT_HIP]: { x: 0.5, y: 0.52 },
      [LANDMARK.LEFT_KNEE]: { x: 0.55, y: 0.68 },
      [LANDMARK.LEFT_ANKLE]: { x: 0.55, y: 0.85 },
      [LANDMARK.LEFT_HEEL]: { x: 0.53, y: 0.88 },
      [LANDMARK.LEFT_FOOT_INDEX]: { x: 0.6, y: 0.86 },
    });
    const m = computeRunFrameMetrics(frame, "left", 1);
    expect(m.kneeDeg ?? NaN).toBeCloseTo(
      interiorAngleDeg(
        { x: 0.5, y: 0.52 },
        { x: 0.55, y: 0.68 },
        { x: 0.55, y: 0.85 },
      ) ?? NaN,
      6,
    );
    // atan(dx / dy) from vertical for the hip-to-shoulder segment.
    expect(m.trunkLeanDeg ?? NaN).toBeCloseTo(
      (Math.atan2(0.04, 0.3) * 180) / Math.PI,
      6,
    );
    expect(m.heelPos).not.toBeNull();
    expect(m.footPos).not.toBeNull();
  });

  it("nulls metrics whose landmarks are below the visibility floor", () => {
    const frame = frameWithPoints({
      [LANDMARK.LEFT_HIP]: { x: 0.5, y: 0.5 },
      [LANDMARK.LEFT_KNEE]: { x: 0.5, y: 0.7, visibility: 0.2 },
      [LANDMARK.LEFT_ANKLE]: { x: 0.5, y: 0.9 },
    });
    const m = computeRunFrameMetrics(frame, "left", 1);
    expect(m.kneeDeg).toBeNull();
    expect(m.anklePos).not.toBeNull();
  });
});

describe("classifyFootStrike", () => {
  it("calls heel when the heel sits clearly lower at contact", () => {
    expect(
      classifyFootStrike({ x: 0.5, y: 0.9 }, { x: 0.57, y: 0.875 }),
    ).toBe("heel");
  });
  it("calls fore when the toe sits clearly lower", () => {
    expect(
      classifyFootStrike({ x: 0.5, y: 0.875 }, { x: 0.57, y: 0.9 }),
    ).toBe("fore");
  });
  it("calls mid when the foot lands flat", () => {
    expect(classifyFootStrike({ x: 0.5, y: 0.9 }, { x: 0.57, y: 0.9 })).toBe(
      "mid",
    );
  });
});

describe("detectRunForwardSign", () => {
  it("reads the run direction from the way the feet point", () => {
    const frames = syntheticGait();
    const samples = frames.map((t) => ({
      tMs: t.tMs,
      metrics: computeRunFrameMetrics(t.frame, "left", 1),
    }));
    expect(detectRunForwardSign(samples)).toBe(1);
  });
});

describe("buildGaitReport (side view)", () => {
  it("segments strides and reads cadence from the stride rate", () => {
    const outcome = buildGaitReport(syntheticGait({ strideMs: 700 }), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    expect(r.side).toBe("left");
    expect(r.strideCount).toBe(6);
    expect(r.contactTMs).toHaveLength(7);
    // Contacts land near strideMs/2 + k * strideMs.
    r.contactTMs.forEach((tMs, k) => {
      expect(Math.abs(tMs - (350 + k * 700)), `contact ${k}`).toBeLessThan(70);
    });
    // 700 ms per one-leg stride = 85.7 strides/min = 171.4 steps/min.
    expect(r.cadenceSpm).not.toBeNull();
    expect(Math.abs((r.cadenceSpm ?? 0) - 171.4)).toBeLessThan(4);
  });

  it("finds a toe-off inside every stride", () => {
    const outcome = buildGaitReport(syntheticGait(), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    expect(r.toeOffTMs).toHaveLength(r.strideCount);
    r.toeOffTMs.forEach((tMs, k) => {
      const contact = r.contactTMs[k];
      const next = r.contactTMs[k + 1];
      expect(contact).toBeDefined();
      expect(next).toBeDefined();
      if (contact === undefined || next === undefined) return;
      expect(tMs).toBeGreaterThan(contact);
      expect(tMs).toBeLessThan(next);
    });
  });

  it("measures overstride as foot-ahead-of-hip over leg length", () => {
    const reachX = 0.05;
    const outcome = buildGaitReport(syntheticGait({ reachX }), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // At contact the ankle sits reachX ahead of the hip, leg length is the
    // hip-to-ankle distance at that instant.
    const legLen = Math.hypot(reachX, 0.85 - 0.52);
    const expected = (reachX / legLen) * 100;
    const measured = outcome.report.overstridePct;
    expect(measured).not.toBeNull();
    expect(Math.abs((measured?.mean ?? 0) - expected)).toBeLessThan(2);
  });

  it("measures knee flexion at contact, hip bounce, and trunk lean", () => {
    const hipOscY = 0.03;
    const trunkLeanDeg = 7;
    const outcome = buildGaitReport(
      syntheticGait({ hipOscY, trunkLeanDeg }),
      1,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;

    // Expected knee flexion from the same contact geometry the fixture built.
    const hip = { x: 0.5, y: 0.52 };
    const ankle = { x: 0.55, y: 0.85 };
    const knee = { x: (hip.x + ankle.x) / 2 + 0.03, y: (hip.y + ankle.y) / 2 };
    const expectedFlex = 180 - (interiorAngleDeg(hip, knee, ankle) ?? NaN);
    expect(r.kneeFlexAtContactDeg).not.toBeNull();
    expect(
      Math.abs((r.kneeFlexAtContactDeg?.mean ?? 0) - expectedFlex),
    ).toBeLessThan(3);

    const legLen = Math.hypot(0.05, 0.33);
    expect(r.verticalOscillationPct).not.toBeNull();
    expect(
      Math.abs((r.verticalOscillationPct?.mean ?? 0) - (hipOscY / legLen) * 100),
    ).toBeLessThan(1.5);

    expect(r.trunkLeanDeg).not.toBeNull();
    expect(Math.abs((r.trunkLeanDeg?.mean ?? 0) - trunkLeanDeg)).toBeLessThan(1);
    expect(r.highVariance).toBe(false);
  });

  it("reports the foot strike without judging it", () => {
    for (const strike of ["heel", "mid", "fore"] as const) {
      const outcome = buildGaitReport(syntheticGait({ strike }), 1);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      expect(outcome.report.footStrike.label, strike).toBe(strike);
    }
  });

  it("refuses to report on fewer than the minimum strides", () => {
    const outcome = buildGaitReport(
      syntheticGait({ strides: MIN_STRIDES_FOR_REPORT - 1 }),
      1,
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain("strides");
  });

  it("fails plainly when the feet are not visible", () => {
    const frames: TimedFrame[] = Array.from({ length: 60 }, (_, i) => ({
      tMs: i * 33,
      frame: frameWithPoints({
        [LANDMARK.LEFT_SHOULDER]: { x: 0.5, y: 0.2 },
        [LANDMARK.LEFT_HIP]: { x: 0.5, y: 0.5 },
      }),
    }));
    const outcome = buildGaitReport(frames, 1);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain("feet");
  });
});

/**
 * A synthetic rear view: both hips and ankles visible, ankles alternating
 * half a stride apart, and the RIGHT hip dropping while the LEFT leg is in
 * stance (peak drop exactly at left footstrike).
 */
function syntheticRearGait(opts: { dropY?: number } = {}): TimedFrame[] {
  const { dropY = 0.015 } = opts;
  const strideMs = 700;
  const strides = 6;
  const LIFT = 0.08;

  const frames: TimedFrame[] = [];
  for (let t = 0; t <= (strides + 1) * strideMs; t += 1000 / 30) {
    const phiL = (TWO_PI * (t - strideMs / 2)) / strideMs;
    const phiR = phiL + Math.PI;
    const rightHipY = 0.5 + dropY * 0.5 * (1 + Math.cos(phiL));
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.LEFT_HIP]: { x: 0.45, y: 0.5 },
        [LANDMARK.RIGHT_HIP]: { x: 0.55, y: rightHipY },
        [LANDMARK.LEFT_ANKLE]: {
          x: 0.44,
          y: 0.9 - LIFT * (0.5 - 0.5 * Math.cos(phiL)),
        },
        [LANDMARK.RIGHT_ANKLE]: {
          x: 0.56,
          y: 0.9 - LIFT * (0.5 - 0.5 * Math.cos(phiR)),
        },
      }),
    });
  }
  return frames;
}

describe("buildRearGaitReport (rear view)", () => {
  it("segments both legs and reads a matching cadence", () => {
    const outcome = buildRearGaitReport(syntheticRearGait(), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    expect(r.strideCountLeft).toBeGreaterThanOrEqual(5);
    expect(r.strideCountRight).toBeGreaterThanOrEqual(5);
    expect(r.cadenceSpm).not.toBeNull();
    expect(Math.abs((r.cadenceSpm ?? 0) - 171.4)).toBeLessThan(4);
  });

  it("reads contralateral pelvic drop as percent of hip width", () => {
    const dropY = 0.015; // 15% of the 0.1 hip width
    const outcome = buildRearGaitReport(syntheticRearGait({ dropY }), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    // The right hip drops during LEFT stance; the right-stance side is level.
    expect(r.pelvicDropLeftStancePct).not.toBeNull();
    expect(
      Math.abs((r.pelvicDropLeftStancePct?.mean ?? 0) - 15),
    ).toBeLessThan(1.5);
    expect(r.pelvicDropRightStancePct).not.toBeNull();
    expect(r.pelvicDropRightStancePct?.mean ?? 99).toBeLessThan(1.5);
  });

  it("reads stance width from the midline, positive on the leg's own side", () => {
    const outcome = buildRearGaitReport(syntheticRearGait(), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    // Left ankle at 0.44 vs midline 0.5 with hip width 0.1: 60%.
    expect(Math.abs((r.stanceWidthLeftPct?.mean ?? 0) - 60)).toBeLessThan(2);
    expect(Math.abs((r.stanceWidthRightPct?.mean ?? 0) - 60)).toBeLessThan(2);
  });

  it("fails plainly when the hips are not visible", () => {
    const frames: TimedFrame[] = Array.from({ length: 60 }, (_, i) => ({
      tMs: i * 33,
      frame: frameWithPoints({
        [LANDMARK.LEFT_ANKLE]: { x: 0.44, y: 0.9 },
        [LANDMARK.RIGHT_ANKLE]: { x: 0.56, y: 0.9 },
      }),
    }));
    const outcome = buildRearGaitReport(frames, 1);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain("hips");
  });
});
