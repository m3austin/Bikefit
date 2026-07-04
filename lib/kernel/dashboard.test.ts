import { describe, expect, it } from "vitest";

import type { TargetRange } from "@/lib/kernel/rules";
import { buildScoreBoard, type MetricInput } from "@/lib/kernel/dashboard";

const t = (low: number, high: number, margin: number): TargetRange => ({
  low,
  high,
  margin,
  unit: "deg",
});

const metric = (over: Partial<MetricInput>): MetricInput => ({
  key: "k",
  label: "Metric",
  hint: "hint",
  value: 20,
  target: t(10, 30, 5),
  verdict: "in_range",
  ...over,
});

describe("buildScoreBoard", () => {
  it("scores each category and averages the overall", () => {
    const board = buildScoreBoard([
      metric({ key: "a", value: 20, verdict: "in_range" }),
      metric({ key: "b", value: 20, verdict: "in_range" }),
      metric({ key: "c", value: 40, verdict: "out_of_range" }), // two margins out -> 2.5
    ]);
    expect(board.categories.map((c) => c.score)).toEqual([10, 10, 2.5]);
    expect(board.overall).toBe(7.5); // (10+10+2.5)/3
    expect(board.grade?.label).toBe("Looking strong");
  });

  it("collects in-range metrics as highlights, best first", () => {
    const board = buildScoreBoard([
      metric({ key: "a", verdict: "out_of_range", value: 40 }),
      metric({ key: "b", verdict: "in_range", value: 20 }),
      metric({ key: "c", verdict: "in_range", value: 15 }),
    ]);
    expect(board.highlights.map((h) => h.key)).toEqual(["b", "c"]);
    expect(board.highlights.every((h) => h.tone === "great")).toBe(true);
  });

  it("writes a directional plain read for each verdict", () => {
    const under = buildScoreBoard([
      metric({ value: 4, verdict: "out_of_range" }),
    ]).categories[0];
    const over = buildScoreBoard([
      metric({ value: 40, verdict: "out_of_range" }),
    ]).categories[0];
    const inRange = buildScoreBoard([
      metric({ value: 20, verdict: "in_range" }),
    ]).categories[0];
    expect(under?.plain).toContain("Under");
    expect(over?.plain).toContain("Over");
    expect(inRange?.plain).toContain("Right in");
  });

  it("has no overall or grade when nothing was measured", () => {
    const board = buildScoreBoard([]);
    expect(board.overall).toBeNull();
    expect(board.grade).toBeNull();
    expect(board.highlights).toEqual([]);
  });

  it("a flawless set scores 10 and grades dialed in", () => {
    const board = buildScoreBoard([
      metric({ key: "a", verdict: "in_range" }),
      metric({ key: "b", verdict: "in_range" }),
    ]);
    expect(board.overall).toBe(10);
    expect(board.grade?.label).toBe("Dialed in");
  });
});
