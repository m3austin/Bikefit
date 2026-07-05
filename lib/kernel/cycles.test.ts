import { describe, expect, it } from "vitest";

import { detectCyclePeaks, type CyclePoint } from "@/lib/kernel/cycles";

/*
 * Real-world robustness of the shared cyclic detector. Every cyclic sport
 * (cycling, running, lifting, swimming) segments its movement through this,
 * so a fixture here stands in for a fragile capture in any of them: a single
 * tracker teleport, an off-rhythm phantom peak, or amplitude that drifts as
 * the athlete moves toward or away from the camera.
 */

const FPS = 30;
const DT = 1000 / FPS;

/** A periodic track: cosine humps (peaks up) one `periodMs` apart, over
 * `cycles` periods, riding on an optional time-varying baseline (a drift as
 * the athlete moves relative to the camera). */
function periodic(opts: {
  cycles: number;
  periodMs: number;
  amp?: number;
  baseline?: (fraction: number) => number;
}): CyclePoint[] {
  const { cycles, periodMs, amp = 1, baseline } = opts;
  const spanMs = cycles * periodMs;
  const points: CyclePoint[] = [];
  for (let t = 0; t <= spanMs; t += DT) {
    const base = baseline ? baseline(t / spanMs) : 0;
    const phase = (2 * Math.PI * t) / periodMs; // peak (max) at each center
    points.push({ tMs: t, value: base + amp * -Math.cos(phase) });
  }
  return points;
}

/** A track built from explicit Gaussian humps, so a test can place peaks at
 * arbitrary (possibly off-rhythm) centers. */
function humps(
  spanMs: number,
  peaks: ReadonlyArray<{ center: number; amp: number }>,
  widthMs = 120,
): CyclePoint[] {
  const points: CyclePoint[] = [];
  for (let t = 0; t <= spanMs; t += DT) {
    let v = 0;
    for (const p of peaks) {
      const z = (t - p.center) / widthMs;
      v += p.amp * Math.exp(-z * z);
    }
    points.push({ tMs: t, value: v });
  }
  return points;
}

function peakTimes(points: readonly CyclePoint[], idx: readonly number[]): number[] {
  return idx.map((i) => points[i]?.tMs ?? NaN);
}

const OPTS = { minSeparationMs: 400, minRelativeHeight: 0.5, smoothWindow: 5 };

describe("detectCyclePeaks — baseline (must stay green)", () => {
  it("finds one peak per cycle in a clean periodic track", () => {
    const points = periodic({ cycles: 5, periodMs: 1000 });
    const peaks = detectCyclePeaks(points, OPTS);
    expect(peaks.length).toBe(5);
    const times = peakTimes(points, peaks);
    [500, 1500, 2500, 3500, 4500].forEach((expected, k) => {
      expect(Math.abs((times[k] ?? 0) - expected)).toBeLessThan(120);
    });
  });
});

describe("detectCyclePeaks — single-frame glitch de-spike", () => {
  it("does not turn one teleported frame into a phantom cycle", () => {
    const points = periodic({ cycles: 4, periodMs: 1000 });
    // A tracker teleport: one frame mid-trough spikes far above every peak.
    const glitchIdx = points.findIndex((p) => p.tMs >= 1000 && p.tMs < 1000 + DT);
    const glitch = points[glitchIdx];
    if (!glitch) throw new Error("fixture");
    points[glitchIdx] = { tMs: glitch.tMs, value: 10 };

    const peaks = detectCyclePeaks(points, OPTS);
    expect(peaks.length).toBe(4);
    const times = peakTimes(points, peaks);
    expect(times.some((t) => Math.abs(t - glitch.tMs) < 150)).toBe(false);
  });
});

describe("detectCyclePeaks — interval consistency", () => {
  it("drops an off-rhythm phantom peak when a tolerance is set", () => {
    // Five real peaks 1000ms apart, plus a sustained phantom hump wedged at
    // 3000ms: past minSeparation from both neighbours, but off the rhythm.
    const points = humps(5000, [
      { center: 500, amp: 1 },
      { center: 1500, amp: 1 },
      { center: 2500, amp: 1 },
      { center: 3000, amp: 0.9 }, // phantom
      { center: 3500, amp: 1 },
      { center: 4500, amp: 1 },
    ]);
    // Without the tolerance the phantom survives (it clears every other bar).
    const loose = detectCyclePeaks(points, OPTS);
    expect(loose.length).toBe(6);

    const strict = detectCyclePeaks(points, { ...OPTS, intervalTolerance: 0.4 });
    const times = peakTimes(points, strict);
    expect(times.some((t) => Math.abs(t - 3000) < 120)).toBe(false);
    expect(strict.length).toBe(5);
  });
});

describe("detectCyclePeaks — prominence under amplitude drift", () => {
  it("keeps late shallow cycles a global-range bar would drop", () => {
    // Baseline ramps from +1 down to -1 (athlete drifts from the camera) with
    // small oscillations on top: late peaks fall below the global 0.5 bar but
    // are still clear local prominences.
    const points = periodic({
      cycles: 6,
      periodMs: 1000,
      amp: 0.3,
      baseline: (f) => 1 - 2 * f,
    });
    const bar = detectCyclePeaks(points, OPTS);
    const prom = detectCyclePeaks(points, { ...OPTS, minProminence: 0.12 });
    expect(bar.length).toBeLessThan(6);
    expect(prom.length).toBe(6);
  });
});
