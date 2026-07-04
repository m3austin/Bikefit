import { describe, expect, it } from "vitest";

import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  buildSwingReport,
  computeGolfFrameMetrics,
  detectSwingPhases,
  type GolfTimedMetrics,
} from "@/lib/sports/golf/biomechanics";
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * A synthetic swing at 30 fps with hand-derivable phases:
 * still address (0-600 ms), linear backswing (600-1350), a hold at the top
 * (1350-1500), an accelerating downswing peaking into impact (1500-1750),
 * a decelerating follow-through (1750-2150), then stillness. Body knobs:
 * shoulder/hip spans shrink toward the top (the 2D turn proxies), the nose
 * and hip midpoint drift, and the shoulder midpoint can shift to change the
 * spine lean.
 */
function syntheticSwing(opts: {
  shoulderShrink?: number;
  hipShrink?: number;
  noseDriftX?: number;
  hipSlideX?: number;
  spineShiftX?: number;
} = {}): TimedFrame[] {
  const {
    shoulderShrink = 0.45,
    hipShrink = 0.18,
    noseDriftX = 0.02,
    hipSlideX = 0.015,
    spineShiftX = 0,
  } = opts;

  const W0 = { x: 0.62, y: 0.72 };
  const WT = { x: 0.4, y: 0.3 };
  const WI = { x: 0.63, y: 0.74 };
  const WF = { x: 0.45, y: 0.3 };

  const frames: TimedFrame[] = [];
  for (let t = 0; t <= 2600; t += 1000 / 30) {
    // Wrist path.
    let wrist = W0;
    // Progress toward the top, 0 at address and 1 through the hold: drives
    // the body knobs (turn proxies, drift) in sync with the swing.
    let p = 0;
    if (t < 600) {
      wrist = W0;
      p = 0;
    } else if (t < 1350) {
      const u = (t - 600) / 750;
      wrist = { x: lerp(W0.x, WT.x, u), y: lerp(W0.y, WT.y, u) };
      p = u;
    } else if (t < 1500) {
      wrist = WT;
      p = 1;
    } else if (t < 1750) {
      const u = (t - 1500) / 250;
      const e = u * u; // accelerate: peak speed lands at impact
      wrist = { x: lerp(WT.x, WI.x, e), y: lerp(WT.y, WI.y, e) };
      p = 1 - u;
    } else if (t < 2150) {
      const u = (t - 1750) / 400;
      const e = 1 - (1 - u) * (1 - u); // decelerate
      wrist = { x: lerp(WI.x, WF.x, e), y: lerp(WI.y, WF.y, e) };
      p = 0;
    } else {
      wrist = WF;
      p = 0;
    }

    const shoulderSpan = 0.12 * (1 - shoulderShrink * p);
    const hipSpan = 0.1 * (1 - hipShrink * p);
    const shoulderMidX = 0.5 + spineShiftX * p;
    const hipMidX = 0.5 + hipSlideX * p;
    const noseX = 0.5 + noseDriftX * p;

    // The lead (left) arm stays long: elbow sits on the shoulder-wrist line
    // with a slight bow, so its interior angle reads close to straight.
    const lShoulder = { x: shoulderMidX - shoulderSpan / 2, y: 0.42 };
    const lElbow = {
      x: (lShoulder.x + wrist.x) / 2 + 0.008,
      y: (lShoulder.y + wrist.y) / 2,
    };

    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.NOSE]: { x: noseX, y: 0.35 },
        [LANDMARK.LEFT_SHOULDER]: lShoulder,
        [LANDMARK.RIGHT_SHOULDER]: {
          x: shoulderMidX + shoulderSpan / 2,
          y: 0.42,
        },
        [LANDMARK.LEFT_ELBOW]: lElbow,
        [LANDMARK.RIGHT_ELBOW]: { x: 0.58, y: 0.55 },
        [LANDMARK.LEFT_WRIST]: wrist,
        [LANDMARK.RIGHT_WRIST]: wrist,
        [LANDMARK.LEFT_HIP]: { x: hipMidX - hipSpan / 2, y: 0.6 },
        [LANDMARK.RIGHT_HIP]: { x: hipMidX + hipSpan / 2, y: 0.6 },
      }),
    });
  }
  return frames;
}

describe("computeGolfFrameMetrics", () => {
  it("extracts spans, midpoints, and spine lean", () => {
    const frame = frameWithPoints({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.44, y: 0.42 },
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.56, y: 0.42 },
      [LANDMARK.LEFT_HIP]: { x: 0.46, y: 0.6 },
      [LANDMARK.RIGHT_HIP]: { x: 0.54, y: 0.6 },
    });
    const m = computeGolfFrameMetrics(frame, 1);
    expect(m.shoulderSpan).toBeCloseTo(0.12);
    expect(m.hipSpan).toBeCloseTo(0.08);
    expect(m.shoulderMid?.x).toBeCloseTo(0.5);
    // Shoulder mid directly above hip mid: zero spine lean from vertical.
    expect(m.spineDeg).toBeCloseTo(0, 5);
  });

  it("reads spine lean from vertical", () => {
    const frame = frameWithPoints({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.53, y: 0.42 },
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.65, y: 0.42 },
      [LANDMARK.LEFT_HIP]: { x: 0.46, y: 0.6 },
      [LANDMARK.RIGHT_HIP]: { x: 0.54, y: 0.6 },
    });
    const m = computeGolfFrameMetrics(frame, 1);
    // Shoulder mid (0.59) sits 0.09 ahead of hip mid (0.50) over 0.18 rise.
    expect(m.spineDeg).toBeCloseTo(
      (Math.atan2(0.09, 0.18) * 180) / Math.PI,
      1,
    );
  });
});

