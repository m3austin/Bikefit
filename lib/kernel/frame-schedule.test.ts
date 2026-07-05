import { describe, expect, it } from "vitest";

import { analysisTimestamps } from "@/lib/kernel/frame-schedule";

/*
 * The offline analysis pass steps the video by seeking to a fixed schedule of
 * timestamps and detecting each, so analysis quality no longer depends on
 * whether a slow device can keep up with real-time playback. This locks that
 * schedule: full coverage of the clip, exact even spacing, and hard caps so a
 * long or high-fps clip can't blow the frame budget.
 */

describe("analysisTimestamps", () => {
  const CAPS = { maxSamples: 3600, maxMs: 60_000 };

  it("steps evenly from 0 through the clip's end", () => {
    const ts = analysisTimestamps({ durationMs: 1000, stepMs: 100, ...CAPS });
    expect(ts[0]).toBe(0);
    expect(ts[ts.length - 1]).toBe(1000);
    expect(ts.length).toBe(11);
    for (let i = 1; i < ts.length; i++) {
      expect((ts[i] ?? 0) - (ts[i - 1] ?? 0)).toBeCloseTo(100, 6);
    }
  });

  it("never samples past the max-duration cap", () => {
    const ts = analysisTimestamps({ durationMs: 90_000, stepMs: 1000, ...CAPS });
    expect(Math.max(...ts)).toBeLessThanOrEqual(60_000);
    expect(ts[ts.length - 1]).toBe(60_000);
  });

  it("widens the step to stay within the sample budget, still covering the clip", () => {
    // 60s at ~30fps native (33.3ms) would be ~1800 samples; a 900 budget must
    // coarsen the step rather than truncate, so the end is still reached.
    const ts = analysisTimestamps({
      durationMs: 60_000,
      stepMs: 1000 / 30,
      maxSamples: 900,
      maxMs: 60_000,
    });
    expect(ts.length).toBeLessThanOrEqual(900);
    expect(ts[0]).toBe(0);
    expect(ts[ts.length - 1]).toBe(60_000);
  });

  it("is strictly increasing", () => {
    const ts = analysisTimestamps({ durationMs: 5000, stepMs: 200, ...CAPS });
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i]).toBeGreaterThan(ts[i - 1] ?? 0);
    }
  });

  it("handles an unknown/zero duration by sampling the first frame only", () => {
    const ts = analysisTimestamps({ durationMs: 0, stepMs: 100, ...CAPS });
    expect(ts).toEqual([0]);
  });
});
