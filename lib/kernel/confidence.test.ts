import { describe, expect, it } from "vitest";

import { crossValidateEvents, scoreConfidence } from "@/lib/kernel/confidence";

/*
 * The universal result-confidence gate. Every sport report carries one of
 * these, so a noisy capture surfaces as "we're not sure, re-film" instead of
 * a confident-looking wrong dashboard: the difference between a shrug and a
 * one-star review. Plus cross-validation: an event confirmed by two
 * independent signals is trustworthy, and the agreement rate feeds the score.
 */

describe("scoreConfidence", () => {
  const clean = {
    trackedFraction: 0.98,
    cycleDurationsMs: [1000, 1010, 990, 1005],
    cycleCount: 5,
    minCycles: 3,
    sideConfidence: 0.7,
  };

  it("rates a clean, steady, well-tracked capture high", () => {
    const c = scoreConfidence(clean);
    expect(c.level).toBe("high");
    expect(c.score).toBeGreaterThan(0.75);
    expect(c.reasons).toEqual([]);
  });

  it("drops to low when the subject was barely tracked", () => {
    const c = scoreConfidence({ ...clean, trackedFraction: 0.25 });
    expect(c.level).toBe("low");
    expect(c.reasons.join(" ")).toMatch(/see|track|frame|light/i);
  });

  it("drops when the rhythm is erratic (segmentation likely wrong)", () => {
    const c = scoreConfidence({
      ...clean,
      cycleDurationsMs: [1000, 400, 1600, 500, 1500],
    });
    expect(c.score).toBeLessThan(0.75);
    expect(c.reasons.join(" ")).toMatch(/rhythm|steady|even/i);
  });

  it("drops when only the bare minimum cycles were found", () => {
    const barely = scoreConfidence({ ...clean, cycleCount: 3, minCycles: 3 });
    const plenty = scoreConfidence({ ...clean, cycleCount: 8, minCycles: 3 });
    expect(barely.score).toBeLessThan(plenty.score);
  });

  it("factors in a weak side-vote (near coin-flip on which side faces the camera)", () => {
    const strong = scoreConfidence({ ...clean, sideConfidence: 0.8 });
    const weak = scoreConfidence({ ...clean, sideConfidence: 0.02 });
    expect(weak.score).toBeLessThan(strong.score);
  });

  it("rewards two-signal agreement when present", () => {
    const withAgreement = scoreConfidence({ ...clean, agreement: 1 });
    const disagreement = scoreConfidence({ ...clean, agreement: 0.2 });
    expect(withAgreement.score).toBeGreaterThan(disagreement.score);
  });

  it("stays in [0,1]", () => {
    const c = scoreConfidence({
      trackedFraction: 2,
      cycleDurationsMs: [],
      cycleCount: 0,
      minCycles: 3,
    });
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(1);
  });
});

describe("crossValidateEvents", () => {
  it("reports full agreement when two signals mark the same events", () => {
    const a = [500, 1500, 2500, 3500];
    const b = [520, 1490, 2510, 3480];
    const { agreement, confirmed } = crossValidateEvents(a, b, 80);
    expect(agreement).toBeCloseTo(1, 5);
    expect(confirmed).toBe(4);
  });

  it("reports partial agreement when a signal misses events", () => {
    const a = [500, 1500, 2500, 3500];
    const b = [510, 2490]; // only two of four confirmed
    const { agreement, confirmed } = crossValidateEvents(a, b, 80);
    expect(confirmed).toBe(2);
    expect(agreement).toBeCloseTo(0.5, 5);
  });

  it("does not confirm events outside the tolerance window", () => {
    const a = [500, 1500];
    const b = [900, 1900]; // both ~400ms off: no confirmations
    const { agreement, confirmed } = crossValidateEvents(a, b, 120);
    expect(confirmed).toBe(0);
    expect(agreement).toBe(0);
  });

  it("is empty-safe", () => {
    expect(crossValidateEvents([], [1, 2], 50)).toEqual({
      agreement: 0,
      confirmed: 0,
    });
  });
});