/**
 * A piecewise-linear wrist path over a fixed body: enough to test phase
 * detection against realistic footage shapes (practice swings, glitches)
 * without the full metric knobs of syntheticSwing. Keyframes are
 * {tMs, x, y}; the wrist lerps between them at 30 fps.
 */
function wristPathFrames(
  keys: ReadonlyArray<{ tMs: number; x: number; y: number }>,
): TimedFrame[] {
  const frames: TimedFrame[] = [];
  const last = keys[keys.length - 1];
  if (!last) throw new Error("fixture");
  for (let t = 0; t <= last.tMs; t += 1000 / 30) {
    let wrist = { x: keys[0]?.x ?? 0, y: keys[0]?.y ?? 0 };
    for (let k = 0; k + 1 < keys.length; k++) {
      const a = keys[k];
      const b = keys[k + 1];
      if (!a || !b) break;
      if (t >= a.tMs && t <= b.tMs) {
        const u = b.tMs > a.tMs ? (t - a.tMs) / (b.tMs - a.tMs) : 0;
        wrist = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
        break;
      }
      if (t > b.tMs) wrist = { x: b.x, y: b.y };
    }
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.LEFT_SHOULDER]: { x: 0.44, y: 0.42 },
        [LANDMARK.RIGHT_SHOULDER]: { x: 0.56, y: 0.42 },
        [LANDMARK.LEFT_HIP]: { x: 0.45, y: 0.6 },
        [LANDMARK.RIGHT_HIP]: { x: 0.55, y: 0.6 },
        [LANDMARK.LEFT_WRIST]: wrist,
        [LANDMARK.RIGHT_WRIST]: wrist,
      }),
    });
  }
  return frames;
}

function toSamples(frames: readonly TimedFrame[]): GolfTimedMetrics[] {
  return frames.map((f) => ({
    tMs: f.tMs,
    metrics: computeGolfFrameMetrics(f.frame, 1),
  }));
}

