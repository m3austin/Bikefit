import { describe, expect, it } from "vitest";

import { planSync } from "@/lib/sync/merge";
import { toRemoteRow, type SyncFit } from "@/lib/sync/types";
import { computeFit, type FitInput } from "@/lib/engine";

const INPUT: FitInput = {
  bikeType: "road",
  priority: "balanced",
  flexibility: "medium",
  measurements: {
    heightMm: 1780,
    inseamMm: 820,
    torsoMm: 600,
    armMm: 640,
    shoulderMm: 420,
  },
};

function fit(id: string, updatedAt: number, name = "Fit"): SyncFit {
  return {
    id,
    name,
    input: INPUT,
    result: computeFit(INPUT),
    createdAt: 1000,
    updatedAt,
  };
}

describe("planSync", () => {
  it("first sign-in: uploads all local fits when the remote is empty", () => {
    const plan = planSync({
      localFits: [fit("a", 100), fit("b", 200)],
      localTombstones: [],
      remoteRows: [],
    });
    expect(plan.pushUpserts.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(plan.applyUpserts).toEqual([]);
    expect(plan.applyDeletes).toEqual([]);
  });

  it("pulls a remote fit that is not local", () => {
    const plan = planSync({
      localFits: [],
      localTombstones: [],
      remoteRows: [toRemoteRow(fit("a", 100))],
    });
    expect(plan.applyUpserts.map((f) => f.id)).toEqual(["a"]);
    expect(plan.pushUpserts).toEqual([]);
  });

  it("conflict: local newer wins (push up)", () => {
    const plan = planSync({
      localFits: [fit("a", 300, "local")],
      localTombstones: [],
      remoteRows: [toRemoteRow(fit("a", 200, "remote"))],
    });
    expect(plan.pushUpserts).toHaveLength(1);
    expect(plan.pushUpserts[0]!.name).toBe("local");
    expect(plan.applyUpserts).toEqual([]);
  });

  it("conflict: remote newer wins (apply local)", () => {
    const plan = planSync({
      localFits: [fit("a", 200, "local")],
      localTombstones: [],
      remoteRows: [toRemoteRow(fit("a", 300, "remote"))],
    });
    expect(plan.applyUpserts).toHaveLength(1);
    expect(plan.applyUpserts[0]!.name).toBe("remote");
    expect(plan.pushUpserts).toEqual([]);
  });

  it("equal updatedAt: no-op", () => {
    const plan = planSync({
      localFits: [fit("a", 200)],
      localTombstones: [],
      remoteRows: [toRemoteRow(fit("a", 200))],
    });
    expect(plan).toEqual({
      pushUpserts: [],
      pushTombstones: [],
      applyUpserts: [],
      applyDeletes: [],
    });
  });

  it("local delete propagates as a tombstone when the remote has the row", () => {
    const plan = planSync({
      localFits: [],
      localTombstones: [{ id: "a", deletedAt: 400 }],
      remoteRows: [toRemoteRow(fit("a", 200))],
    });
    expect(plan.pushTombstones).toEqual([{ id: "a", deletedAt: 400 }]);
    expect(plan.applyUpserts).toEqual([]);
  });

  it("remote delete is applied locally", () => {
    const plan = planSync({
      localFits: [fit("a", 200)],
      localTombstones: [],
      remoteRows: [{ ...toRemoteRow(fit("a", 200)), deletedAt: 500 }],
    });
    expect(plan.applyDeletes).toEqual([{ id: "a", deletedAt: 500 }]);
    expect(plan.pushUpserts).toEqual([]);
  });

  it("local tombstone for a fit never uploaded does nothing", () => {
    const plan = planSync({
      localFits: [],
      localTombstones: [{ id: "a", deletedAt: 400 }],
      remoteRows: [],
    });
    expect(plan).toEqual({
      pushUpserts: [],
      pushTombstones: [],
      applyUpserts: [],
      applyDeletes: [],
    });
  });

  it("an edit newer than a stale tombstone is treated as an upsert", () => {
    const plan = planSync({
      localFits: [fit("a", 500, "edited")],
      localTombstones: [{ id: "a", deletedAt: 300 }],
      remoteRows: [toRemoteRow(fit("a", 200))],
    });
    expect(plan.pushUpserts).toHaveLength(1);
    expect(plan.pushTombstones).toEqual([]);
  });
});
