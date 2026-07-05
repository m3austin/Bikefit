import { describe, expect, it } from "vitest";

import { GLOSSARY } from "@/lib/glossary";
import { RUN_DRILLS, getRunDrill } from "@/lib/sports/running/drills";
import {
  RUN_RULES,
  RUN_TARGETS,
  computeRunVerdicts,
  evaluateRunRules,
  extractMeasuredGait,
} from "@/lib/sports/running/rules";
import type { GaitReport, RearGaitReport } from "@/lib/sports/running/biomechanics";

/*
 * Content-shape and engine-contract guards for RunFit, mirroring the golf
 * suites: complete drills, valid glossary references, copy discipline, and
 * deterministic rules. Tests reference RUN_TARGETS rather than hardcoding
 * numbers, so replacing the placeholders keeps them green.
 */

const CONTENT_TEXT = JSON.stringify(RUN_DRILLS) + JSON.stringify(RUN_RULES);

const BANNED_WORDS = [
  "prescription",
  "diagnosis",
  "guaranteed",
  "perfect",
  "professional fit",
  "professional-grade",
];

describe("running drill catalog", () => {
  it("every drill is complete", () => {
    expect(RUN_DRILLS.length).toBeGreaterThanOrEqual(5);
    for (const d of RUN_DRILLS) {
      expect(d.title.length, d.id).toBeGreaterThan(0);
      expect(d.why.length, d.id).toBeGreaterThan(0);
      expect(d.steps.length, `${d.id} steps`).toBeGreaterThan(0);
      expect(d.gear.length, `${d.id} gear`).toBeGreaterThan(0);
      expect(d.tips.length, `${d.id} tips`).toBeGreaterThan(0);
      expect(d.coachNote.length, `${d.id} coachNote`).toBeGreaterThan(0);
      expect(d.time.length, `${d.id} time`).toBeGreaterThan(0);
    }
  });

  it("ids are unique and resolvable, glossary refs are real", () => {
    const ids = RUN_DRILLS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of RUN_DRILLS) {
      expect(getRunDrill(d.id).id).toBe(d.id);
      for (const g of d.glossaryIds) {
        expect(GLOSSARY[g], `${d.id} -> ${g}`).toBeDefined();
      }
    }
  });

  it("carries no em dashes or banned words", () => {
    expect(CONTENT_TEXT).not.toContain("—");
    const lower = CONTENT_TEXT.toLowerCase();
    for (const word of BANNED_WORDS) {
      expect(lower, `banned word: ${word}`).not.toContain(word);
    }
  });
});

describe("run targets", () => {
  it("every target band is sane", () => {
    for (const [id, t] of Object.entries(RUN_TARGETS)) {
      expect(t.low, id).toBeLessThanOrEqual(t.high);
      expect(t.margin, id).toBeGreaterThanOrEqual(0);
    }
  });
});

function sideReport(overrides: Partial<GaitReport>): GaitReport {
  const stats = (mean: number) => ({
    min: mean,
    max: mean,
    mean,
    stdDev: 0,
    count: 6,
  });
  return {
    side: "left",
    sideConfidence: 0.8,
    sampleCount: 150,
    analyzedMs: 4900,
    strideCount: 6,
    cadenceSpm: 172,
    contactTMs: [350, 1050, 1750, 2450, 3150, 3850, 4550],
    toeOffTMs: [500, 1200, 1900, 2600, 3300, 4000],
    overstridePct: stats(15),
    kneeFlexAtContactDeg: stats(18),
    verticalOscillationPct: stats(8),
    trunkLeanDeg: stats(6),
    footStrike: { heel: 5, mid: 1, fore: 0, label: "heel" },
    highVariance: false,
    confidence: { score: 1, level: "high", reasons: [] },
    ...overrides,
  };
}

function rearReport(overrides: Partial<RearGaitReport>): RearGaitReport {
  const stats = (mean: number) => ({
    min: mean,
    max: mean,
    mean,
    stdDev: 0,
    count: 6,
  });
  return {
    sampleCount: 150,
    analyzedMs: 4900,
    strideCountLeft: 6,
    strideCountRight: 6,
    cadenceSpm: 168,
    contactTMsLeft: [350, 1050, 1750, 2450, 3150, 3850, 4550],
    contactTMsRight: [700, 1400, 2100, 2800, 3500, 4200],
    pelvicDropLeftStancePct: stats(8),
    pelvicDropRightStancePct: stats(14),
    stanceWidthLeftPct: stats(55),
    stanceWidthRightPct: stats(52),
    ...overrides,
  };
}

describe("running rules engine", () => {
  it("merges side and rear reports, side first for cadence", () => {
    const v = extractMeasuredGait(sideReport({}), rearReport({}));
    expect(v.cadenceSpm).toBe(172);
    expect(v.overstridePct).toBe(15);
    // Pelvic drop takes the worse stance side.
    expect(v.pelvicDropPct).toBe(14);
  });

  it("takes the rear cadence when there is no side view", () => {
    const v = extractMeasuredGait(null, rearReport({}));
    expect(v.cadenceSpm).toBe(168);
    expect(v.overstridePct).toBeUndefined();
  });

  it("returns no findings when everything is in range", () => {
    const { primary, secondary, verdicts } = evaluateRunRules({
      cadenceSpm: (RUN_TARGETS.cadence.low + RUN_TARGETS.cadence.high) / 2,
      overstridePct: RUN_TARGETS.overstride.high - 1,
      kneeFlexAtContactDeg:
        (RUN_TARGETS.kneeFlexAtContact.low +
          RUN_TARGETS.kneeFlexAtContact.high) /
        2,
      verticalOscillationPct: RUN_TARGETS.verticalOscillation.high - 1,
      trunkLeanDeg: (RUN_TARGETS.trunkLean.low + RUN_TARGETS.trunkLean.high) / 2,
      pelvicDropPct: RUN_TARGETS.pelvicDrop.high - 1,
    });
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
    expect(verdicts.every((x) => x.verdict === "in_range")).toBe(true);
  });

  it("low cadence beats every other finding for the one change", () => {
    const { primary, secondary } = evaluateRunRules({
      cadenceSpm: RUN_TARGETS.cadence.low - 15,
      overstridePct: RUN_TARGETS.overstride.high + 10,
      trunkLeanDeg: RUN_TARGETS.trunkLean.high + 5,
    });
    expect(primary?.ruleId).toBe("cadence-low");
    const priorities = secondary.map((f) => f.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });

  it("never fires on unmeasured metrics", () => {
    const { primary, secondary } = evaluateRunRules({});
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
  });

  it("never judges the foot strike", () => {
    // No target and no rule may mention foot strike: reported, not judged.
    expect(Object.keys(RUN_TARGETS)).not.toContain("footStrike");
    for (const rule of RUN_RULES) {
      expect(rule.id).not.toContain("strike");
    }
  });

  it("every drill-linked rule points at a real drill", () => {
    const ids = new Set(RUN_DRILLS.map((d) => d.id));
    for (const rule of RUN_RULES) {
      if (rule.adjust !== undefined) {
        expect(ids.has(rule.adjust), rule.id).toBe(true);
      }
    }
  });

  it("verdicts only cover measured metrics, cadence first", () => {
    const verdicts = computeRunVerdicts({ trunkLeanDeg: 6, cadenceSpm: 172 });
    expect(verdicts.map((v) => v.id)).toEqual(["cadence", "trunkLean"]);
  });
});
