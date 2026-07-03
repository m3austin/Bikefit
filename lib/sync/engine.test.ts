import { describe, expect, it } from "vitest";

import { runSync, type LocalStore, type RemoteStore } from "@/lib/sync/engine";
import { toRemoteRow, type RemoteRow, type SyncFit, type Tombstone } from "@/lib/sync/types";
import { computeFit, type FitInput } from "@/lib/engine";

const INPUT: FitInput = {
  bikeType: "road",
  priority: "balanced",
  flexibility: "medium",
  measurements: { heightMm: 1780, inseamMm: 820, torsoMm: 600, armMm: 640, shoulderMm: 420 },
};
const fit = (id: string, updatedAt: number, name = "Fit"): SyncFit => ({
  id, name, input: INPUT, result: computeFit(INPUT), createdAt: 1000, updatedAt,
});

function fakeRemote(initial: RemoteRow[] = []) {
  const rows = new Map(initial.map((r) => [r.id, r]));
  const store: RemoteStore = {
    async listFits() {
      return [...rows.values()];
    },
    async upsert(rs) {
      for (const r of rs) rows.set(r.id, { ...r, deletedAt: null });
    },
    async tombstone(items) {
      for (const it of items) {
        const ex = rows.get(it.id);
        if (ex) rows.set(it.id, { ...ex, deletedAt: it.deletedAt, updatedAt: it.deletedAt });
      }
    },
  };
  return { store, rows };
}

function fakeLocal(fits: SyncFit[] = [], tombs: Tombstone[] = []) {
  const f = new Map(fits.map((x) => [x.id, x]));
  const t = new Map(tombs.map((x) => [x.id, x]));
  const store: LocalStore = {
    async listFits() {
      return [...f.values()];
    },
    async listTombstones() {
      return [...t.values()];
    },
    async applyUpsert(x) {
      f.set(x.id, x);
      t.delete(x.id);
    },
    async applyDelete(tm) {
      f.delete(tm.id);
      t.set(tm.id, tm);
    },
  };
  return { store, f, t };
}

describe("runSync", () => {
  it("uploads a local-only fit (first sign-in)", async () => {
    const local = fakeLocal([fit("a", 100)]);
    const remote = fakeRemote();
    const res = await runSync(local.store, remote.store);
    expect(remote.rows.has("a")).toBe(true);
    expect(res.pushed).toBe(1);
  });

  it("pulls a remote-only fit down", async () => {
    const local = fakeLocal();
    const remote = fakeRemote([toRemoteRow(fit("b", 100))]);
    const res = await runSync(local.store, remote.store);
    expect(local.f.has("b")).toBe(true);
    expect(res.pulled).toBe(1);
  });

  it("resolves a conflict in favour of the newer side", async () => {
    const local = fakeLocal([fit("a", 100, "local")]);
    const remote = fakeRemote([toRemoteRow(fit("a", 200, "remote"))]);
    await runSync(local.store, remote.store);
    expect(local.f.get("a")!.name).toBe("remote"); // remote was newer
  });

  it("propagates a local delete as a remote tombstone", async () => {
    const local = fakeLocal([], [{ id: "a", deletedAt: 400 }]);
    const remote = fakeRemote([toRemoteRow(fit("a", 200))]);
    await runSync(local.store, remote.store);
    expect(remote.rows.get("a")!.deletedAt).toBe(400);
  });

  it("applies a remote delete locally", async () => {
    const local = fakeLocal([fit("a", 200)]);
    const remote = fakeRemote([{ ...toRemoteRow(fit("a", 200)), deletedAt: 500 }]);
    await runSync(local.store, remote.store);
    expect(local.f.has("a")).toBe(false);
    expect(local.t.get("a")!.deletedAt).toBe(500);
  });

  it("rejects when the remote is unreachable (offline)", async () => {
    const local = fakeLocal([fit("a", 100)]);
    const remote: RemoteStore = {
      listFits: () => Promise.reject(new Error("network")),
      upsert: async () => {},
      tombstone: async () => {},
    };
    await expect(runSync(local.store, remote)).rejects.toThrow("network");
  });
});
