/*
 * Optional cloud sync (v1.1). The client is created only when configured and is
 * dynamically imported so @supabase/supabase-js stays out of the first-load
 * bundle (PRD §8). Publishable (anon) key only, never the service role
 * (CLAUDE.md). Sync is a mirror: the app is fully usable without it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the sync backend is configured via env. */
export function isSyncConfigured(): boolean {
  return Boolean(URL && ANON_KEY);
}

let clientPromise: Promise<SupabaseClient> | null = null;

/** Lazily construct the browser client. Throws if sync is not configured. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!URL || !ANON_KEY) {
    throw new Error("Sync is not configured");
  }
  clientPromise ??= (async () => {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  })();
  return clientPromise;
}
