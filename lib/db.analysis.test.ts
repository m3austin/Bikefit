import { beforeEach, describe, expect, it } from "vitest";

import {
  eraseAll,
  latestAnalysis,
  listAnalyses,
  saveAnalysis,
  type SavedMetric,
} from "@/lib/db";

/*
 * Saved-analysis storage and lookup. jsdom has no IndexedDB, so db.ts falls
 * back to its in-memory store; eraseAll resets it between tests.
 */

const metric = (key: string, value: number, score: number): SavedMetric => ({
  key,
  label: key,
  value,
  target: { low: 0, high: 10, margin: 2, unit: "deg" },
  verdict: "in_range",
  score,
});

// Two saves in the same millisecond would tie on createdAt; a tiny gap keeps
// ordering deterministic.
const tick = () => new Promise((r) => setTimeout(r, 2));

beforeEach(async () => {
  await eraseAll();
});

describe("saved analyses", () => {
  it("has no previous when nothing is saved", async () => {
    expect(await latestAnalysis("golf", "swing")).toBeUndefined();
  });

  it("returns the most recent for a sport+variant", async () => {
    await saveAnalysis({
      sport: "golf",
      variant: "swing",
      overall: 7,
      metrics: [metric("tempo", 3, 8)],
    });
    await tick();
    const second = await saveAnalysis({
      sport: "golf",
      variant: "swing",
      overall: 8,
      metrics: [metric("tempo", 3, 9)],
    });
    const latest = await latestAnalysis("golf", "swing");
    expect(latest?.id).toBe(second.id);
    expect(latest?.overall).toBe(8);
  });

  it("scopes strictly by sport and variant", async () => {
    await saveAnalysis({ sport: "golf", variant: "swing", overall: 7, metrics: [] });
    await saveAnalysis({ sport: "lifting", variant: "squat", overall: 5, metrics: [] });
    await saveAnalysis({ sport: "lifting", variant: "bench", overall: 6, metrics: [] });
    expect((await latestAnalysis("golf", "swing"))?.overall).toBe(7);
    expect((await latestAnalysis("lifting", "squat"))?.overall).toBe(5);
    expect((await latestAnalysis("lifting", "bench"))?.overall).toBe(6);
    expect(await latestAnalysis("golf", "face")).toBeUndefined();
  });

  it("excludes a just-saved row via beforeId (gets the prior one)", async () => {
    const a = await saveAnalysis({ sport: "golf", variant: "swing", overall: 7, metrics: [] });
    await tick();
    const b = await saveAnalysis({ sport: "golf", variant: "swing", overall: 8, metrics: [] });
    expect((await latestAnalysis("golf", "swing", b.id))?.id).toBe(a.id);
  });

  it("lists a sport's analyses newest first, ignoring other sports", async () => {
    await saveAnalysis({ sport: "golf", variant: "swing", overall: 7, metrics: [] });
    await tick();
    await saveAnalysis({ sport: "golf", variant: "swing", overall: 8, metrics: [] });
    await saveAnalysis({ sport: "running", variant: "gait", overall: 6, metrics: [] });
    const list = await listAnalyses("golf");
    expect(list.map((a) => a.overall)).toEqual([8, 7]);
  });

  it("erase everything clears saved analyses", async () => {
    await saveAnalysis({ sport: "golf", variant: "swing", overall: 7, metrics: [] });
    await eraseAll();
    expect(await latestAnalysis("golf", "swing")).toBeUndefined();
  });
});
