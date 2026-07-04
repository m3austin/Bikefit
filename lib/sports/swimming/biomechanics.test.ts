import { describe, expect, it } from "vitest";

import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  buildSwimReport,
  MIN_STROKES_FOR_REPORT,
  SWIM_CONFIDENCE_FLOOR,
  segmentStrokes,
  computeSwimFrameMetrics,
} from "@/lib/sports/swimming/biomechanics";
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
 * A synthetic side-on front crawl, LEFT arm to the camera (only left
 * landmarks visible, so the side vote lands on left). The near wrist runs a
 * cycle: lowest (catch, max image y) at t = cycleMs/2 + k*cycleMs, highest
 * (recovery apex, min y) between. Knobs: cycle period, recovery elbow height,
 * head lift at the catch, body roll (shoulder bob), and landmark visibility
 * (the water-quality signal).
 */
function syntheticCrawl(opts: {
  cycleMs?: number;
  cycles?: number;
  elbowAbove?: number;
  headLift?: number;
  rollAmp?: number;
  visibility?: number;
} = {}): TimedFrame[] {
  const {
    cycleMs = 1200,
    cycles = 6,
    elbowAbove = 0.06,
    headLift = 0.03,
    rollAmp = 0.04,
    visibility = 1,
  } = opts;

  const SHOULDER = { x: 0.5, y: 0.45 };
  const HIP = { x: 0.72, y: 0.5 };

  const frames: TimedFrame[] = [];
  for (let t = 0; t <= (cycles + 1) * cycleMs; t += 1000 / 30) {
    const phi = (TWO_PI * (t - cycleMs / 2)) / cycleMs;
    // u = 1 at the catch (phi = 0), 0 at the recovery apex.
    const u = 0.5 + 0.5 * Math.cos(phi);
    // Wrist: low+forward at the catch, high+back at recovery.
    const wrist = {
      x: 0.44 + 0.12 * u,
      y: 0.4 + 0.35 * u,
    };
    // Elbow tracks above the wrist in recovery; at the apex it sits
    // elbowAbove over the shoulder.
    const elbow = {
      x: wrist.x + 0.03,
      y: wrist.y - elbowAbove * (1 - u),
    };
    // Shoulder bobs with the roll, lowest at the catch.
    const shoulder = { x: SHOULDER.x, y: SHOULDER.y + rollAmp * u };
    // Nose sits headLift above the shoulder at the catch.
    const nose = { x: 0.42, y: shoulder.y - headLift };
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.NOSE]: { ...nose, visibility },
        [LANDMARK.LEFT_SHOULDER]: { ...shoulder, visibility },
        [LANDMARK.LEFT_ELBOW]: { ...elbow, visibility },
        [LANDMARK.LEFT_WRIST]: { ...wrist, visibility },
        [LANDMARK.LEFT_HIP]: { ...HIP, visibility },
      }),
    });
  }
  return frames;
}

describe("computeSwimFrameMetrics", () => {
  it("reads the near side and reports a visibility signal", () => {
    const frame = frameWithPoints({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.5, y: 0.45, visibility: 0.8 },
      [LANDMARK.LEFT_ELBOW]: { x: 0.47, y: 0.4, visibility: 0.8 },
      [LANDMARK.LEFT_WRIST]: { x: 0.45, y: 0.42, visibility: 0.8 },
      [LANDMARK.LEFT_HIP]: { x: 0.72, y: 0.5, visibility: 0.8 },
    });
    const m = computeSwimFrameMetrics(frame, "left", 1);
    expect(m.wrist).not.toBeNull();
    expect(m.visibility).toBeCloseTo(0.8, 5);
  });
});

describe("segmentStrokes", () => {
  it("finds one catch per cycle and a recovery apex between", () => {
    const samples = syntheticCrawl().map((t) => ({
      tMs: t.tMs,
      metrics: computeSwimFrameMetrics(t.frame, "left", 1),
    }));
    const { catchIndices, cycles } = segmentStrokes(samples);
    expect(catchIndices.length).toBe(7);
    expect(cycles.length).toBe(6);
    for (const c of cycles) {
      expect(c.recoveryIndex).not.toBeNull();
      if (c.recoveryIndex === null) continue;
      expect(c.recoveryIndex).toBeGreaterThan(c.catchIndex);
      expect(c.recoveryIndex).toBeLessThan(c.nextCatchIndex);
    }
  });
});

describe("buildSwimReport", () => {
  it("segments strokes and reads the stroke rate", () => {
    const outcome = buildSwimReport(syntheticCrawl({ cycleMs: 1200 }), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    expect(r.side).toBe("left");
    expect(r.strokeCount).toBe(6);
    // 1200 ms per near-arm cycle = 50 cycles/min = 100 total strokes/min.
    expect(r.strokeRateSpm).not.toBeNull();
    expect(Math.abs((r.strokeRateSpm ?? 0) - 100)).toBeLessThan(6);
  });

  it("reads head lift, recovery elbow, and the roll proxy", () => {
    const outcome = buildSwimReport(
      syntheticCrawl({ headLift: 0.03, elbowAbove: 0.06, rollAmp: 0.04 }),
      1,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;
    const torso = Math.hypot(0.5 - 0.72, 0.45 - 0.5);

    expect(r.headLiftPct).not.toBeNull();
    expect(
      Math.abs((r.headLiftPct?.mean ?? 0) - (0.03 / torso) * 100),
    ).toBeLessThan(3);

    expect(r.elbowRecoveryPct).not.toBeNull();
    // At the apex the elbow sits elbowAbove over the shoulder (both near
    // shoulder.y since roll u->0 there).
    expect((r.elbowRecoveryPct?.mean ?? 0)).toBeGreaterThan(0);

    expect(r.bodyRollPct).not.toBeNull();
    expect(
      Math.abs((r.bodyRollPct?.mean ?? 0) - (0.04 / torso) * 100),
    ).toBeLessThan(4);

    expect(r.rhythmCvPct).not.toBeNull();
    expect(r.rhythmCvPct ?? 99).toBeLessThan(5);
  });

  it("flags low confidence without refusing to report", () => {
    // Above the metric-visibility floor (0.5, so joints are still read) but
    // below the confidence floor (0.55): the water is murky, not blind.
    const outcome = buildSwimReport(
      syntheticCrawl({ visibility: 0.52 }),
      1,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.meanVisibility).toBeLessThan(SWIM_CONFIDENCE_FLOOR);
    expect(outcome.report.lowConfidence).toBe(true);
  });

  it("reports full confidence on a clean synthetic clip", () => {
    const outcome = buildSwimReport(syntheticCrawl({ visibility: 1 }), 1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.lowConfidence).toBe(false);
  });

  it("refuses to report on fewer than the minimum stroke cycles", () => {
    const outcome = buildSwimReport(
      syntheticCrawl({ cycles: MIN_STROKES_FOR_REPORT - 1 }),
      1,
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain("cycle");
  });

  it("fails plainly when no arm is visible in the water", () => {
    const frames: TimedFrame[] = Array.from({ length: 60 }, (_, i) => ({
      tMs: i * 33,
      frame: frameWithPoints({
        [LANDMARK.LEFT_HIP]: { x: 0.72, y: 0.5 },
      }),
    }));
    const outcome = buildSwimReport(frames, 1);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain("arm");
  });
});
