/*
 * Pure two-way sync planner (Flow 7). Deterministic last-write-wins by
 * updatedAt, with tombstones for deletes. Given the local fits, local
 * tombstones, and the remote rows, it returns what to push up and what to apply
 * locally. No IO, so every branch (conflict, first-upload, tombstone) is unit
 * testable. First-sign-in upload is just the case where the remote is empty.
 */

import {
  fromRemoteRow,
  toRemoteRow,
  type RemoteRow,
  type SyncFit,
  type Tombstone,
} from "@/lib/sync/types";

export type SyncPlan = {
  pushUpserts: RemoteRow[];
  pushTombstones: Tombstone[];
  applyUpserts: SyncFit[];
  applyDeletes: Tombstone[];
};

export function planSync(input: {
  localFits: SyncFit[];
  localTombstones: Tombstone[];
  remoteRows: RemoteRow[];
}): SyncPlan {
  const localFits = new Map(input.localFits.map((f) => [f.id, f]));
  const localTombs = new Map(input.localTombstones.map((t) => [t.id, t]));
  const remote = new Map(input.remoteRows.map((r) => [r.id, r]));

  const ids = new Set<string>([
    ...localFits.keys(),
    ...localTombs.keys(),
    ...remote.keys(),
  ]);

  const plan: SyncPlan = {
    pushUpserts: [],
    pushTombstones: [],
    applyUpserts: [],
    applyDeletes: [],
  };

  for (const id of ids) {
    const fit = localFits.get(id);
    const tomb = localTombs.get(id);
    const row = remote.get(id);

    // Latest local event: a delete wins over an older edit and vice versa.
    const localDelete = tomb && (!fit || tomb.deletedAt >= fit.updatedAt);
    const localTime = localDelete
      ? tomb!.deletedAt
      : (fit?.updatedAt ?? Number.NEGATIVE_INFINITY);

    const remoteDelete = row?.deletedAt != null;
    const remoteTime = row
      ? (row.deletedAt ?? row.updatedAt)
      : Number.NEGATIVE_INFINITY;

    if (localTime === remoteTime) continue; // already in sync

    if (localTime > remoteTime) {
      if (localDelete) {
        // Only propagate a delete for a row the remote actually has.
        if (row) plan.pushTombstones.push({ id, deletedAt: tomb!.deletedAt });
      } else if (fit) {
        plan.pushUpserts.push(toRemoteRow(fit));
      }
    } else {
      // Remote is newer.
      if (remoteDelete) {
        plan.applyDeletes.push({ id, deletedAt: row!.deletedAt! });
      } else if (row) {
        plan.applyUpserts.push(fromRemoteRow(row));
      }
    }
  }

  return plan;
}
