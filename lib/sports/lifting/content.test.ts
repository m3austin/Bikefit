import { describe, expect, it } from "vitest";

import { GLOSSARY } from "@/lib/glossary";
import { LIFT_DRILLS, getLiftDrill } from "@/lib/sports/lifting/drills";
import { LIFTS, evaluateLift, getLift } from "@/lib/sports/lifting/lifts";

/*
 * Content-shape and engine-contract guards for LiftFit, mirroring the golf
 * and running suites: complete drills, valid glossary references, copy
 * discipline, deterministic rules, and per-lift config completeness. Every
 * lift's rule.adjust must point at a real drill; every metric carries a
 * sane PLACEHOLDER band.
 */

const CONTENT_TEXT =
  JSON.stringify(LIFT_DRILLS) +
  JSON.stringify(LIFTS.map((l) => ({ ...l, metrics: l.metrics.map((m) => ({ ...m, extract: undefined, across: undefined })) })));

const BANNED_WORDS = [
  "prescription",
  "diagnosis",
  "guaranteed",
  "perfect",
  "professional fit",
  "professional-grade",
];

describe("lifting drill catalog", () => {
  it("every drill is complete", () => {
    expect(LIFT_DRILLS.length).toBeGreaterThanOrEqual(6);
    for (const d of LIFT_DRILLS) {
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
    const ids = LIFT_DRILLS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of LIFT_DRILLS) {
      expect(getLiftDrill(d.id).id).toBe(d.id);
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

describe("lift configs", () => {
  it("bench, squat, and deadlift are all present", () => {
    const ids = LIFTS.map((l) => l.id).sort();
    expect(ids).toEqual(["bench", "deadlift", "squat"]);
  });

  it("every config is complete and its metric bands are sane", () => {
    for (const lift of LIFTS) {
      expect(lift.name.length, lift.id).toBeGreaterThan(0);
      expect(lift.tagline.length, lift.id).toBeGreaterThan(0);
      expect(lift.metrics.length, `${lift.id} metrics`).toBeGreaterThan(0);
      expect(lift.rules.length, `${lift.id} rules`).toBeGreaterThan(0);
      expect(lift.cues.length, `${lift.id} cues`).toBeGreaterThan(0);
      for (const m of lift.metrics) {
        expect(m.target.low, `${lift.id}.${m.id}`).toBeLessThanOrEqual(
          m.target.high,
        );
        expect(m.target.margin, `${lift.id}.${m.id}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("metric ids are unique within a lift", () => {
    for (const lift of LIFTS) {
      const ids = lift.metrics.map((m) => m.id);
      expect(new Set(ids).size, lift.id).toBe(ids.length);
    }
  });

  it("every drill-linked rule points at a real drill", () => {
    const ids = new Set(LIFT_DRILLS.map((d) => d.id));
    for (const lift of LIFTS) {
      for (const rule of lift.rules) {
        if (rule.adjust !== undefined) {
          expect(ids.has(rule.adjust), `${lift.id}/${rule.id}`).toBe(true);
        }
      }
    }
  });

  it("getLift resolves configs and rejects the unknown", () => {
    expect(getLift("squat")?.id).toBe("squat");
    expect(getLift("nope")).toBeUndefined();
  });

  it("the deadlift back-rounding rule is priority 1 (the marquee safety metric)", () => {
    const deadlift = getLift("deadlift");
    const rounding = deadlift?.rules.find((r) => r.id === "back-rounding");
    expect(rounding?.priority).toBe(1);
  });

  it("evaluate fires nothing when there are no measurements", () => {
    const squat = getLift("squat");
    if (!squat) throw new Error("no squat");
    const empty = {
      liftId: "squat",
      side: "left" as const,
      sideConfidence: 0,
      sampleCount: 0,
      analyzedMs: 0,
      repCount: 0,
      anchorTMs: [],
      lockoutTMs: [],
      repDurationStats: null,
      metrics: [],
      fatigueDrift: false,
      confidence: { score: 1, level: "high" as const, reasons: [] },
    };
    const { primary, secondary, verdicts } = evaluateLift(squat, empty);
    expect(primary).toBeNull();
    expect(secondary).toEqual([]);
    expect(verdicts).toEqual([]);
  });
});
