import { describe, expect, it } from "vitest";

import { ADJUSTMENTS } from "@/lib/sports/cycling/drills";
import type { FrontalStrokeReport, StrokeReport } from "@/lib/sports/cycling/biomechanics";
import {
  FIT_RULES,
  TARGETS,
  computeMetricVerdicts,
  evaluateFitRules,
  extractMeasuredValues,
  verdictFor,
  type MeasuredValues,
} from "@/lib/sports/cycling/rules";

/*
 * The engine's SHAPE is under test here, not the numbers: every numeric
 * target and magnitude in lib/fit-rules.ts is a placeholder awaiting sourced
 * values, so these tests reference TARGETS rather than hardcoding thresholds.
 * When the placeholders are replaced, these tests keep passing.
 */

describe("verdictFor", () => {
  const target = { low: 140, high: 148, margin: 4, unit: "deg" } as const;

  it("classifies inside, marginal, and outside on both sides", () => {
    expect(verdictFor(144, target)).toBe("in_range");
    expect(verdictFor(140, target)).toBe("in_range");
    expect(verdictFor(148, target)).toBe("in_range");
    expect(verdictFor(138, target)).toBe("marginal");
    expect(verdictFor(151, target)).toBe("marginal");
    expect(verdictFor(135, target)).toBe("out_of_range");
    expect(verdictFor(153, target)).toBe("out_of_range");
  });
});

/** Minimal report literals for extraction tests. */
function sagittalReport(overrides: {
  kneeMean?: number;
  elbowMean?: number;
  torsoMean?: number;
  hipMin?: number;
}): StrokeReport {
  const stats = (mean: number, min = mean) => ({
    min,
    max: mean,
    mean,
    stdDev: 0,
    count: 5,
  });
  return {
    side: "right",
    sideConfidence: 0.9,
    sampleCount: 300,
    analyzedMs: 10_000,
    strokeCount: 10,
    cadenceRpm: 85,
    bdcTMs: [],
    threeOClockTMs: [],
    kneeAtBdcDeg: [],
    stats: {
      kneeAtBdc:
        overrides.kneeMean === undefined ? null : stats(overrides.kneeMean),
      hip:
        overrides.hipMin === undefined
          ? null
          : stats(70, overrides.hipMin),
      elbow:
        overrides.elbowMean === undefined ? null : stats(overrides.elbowMean),
      torso:
        overrides.torsoMean === undefined ? null : stats(overrides.torsoMean),
    },
    highVariance: false,
  };
}

function frontalReport(overrides: {
  leftPeakMean?: number;
  rightPeakMean?: number;
  hipDropMean?: number;
  timingMean?: number;
}): FrontalStrokeReport {
  const stats = (mean: number) => ({
    min: mean,
    max: mean,
    mean,
    stdDev: 0,
    count: 10,
  });
  return {
    sampleCount: 300,
    analyzedMs: 10_000,
    strokeCountLeft: 10,
    strokeCountRight: 10,
    cadenceRpm: 85,
    stats: {
      leftKneeDeviationPct: null,
      rightKneeDeviationPct: null,
      leftPeakDeviationPct:
        overrides.leftPeakMean === undefined
          ? null
          : stats(overrides.leftPeakMean),
      rightPeakDeviationPct:
        overrides.rightPeakMean === undefined
          ? null
          : stats(overrides.rightPeakMean),
      hipDropPct:
        overrides.hipDropMean === undefined
          ? null
          : stats(overrides.hipDropMean),
      timingOffsetDeg:
        overrides.timingMean === undefined
          ? null
          : stats(overrides.timingMean),
    },
    highVariance: false,
  };
}

describe("extractMeasuredValues", () => {
  it("flattens both reports, derives asymmetry and absolute hip drop", () => {
    const values = extractMeasuredValues(
      sagittalReport({ kneeMean: 144, elbowMean: 158, torsoMean: 42, hipMin: 55 }),
      frontalReport({
        leftPeakMean: 12,
        rightPeakMean: 4,
        hipDropMean: -3.5,
        timingMean: 181,
      }),
    );
    expect(values.kneeAtBdcMeanDeg).toBe(144);
    expect(values.hipMinDeg).toBe(55);
    expect(values.kneeDevAsymmetryPct).toBeCloseTo(8);
    // Hip drop direction (which hip) doesn't matter to the rules; magnitude does.
    expect(values.hipDropAbsMeanPct).toBeCloseTo(3.5);
    expect(values.timingOffsetMeanDeg).toBe(181);
  });

  it("leaves everything undefined when reports are missing", () => {
    const values = extractMeasuredValues(null, null);
    expect(Object.values(values).every((v) => v === undefined)).toBe(true);
  });

  it("skips metrics whose stats are null", () => {
    const values = extractMeasuredValues(sagittalReport({ kneeMean: 144 }), null);
    expect(values.kneeAtBdcMeanDeg).toBe(144);
    expect(values.elbowMeanDeg).toBeUndefined();
    expect(values.kneeDevAsymmetryPct).toBeUndefined();
  });
});