describe("detectSwingPhases", () => {
  it("orders the five phases and places them in the right windows", () => {
    const frames = syntheticSwing();
    const samples: GolfTimedMetrics[] = frames.map((f) => ({
      tMs: f.tMs,
      metrics: computeGolfFrameMetrics(f.frame, 1),
    }));
    const detection = detectSwingPhases(samples);
    expect(detection.ok).toBe(true);
    if (!detection.ok) return;
    const { phases } = detection;
    const t = (i: number) => samples[i]?.tMs ?? NaN;

    expect(t(phases.addressIdx)).toBeLessThan(700);
    expect(t(phases.takeawayIdx)).toBeGreaterThan(450);
    expect(t(phases.takeawayIdx)).toBeLessThan(850);
    expect(t(phases.topIdx)).toBeGreaterThan(1200);
    expect(t(phases.topIdx)).toBeLessThan(1600);
    expect(t(phases.impactIdx)).toBeGreaterThan(1550);
    expect(t(phases.impactIdx)).toBeLessThan(1900);
    expect(t(phases.followIdx)).toBeGreaterThan(t(phases.impactIdx));

    // Strict ordering.
    expect(phases.addressIdx).toBeLessThanOrEqual(phases.takeawayIdx);
    expect(phases.takeawayIdx).toBeLessThan(phases.topIdx);
    expect(phases.topIdx).toBeLessThan(phases.impactIdx);
    expect(phases.impactIdx).toBeLessThanOrEqual(phases.followIdx);
  });

  it("ignores a practice swing before the real one", () => {
    // A brisk practice swing (400-1400), a still re-address (1400-2400),
    // then the real swing: backswing to 3150, top hold, impact at ~3550.
    const frames = wristPathFrames([
      { tMs: 0, x: 0.62, y: 0.72 },
      { tMs: 400, x: 0.62, y: 0.72 },
      { tMs: 800, x: 0.5, y: 0.4 }, // practice up (hands never as high as a real top)
      { tMs: 1400, x: 0.62, y: 0.72 }, // practice down
      { tMs: 2400, x: 0.62, y: 0.72 }, // still at address again
      { tMs: 3150, x: 0.4, y: 0.3 }, // real backswing
      { tMs: 3300, x: 0.4, y: 0.3 }, // top hold
      { tMs: 3550, x: 0.63, y: 0.74 }, // downswing to impact
      { tMs: 3950, x: 0.45, y: 0.3 }, // follow-through
      { tMs: 4400, x: 0.45, y: 0.3 },
    ]);
    const detection = detectSwingPhases(toSamples(frames));
    expect(detection.ok).toBe(true);
    if (!detection.ok) return;
    const samples = toSamples(frames);
    const t = (i: number) => samples[i]?.tMs ?? NaN;
    // Every phase belongs to the REAL swing, not the practice one.
    expect(t(detection.phases.addressIdx)).toBeGreaterThan(1500);
    expect(t(detection.phases.addressIdx)).toBeLessThan(2600);
    expect(t(detection.phases.takeawayIdx)).toBeGreaterThan(2300);
    expect(t(detection.phases.takeawayIdx)).toBeLessThan(2800);
    expect(t(detection.phases.topIdx)).toBeGreaterThan(3000);
    expect(t(detection.phases.topIdx)).toBeLessThan(3400);
    expect(t(detection.phases.impactIdx)).toBeGreaterThan(3400);
    expect(t(detection.phases.impactIdx)).toBeLessThan(3700);
  });

  it("is not fooled by a single-frame tracker glitch", () => {
    // The classic MediaPipe failure: one frame where the wrists teleport
    // (occlusion re-acquisition). It must not become "impact".
    const frames = syntheticSwing();
    const glitchIdx = frames.findIndex((f) => f.tMs > 2300);
    const glitch = frames[glitchIdx];
    if (!glitch) throw new Error("fixture");
    frames[glitchIdx] = {
      tMs: glitch.tMs,
      frame: glitch.frame.map((lm, i) =>
        i === LANDMARK.LEFT_WRIST || i === LANDMARK.RIGHT_WRIST
          ? { ...lm, x: 0.95, y: 0.95 }
          : lm,
      ),
    };
    const samples = toSamples(frames);
    const detection = detectSwingPhases(samples);
    expect(detection.ok).toBe(true);
    if (!detection.ok) return;
    const t = (i: number) => samples[i]?.tMs ?? NaN;
    expect(t(detection.phases.impactIdx)).toBeGreaterThan(1550);
    expect(t(detection.phases.impactIdx)).toBeLessThan(1900);
  });

  it("fails plainly when there is no swing", () => {
    const still = syntheticSwing().map((f, i) => ({
      tMs: i * (1000 / 30),
      frame: f.frame,
    }));
    // Freeze every frame at the first frame's landmarks.
    const first = still[0];
    if (!first) throw new Error("fixture");
    const frozen: TimedFrame[] = still.map((f) => ({
      tMs: f.tMs,
      frame: first.frame,
    }));
    const samples: GolfTimedMetrics[] = frozen.map((f) => ({
      tMs: f.tMs,
      metrics: computeGolfFrameMetrics(f.frame, 1),
    }));
    const detection = detectSwingPhases(samples);
    expect(detection.ok).toBe(false);
  });
});

describe("buildSwingReport", () => {
  it("computes tempo, turn proxies, slide, drift, and lead arm", () => {
    const outcome = buildSwingReport(syntheticSwing(), 1, "face");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.report;

    expect(r.view).toBe("face");
    // Backswing ~750-900 ms vs downswing ~200-300 ms.
    expect(r.tempoRatio ?? 0).toBeGreaterThan(1.8);
    expect(r.tempoRatio ?? 99).toBeLessThan(6);
    // Shoulder span shrinks 45%, hips 18% at the top.
    expect(r.shoulderTurnPct ?? 0).toBeGreaterThan(35);
    expect(r.shoulderTurnPct ?? 99).toBeLessThan(52);
    expect(r.hipTurnPct ?? 0).toBeGreaterThan(10);
    expect(r.hipTurnPct ?? 99).toBeLessThan(26);
    expect(r.xFactorPct ?? 0).toBeGreaterThan(15);
    // Hip slide 0.015 over hip span 0.1 = 15%; drift 0.02 over torso 0.18 = 11%.
    expect(r.hipSlidePct ?? 0).toBeGreaterThan(9);
    expect(r.hipSlidePct ?? 99).toBeLessThan(21);
    expect(r.headDriftPct ?? 0).toBeGreaterThan(6);
    expect(r.headDriftPct ?? 99).toBeLessThan(17);
    // The synthetic lead arm is nearly straight at the top.
    expect(r.leadArmAtTopDeg ?? 0).toBeGreaterThan(150);
  });

  it("reads spine change on a DTL-style fixture", () => {
    const outcome = buildSwingReport(
      syntheticSwing({ spineShiftX: 0.03, hipSlideX: 0 }),
      1,
      "dtl",
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // 0.03 shift over 0.18 torso rise is ~9.5 degrees of lean change.
    expect(outcome.report.spineChangeDeg ?? 0).toBeGreaterThan(5);
    expect(outcome.report.spineChangeDeg ?? 99).toBeLessThan(14);
  });

  it("fails with a plain reason on a too-quick non-swing", () => {
    // Only the first 900 ms: address plus a partial backswing, no strike.
    const frames = syntheticSwing().filter((f) => f.tMs <= 900);
    const outcome = buildSwingReport(frames, 1, "dtl");
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason.length).toBeGreaterThan(10);
  });
});
