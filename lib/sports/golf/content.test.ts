import { describe, expect, it } from "vitest";

import { GLOSSARY } from "@/lib/glossary";
import { CLUBFIT_RANGES, clubLengthAdjustment } from "@/lib/sports/golf/clubfit";
import { GOLF_DRILLS, getGolfDrill } from "@/lib/sports/golf/drills";
import {
  GOLF_RULES,
  GOLF_TARGETS,
  computeGolfVerdicts,
  evaluateGolfRules,
  extractMeasuredSwing,
} from "@/lib/sports/golf/rules";
import type { SwingReport } from "@/lib/sports/golf/biomechanics";

/*
 * Content-shape and engine-contract guards for GolfFit, mirroring the
 * cycling suites: complete drills, valid glossary references, copy
 * discipline, and deterministic rules. Tests reference GOLF_TARGETS rather
 * than hardcoding numbers, so replacing the placeholders keeps them green.
 */

const CONTENT_TEXT = JSON.stringify(GOLF_DRILLS) + JSON.stringify(GOLF_RULES);

const BANNED_WORDS = [
  "prescription",
  "diagnosis",
  "guaranteed",
  "perfect",
  "professional fit",
  "professional-grade",
];

describe("golf drill catalog", () => {
  it("every drill is complete", () => {
    expect(GOLF_DRILLS.length).toBeGreaterThanOrEqual(6);
    for (const d of GOLF_DRILLS) {
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
    const ids = GOLF_DRILLS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of GOLF_DRILLS) {
      expect(getGolfDrill(d.id).id).toBe(d.id);
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

describe("club length calculator", () => {
  it("walks the placeholder chart from short to long", () => {
    expect(clubLengthAdjustment(1700, 700).deltaInches).toBe(-1);
    expect(clubLengthAdjustment(1700, 760).deltaInches).toBe(-0.5);
    expect(clubLengthAdjustment(1700, 840).deltaInches).toBe(0);
    expect(clubLengthAdjustment(1700, 900).deltaInches).toBe(0.5);
    expect(clubLengthAdjustment(1700, 990).deltaInches).toBe(1);
  });

  it("nudges the extremes of height by a quarter step", () => {
    expect(clubLengthAdjustment(1960, 840).deltaInches).toBe(0.25);
    expect(clubLengthAdjustment(1500, 840).deltaInches).toBe(-0.25);
  });

  it("labels standard as standard", () => {
    expect(clubLengthAdjustment(1750, 840).label).toBe("Standard length");
  });

  it("exposes plausible ranges for the challenge state", () => {
    expect(CLUBFIT_RANGES.height.minMm).toBeLessThan(
      CLUBFIT_RANGES.height.maxMm,
    );
    expect(CLUBFIT_RANGES.wristToFloor.minMm).toBeLessThan(
      CLUBFIT_RANGES.wristToFloor.maxMm,
    );
  });
});

function report(overrides: Partial<SwingReport>): SwingReport {
  return {
    view: "dtl",
    sampleCount: 80,
    analyzedMs: 2600,
    phases: {
      addressTMs: 100,
      takeawayTMs: 600,
      topTMs: 1400,
      impactTMs: 1700,
      followTMs: 2100,
    },
    tempoRatio: 2.7,
    spineAtAddressDeg: 12,
    spineChangeDeg: 4,
    headDriftPct: 8,
    shoulderTurnPct: null,
    hipTurnPct: null,
    xFactorPct: null,
    hipSlidePct: null,
    leadArmAtTopDeg: null,
    ...overrides,
  };
}

describe("golf rules engine", () => {
  it("merges DTL and face-on reports, DTL first for shared metrics", () => {
    const v = extractMeasuredSwing(
      report({ headDriftPct: 8, tempoRatio: 2.7 }),
      report({
        view: "face",
        headDriftPct: 20,
        tempoRatio: 2.1,
        shoulderTurnPct: 42,
        hipTurnPct: 18,
        hipSlidePct: 12,
        leadArmAtTopDeg: 168,
      }),
    );
    expect(v.headDriftPct).toBe(8);
    expect(v.tempoRatio).toBe(2.7);
    expect(v.shoulderTurnPct).toBe(42);
    expect(v.hipSlidePct).toBe(12);
  });

  it("returns no findings when everything is in range", () => {
    const { primary, secondary, verdicts } = evaluateGolfRules({
      tempoRatio: (GOLF_TARGETS.tempo.low + GOLF_TARGETS.tempo.high) / 2,
      spineChangeDeg: GOLF_TARGETS.spineChange.high - 1,
      headDriftPct: GOLF_TARGETS.headDrift.high - 1,
      shoulderTurnPct:
        (GOLF_TARGETS.shoulderTurn.low + GOLF_TARGETS.shoulderTurn.high) / 2,
      hipTurnPct: (GOLF_TARGETS.hipTurn.low + GOLF_TARGETS.hipTurn.high) / 2,
      hipSlidePct: GOLF_TARGETS.hipSlide.high - 1,
      leadArmAtTopDeg: GOLF_TARGETS.leadArmAtTop.low + 5,
    });
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
    expect(verdicts.every((x) => x.verdict === "in_range")).toBe(true);
  });

  it("spine loss beats lower-priority findings for the one change", () => {
    const { primary, secondary } = evaluateGolfRules({
      spineChangeDeg: GOLF_TARGETS.spineChange.high + 5,
      tempoRatio: GOLF_TARGETS.tempo.low - 0.5,
      shoulderTurnPct: GOLF_TARGETS.shoulderTurn.low - 10,
    });
    expect(primary?.ruleId).toBe("spine-angle-loss");
    const priorities = secondary.map((f) => f.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });

  it("never fires on unmeasured metrics", () => {
    const { primary, secondary } = evaluateGolfRules({});
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
  });

  it("every drill-linked rule points at a real drill", () => {
    const ids = new Set(GOLF_DRILLS.map((d) => d.id));
    for (const rule of GOLF_RULES) {
      if (rule.adjust !== undefined) {
        expect(ids.has(rule.adjust), rule.id).toBe(true);
      }
    }
  });

  it("verdicts only cover measured metrics", () => {
    const verdicts = computeGolfVerdicts({ tempoRatio: 3 });
    expect(verdicts.map((v) => v.id)).toEqual(["tempo"]);
  });
});
