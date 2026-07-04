import { describe, expect, it } from "vitest";

import type { TargetRange } from "@/lib/kernel/rules";
import {
  gradeFor,
  overallScore,
  techniqueScore,
  toneForVerdict,
} from "@/lib/kernel/scoring";

const range = (low: number, high: number, margin: number): TargetRange => ({
  low,
  high,
  margin,
  unit: "deg",
});

describe("techniqueScore", () => {
  const t = range(10, 30, 5);

  it("scores a value anywhere in range a flat 10", () => {
    expect(techniqueScore(10, t)).toBe(10);
    expect(techniqueScore(20, t)).toBe(10);
    expect(techniqueScore(30, t)).toBe(10);
  });

  it("decays smoothly and symmetrically outside the range", () => {
    // One margin out (value 35, high 30, margin 5): 10 / (1 + 0.75) = 5.7.
    expect(techniqueScore(35, t)).toBeCloseTo(5.7, 1);
    expect(techniqueScore(5, t)).toBeCloseTo(5.7, 1);
    // Two margins out: 10 / (1 + 0.75*4) = 2.5.
    expect(techniqueScore(40, t)).toBeCloseTo(2.5, 1);
    expect(techniqueScore(0, t)).toBeCloseTo(2.5, 1);
  });

  it("keeps falling but never below zero", () => {
    const far = techniqueScore(200, t);
    expect(far).toBeGreaterThanOrEqual(0);
    expect(far).toBeLessThan(1);
  });

  it("never divides by zero on a hard (zero-margin) boundary", () => {
    const hard = range(10, 30, 0);
    expect(techniqueScore(20, hard)).toBe(10);
    const out = techniqueScore(40, hard);
    expect(Number.isFinite(out)).toBe(true);
    expect(out).toBeLessThan(10);
  });

  it("aligns with the verdict bands: in=10, marginal 5.7-10, out <5.7", () => {
    expect(techniqueScore(30, t)).toBe(10); // range edge, in_range
    expect(techniqueScore(34, t)).toBeGreaterThan(5.7); // inside margin
    expect(techniqueScore(36, t)).toBeLessThan(5.7); // beyond margin
  });
});

describe("overallScore", () => {
  it("is the mean of the sub-scores to one decimal", () => {
    expect(overallScore([10, 10, 10, 10])).toBe(10);
    expect(overallScore([10, 10, 10, 2])).toBe(8); // (32)/4
    expect(overallScore([9.4, 7.2, 5.1])).toBe(7.2);
  });

  it("has no score for no metrics", () => {
    expect(overallScore([])).toBeNull();
  });

  it("one bad category dents but does not tank a strong set", () => {
    const s = overallScore([10, 10, 10, 10, 2]);
    expect(s).toBe(8.4);
  });
});

describe("gradeFor", () => {
  it("labels each band and never says perfect", () => {
    const labels = [10, 8, 6.5, 5, 2].map((s) => gradeFor(s).label);
    expect(labels).toEqual([
      "Dialed in",
      "Looking strong",
      "Solid, room to grow",
      "Worth some work",
      "Lots to gain",
    ]);
    for (const l of labels) expect(l.toLowerCase()).not.toContain("perfect");
  });

  it("maps tones for coloring", () => {
    expect(gradeFor(9.5).tone).toBe("great");
    expect(gradeFor(2).tone).toBe("work");
  });
});

describe("toneForVerdict", () => {
  it("keeps a category chip and its ring in agreement", () => {
    expect(toneForVerdict("in_range")).toBe("great");
    expect(toneForVerdict("marginal")).toBe("watch");
    expect(toneForVerdict("out_of_range")).toBe("work");
  });
});
