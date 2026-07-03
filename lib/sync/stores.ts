/*
 * Concrete stores for the sync engine: a local store backed by lib/db and a
 * remote store backed by Supabase. Both stay behind the engine's interfaces so
 * the engine itself is testable with fakes.
 */

import {
  applyRemoteDelete,
  listSavedFits,
  listTombstones,
  putFit,
} from "@/lib/db";
import { getSupabase } from "@/lib/supabase/client";
import type { LocalStore, RemoteStore } from "@/lib/sync/engine";
import type { RemoteRow } from "@/lib/sync/types";

export function createLocalStore(): LocalStore {
  return {
    async listFits() {
      const fits = await listSavedFits();
      return fits.map((f) => ({
        id: f.id,
        name: f.name,
        input: f.input,
        result: f.result,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }));
    },
    listTombstones,
    async applyUpsert(fit) {
      await putFit({
        id: fit.id,
        name: fit.name,
        input: fit.input,
        result: fit.result,
        saved: true,
        createdAt: fit.createdAt,
        updatedAt: fit.updatedAt,
      });
    },
    async applyDelete(t) {
      await applyRemoteDelete(t.id, t.deletedAt);
    },
  };
}

type DbRow = {
  id: string;
  name: string;
  data: RemoteRow["data"];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Build a Supabase-backed remote store for the signed-in user. */
export async function createRemoteStore(): Promise<RemoteStore> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const userId = user.id;

  return {
    async listFits() {
      // RLS scopes this to the signed-in user; no explicit filter needed.
      const { data, error } = await supabase
        .from("fits")
        .select("id,name,data,created_at,updated_at,deleted_at");
      if (error) throw error;
      return (data as DbRow[] | null ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        data: r.data,
        createdAt: Date.parse(r.created_at),
        updatedAt: Date.parse(r.updated_at),
        deletedAt: r.deleted_at ? Date.parse(r.deleted_at) : null,
      }));
    },
    async upsert(rows) {
      const payload = rows.map((r) => ({
        id: r.id,
        user_id: userId,
        name: r.name,
        data: r.data,
        created_at: new Date(r.createdAt).toISOString(),
        updated_at: new Date(r.updatedAt).toISOString(),
        deleted_at: null,
      }));
      const { error } = await supabase.from("fits").upsert(payload);
      if (error) throw error;
    },
    async tombstone(items) {
      for (const item of items) {
        const iso = new Date(item.deletedAt).toISOString();
        const { error } = await supabase
          .from("fits")
          .update({ deleted_at: iso, updated_at: iso })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
  };
}
