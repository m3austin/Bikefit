/*
 * Sync orchestrator (Flow 7). Reconciles local and remote via the pure planner,
 * then applies the plan through small store interfaces so it can be tested with
 * fakes (no Supabase, no IndexedDB). The diff itself is the offline queue: any
 * local change not yet on the remote is detected on the next successful run.
 */

import { planSync } from "@/lib/sync/merge";
import type { RemoteRow, SyncFit, Tombstone } from "@/lib/sync/types";

export interface RemoteStore {
  listFits(): Promise<RemoteRow[]>;
  upsert(rows: RemoteRow[]): Promise<void>;
  tombstone(items: Tombstone[]): Promise<void>;
}

export interface LocalStore {
  listFits(): Promise<SyncFit[]>;
  listTombstones(): Promise<Tombstone[]>;
  applyUpsert(fit: SyncFit): Promise<void>;
  applyDelete(t: Tombstone): Promise<void>;
}

export type SyncResult = { pushed: number; pulled: number };

export async function runSync(
  local: LocalStore,
  remote: RemoteStore,
): Promise<SyncResult> {
  const [localFits, localTombstones, remoteRows] = await Promise.all([
    local.listFits(),
    local.listTombstones(),
    remote.listFits(),
  ]);

  const plan = planSync({ localFits, localTombstones, remoteRows });

  if (plan.pushUpserts.length) await remote.upsert(plan.pushUpserts);
  if (plan.pushTombstones.length) await remote.tombstone(plan.pushTombstones);
  for (const fit of plan.applyUpserts) await local.applyUpsert(fit);
  for (const t of plan.applyDeletes) await local.applyDelete(t);

  return {
    pushed: plan.pushUpserts.length + plan.pushTombstones.length,
    pulled: plan.applyUpserts.length + plan.applyDeletes.length,
  };
}
