import { describe, expect, it } from "vitest";

import { GLOSSARY } from "@/lib/glossary";
import { SWIM_DRILLS, getSwimDrill } from "@/lib/sports/swimming/drills";
import {
  SWIM_RULES,
  SWIM_TARGETS,
  computeSwimVerdicts,
  evaluateSwimRules,
  extractMeasuredSwim,
} from "@/lib/sports/swimming/rules";
import type { SwimReport } from "@/lib/sports/swimming/biomechanics";

/*
 * Content-shape and engine-contract guards for SwimFit, mirroring the other
 * sports: complete drills, valid glossary references, copy discipline, and
 * deterministic rules. Every rule is capped LOW confidence except none here
 * (stroke rate has no rule that fires high-confidence): a beta-appropriate
 * contract. Tests reference SWIM_TARGETS rather than hardcoding numbers.
 */

const CONTENT_TEXT = JSON.stringify(SWIM_DRILLS) + JSON.stringify(SWIM_RULES);

const BANNED_WORDS = [
  "prescription",
  "diagnosis",
  "guaranteed",
  "perfect",
  "professional fit",
  "professional-grade",
];

describe("swimming drill catalog", () => {
  it("every drill is complete", () => {
    expect(SWIM_DRILLS.length).toBeGreaterThanOrEqual(4);
    for (const d of SWIM_DRILLS) {
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
    const ids = SWIM_DRILLS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of SWIM_DRILLS) {
      expect(getSwimDrill(d.id).id).toBe(d.id);
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

describe("swim targets and beta discipline", () => {
  it("every target band is sane", () => {
    for (const [id, t] of Object.entries(SWIM_TARGETS)) {
      expect(t.low, id).toBeLessThanOrEqual(t.high);
      expect(t.margin, id).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps every rule at low confidence (beta, weak proxies)", () => {
    for (const rule of SWIM_RULES) {
      expect(rule.confidence, rule.id).toBe("low");
    }
  });

  it("every drill-linked rule points at a real drill", () => {
    const ids = new Set(SWIM_DRILLS.map((d) => d.id));
    for (const rule of SWIM_RULES) {
      if (rule.adjust !== undefined) {
        expect(ids.has(rule.adjust), rule.id).toBe(true);
      }
    }
  });
});

function report(overrides: Partial<SwimReport>): SwimReport {
  const stats = (mean: number) => ({
    min: mean,
    max: mean,
    mean,
    stdDev: 0,
    count: 6,
  });
  return {
    side: "left",
    sideConfidence: 0.7,
    meanVisibility: 0.8,
    lowConfidence: false,
    sampleCount: 200,
    analyzedMs: 7000,
    strokeCount: 6,
    catchTMs: [600, 1800, 3000, 4200, 5400, 6600],
    recoveryTMs: [1200, 2400, 3600, 4800, 6000],
    strokeRateSpm: 65,
    rhythmCvPct: 3,
    bodyRollPct: stats(18),
    headLiftPct: stats(10),
    elbowRecoveryPct: stats(35),
    confidence: { score: 1, level: "high", reasons: [] },
    ...overrides,
  };
}

describe("swimming rules engine", () => {
  it("extracts the rule snapshot from a report", () => {
    const v = extractMeasuredSwim(report({}));
    expect(v.strokeRateSpm).toBe(65);
    expect(v.headLiftPct).toBe(10);
    expect(v.elbowRecoveryPct).toBe(35);
    expect(v.bodyRollPct).toBe(18);
  });

  it("returns no findings when everything is in range", () => {
    const { primary, secondary, verdicts } = evaluateSwimRules({
      strokeRateSpm:
        (SWIM_TARGETS.strokeRate.low + SWIM_TARGETS.strokeRate.high) / 2,
      headLiftPct: SWIM_TARGETS.headLift.high - 1,
      elbowRecoveryPct:
        (SWIM_TARGETS.elbowRecovery.low + SWIM_TARGETS.elbowRecovery.high) / 2,
      bodyRollPct: (SWIM_TARGETS.bodyRoll.low + SWIM_TARGETS.bodyRoll.high) / 2,
    });
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
    expect(verdicts.every((x) => x.verdict === "in_range")).toBe(true);
  });

  it("head-high beats lower-priority findings for the one change", () => {
    const { primary, secondary } = evaluateSwimRules({
      headLiftPct: SWIM_TARGETS.headLift.high + 10,
      elbowRecoveryPct: SWIM_TARGETS.elbowRecovery.low - 5,
      bodyRollPct: SWIM_TARGETS.bodyRoll.low - 5,
    });
    expect(primary?.ruleId).toBe("head-high");
    const priorities = secondary.map((f) => f.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });

  it("never fires on unmeasured metrics", () => {
    const { primary, secondary } = evaluateSwimRules({});
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
  });

  it("verdicts only cover measured metrics, stroke rate first", () => {
    const verdicts = computeSwimVerdicts({ bodyRollPct: 18, strokeRateSpm: 65 });
    expect(verdicts.map((v) => v.id)).toEqual(["strokeRate", "bodyRoll"]);
  });
});