describe("computeMetricVerdicts", () => {
  it("emits one verdict per measured metric, none for missing ones", () => {
    const verdicts = computeMetricVerdicts({
      kneeAtBdcMeanDeg: TARGETS.kneeAtBdc.low + 1,
      leftPeakDevMeanPct: TARGETS.peakKneeDev.high + 100,
    });
    expect(verdicts.map((v) => v.id)).toEqual(["kneeAtBdc", "leftPeakDev"]);
    expect(verdicts[0]?.verdict).toBe("in_range");
    expect(verdicts[1]?.verdict).toBe("out_of_range");
  });
});

describe("evaluateFitRules", () => {
  it("returns no findings when everything is in range", () => {
    const values: MeasuredValues = {
      kneeAtBdcMeanDeg: (TARGETS.kneeAtBdc.low + TARGETS.kneeAtBdc.high) / 2,
      elbowMeanDeg: (TARGETS.elbow.low + TARGETS.elbow.high) / 2,
      torsoMeanDeg: (TARGETS.torso.low + TARGETS.torso.high) / 2,
      hipMinDeg: (TARGETS.hipMin.low + TARGETS.hipMin.high) / 2,
      leftPeakDevMeanPct: 5,
      rightPeakDevMeanPct: 5,
      kneeDevAsymmetryPct: 0,
      hipDropAbsMeanPct: 1,
      timingOffsetMeanDeg: 180,
    };
    const { primary, secondary, verdicts } = evaluateFitRules(values);
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
    expect(verdicts.every((v) => v.verdict === "in_range")).toBe(true);
  });

  it("makes a low saddle the primary over lower-priority findings", () => {
    const { primary, secondary } = evaluateFitRules({
      kneeAtBdcMeanDeg: TARGETS.kneeAtBdc.low - 6,
      elbowMeanDeg: TARGETS.elbow.high + 6,
      torsoMeanDeg: TARGETS.torso.high + 8,
    });
    expect(primary?.ruleId).toBe("saddle-too-low");
    expect(secondary.map((f) => f.ruleId)).toEqual([
      "reach-too-long",
      "bars-too-high",
    ]);
    // Priorities are non-decreasing down the secondary list.
    const priorities = secondary.map((f) => f.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });

  it("never fires a rule on an unmeasured metric", () => {
    const { primary, secondary } = evaluateFitRules({});
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
  });

  it("ties at the same priority resolve by rule order (deterministic)", () => {
    // Both knee-collapse rules trigger at priority 2; left is defined first.
    const { primary, secondary } = evaluateFitRules({
      leftPeakDevMeanPct: TARGETS.peakKneeDev.high + 10,
      rightPeakDevMeanPct: TARGETS.peakKneeDev.high + 10,
    });
    expect(primary?.ruleId).toBe("left-knee-collapse");
    expect(secondary[0]?.ruleId).toBe("right-knee-collapse");
  });

  it("every wrench-actionable rule deep-links to a real /adjust procedure", () => {
    const validIds = new Set(ADJUSTMENTS.map((a) => a.id));
    for (const rule of FIT_RULES) {
      if (rule.recommendation.direction === "recheck") {
        // Re-record / in-person findings have no wrench procedure to link.
        expect(rule.adjust, rule.id).toBeUndefined();
      } else {
        expect(rule.adjust, `${rule.id} should link a procedure`).toBeDefined();
        expect(validIds.has(rule.adjust ?? "saddle-height"), rule.id).toBe(true);
      }
    }
  });

  it("every rule can fire and carries a complete recommendation", () => {
    // A pathological rider outside every target on the triggering side.
    const everything: MeasuredValues = {
      kneeAtBdcMeanDeg: TARGETS.kneeAtBdc.low - 20,
      elbowMeanDeg: TARGETS.elbow.high + 20,
      torsoMeanDeg: TARGETS.torso.low - 20,
      hipMinDeg: TARGETS.hipMin.low - 20,
      leftPeakDevMeanPct: TARGETS.peakKneeDev.high + 20,
      rightPeakDevMeanPct: TARGETS.peakKneeDev.low - 20,
      kneeDevAsymmetryPct: TARGETS.kneeDevAsymmetry.high + 20,
      hipDropAbsMeanPct: TARGETS.hipDropAbs.high + 20,
      timingOffsetMeanDeg: TARGETS.timingOffset.high + 20,
    };
    const { primary, secondary } = evaluateFitRules(everything);
    const all = [primary, ...secondary].filter(
      (f): f is NonNullable<typeof f> => f !== null,
    );
    // Mutually exclusive pairs (e.g. saddle low vs high) can't fire together.
    expect(all.length).toBeGreaterThanOrEqual(7);
    for (const finding of all) {
      expect(finding.action.length).toBeGreaterThan(0);
      expect(finding.direction.length).toBeGreaterThan(0);
      expect(finding.magnitude.length).toBeGreaterThan(0);
      expect(FIT_RULES.some((r) => r.id === finding.ruleId)).toBe(true);
    }
  });
});
