import { describe, expect, it } from "vitest";

import { ADJUSTMENTS, SHOP_JOBS, getAdjustment } from "@/lib/sports/cycling/drills";
import { GLOSSARY, glossaryEntry, type GlossaryId } from "@/lib/glossary";

/*
 * Content-shape guards. The catalog is data, so its contract is testable:
 * complete sections, valid glossary references, and above all the torque
 * discipline: the app never prints a numeric torque value it invented.
 */

const CATALOG_TEXT = JSON.stringify(ADJUSTMENTS) + JSON.stringify(SHOP_JOBS);
const GLOSSARY_TEXT = JSON.stringify(GLOSSARY);

/** Digits immediately followed by a torque unit, e.g. "5 Nm", "6nm", "5 N·m". */
const TORQUE_NUMBER = /\d+(\.\d+)?\s*(nm\b|n·m|n-m|newton)/i;

const BANNED_WORDS = [
  "prescription",
  "diagnosis",
  "guaranteed",
  "perfect",
  "professional fit",
  "professional-grade",
];

describe("adjustments catalog shape", () => {
  it("every adjustment is complete", () => {
    expect(ADJUSTMENTS.length).toBeGreaterThanOrEqual(6);
    for (const a of ADJUSTMENTS) {
      expect(a.title.length, a.id).toBeGreaterThan(0);
      expect(a.why.length, a.id).toBeGreaterThan(0);
      expect(a.steps.length, `${a.id} steps`).toBeGreaterThan(0);
      expect(a.tools.length, `${a.id} tools`).toBeGreaterThan(0);
      expect(a.tips.length, `${a.id} tips`).toBeGreaterThan(0);
      expect(a.safety.length, `${a.id} safety`).toBeGreaterThan(0);
      expect(a.shopNote.length, `${a.id} shopNote`).toBeGreaterThan(0);
      expect(a.time.length, `${a.id} time`).toBeGreaterThan(0);
      for (const v of a.variants) {
        expect(v.steps.length, `${a.id}/${v.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("ids are unique and getAdjustment resolves each", () => {
    const ids = ADJUSTMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getAdjustment(id).id).toBe(id);
  });

  it("NEVER states a numeric torque value (hard safety rule)", () => {
    expect(CATALOG_TEXT).not.toMatch(TORQUE_NUMBER);
    expect(GLOSSARY_TEXT).not.toMatch(TORQUE_NUMBER);
  });

  it("carries no em dashes or banned words", () => {
    for (const text of [CATALOG_TEXT, GLOSSARY_TEXT]) {
      expect(text).not.toContain("—");
      const lower = text.toLowerCase();
      for (const word of BANNED_WORDS) {
        expect(lower, `banned word: ${word}`).not.toContain(word);
      }
    }
  });

  it("every glossary reference points at a real entry", () => {
    for (const a of ADJUSTMENTS) {
      expect(a.glossaryIds.length, a.id).toBeGreaterThan(0);
      for (const id of a.glossaryIds) {
        expect(GLOSSARY[id], `${a.id} -> ${id}`).toBeDefined();
      }
    }
  });

  it("every adjustment teaches torque discipline in tips or safety", () => {
    for (const a of ADJUSTMENTS) {
      const text = [...a.tips, ...a.safety].join(" ").toLowerCase();
      expect(text, `${a.id} should mention torque`).toContain("torque");
    }
  });
});

describe("glossary", () => {
  it("every entry has a term and a definition", () => {
    for (const [id, entry] of Object.entries(GLOSSARY)) {
      expect(entry.term.length, id).toBeGreaterThan(0);
      expect(entry.definition.length, id).toBeGreaterThan(20);
    }
  });

  it("glossaryEntry returns the entry for every id", () => {
    for (const id of Object.keys(GLOSSARY) as GlossaryId[]) {
      expect(glossaryEntry(id)).toBe(GLOSSARY[id]);
    }
  });
});
