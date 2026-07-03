/*
 * Sync data shapes shared by the pure merge, the orchestrator, and the
 * Supabase and local stores. Times are epoch milliseconds throughout so
 * last-write-wins is a plain integer comparison (matching the local updatedAt).
 */

import type { FitInput, FitResult } from "@/lib/engine";

/** A saved fit as the sync layer sees it (a subset of StoredFit). */
export type SyncFit = {
  id: string;
  name: string;
  input: FitInput;
  result: FitResult;
  createdAt: number;
  updatedAt: number;
};

/** A remote row, times as ms; deletedAt set means a tombstone. */
export type RemoteRow = {
  id: string;
  name: string;
  data: { input: FitInput; result: FitResult };
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type Tombstone = { id: string; deletedAt: number };

export function toRemoteRow(fit: SyncFit): RemoteRow {
  return {
    id: fit.id,
    name: fit.name,
    data: { input: fit.input, result: fit.result },
    createdAt: fit.createdAt,
    updatedAt: fit.updatedAt,
    deletedAt: null,
  };
}

export function fromRemoteRow(row: RemoteRow): SyncFit {
  return {
    id: row.id,
    name: row.name,
    input: row.data.input,
    result: row.data.result,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
