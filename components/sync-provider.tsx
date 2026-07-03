"use client";

import * as React from "react";

import { getSupabase, isSyncConfigured } from "@/lib/supabase/client";

export type SyncStatus =
  | "unconfigured"
  | "signedOut"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

type SyncContextValue = {
  configured: boolean;
  status: SyncStatus;
  email: string | null;
  lastSyncedAt: number | null;
  signIn: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const SyncContext = React.createContext<SyncContextValue | null>(null);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

/*
 * Only load Supabase eagerly when it is actually needed: a persisted session
 * exists, we are on the settings page (which shows the account UI), or we are
 * returning from a magic link. This keeps supabase-js out of a signed-out
 * visitor's first load on every other page.
 */
function shouldInitEagerly(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const hasSession = Object.keys(localStorage).some(
      (k) => k.startsWith("sb-") && k.includes("auth-token"),
    );
    const onSettings = window.location.pathname.startsWith("/settings");
    const fromMagicLink = window.location.hash.includes("access_token");
    return hasSession || onSettings || fromMagicLink;
  } catch {
    return false;
  }
}

/*
 * Optional cloud sync (v1.1, Flow 7). Never blocks: if sync is not configured
 * or the network is unreachable, the app stays fully functional and this only
 * updates a status chip, never a modal. Supabase and the sync engine are loaded
 * on demand so they stay out of the first-load bundle.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const configured = isSyncConfigured();
  const [status, setStatus] = React.useState<SyncStatus>(
    configured ? "signedOut" : "unconfigured",
  );
  const [email, setEmail] = React.useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<number | null>(null);

  const doSync = React.useCallback(async () => {
    if (!configured) return;
    setStatus("syncing");
    try {
      const [{ createLocalStore, createRemoteStore }, { runSync }] =
        await Promise.all([
          import("@/lib/sync/stores"),
          import("@/lib/sync/engine"),
        ]);
      const remote = await createRemoteStore();
      await runSync(createLocalStore(), remote);
      setStatus("synced");
      setLastSyncedAt(Date.now());
    } catch {
      // Degrade to local-only with a status chip, never a modal (Flow 7).
      setStatus(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "offline"
          : "error",
      );
    }
  }, [configured]);

  React.useEffect(() => {
    if (!configured || !shouldInitEagerly()) return;
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      try {
        const supabase = await getSupabase();
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          setEmail(session?.user?.email ?? null);
          if (session) void doSync();
          else setStatus("signedOut");
        });
        subscription = data.subscription;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        setEmail(session?.user?.email ?? null);
        if (session) void doSync();
      } catch {
        // Supabase unreachable at startup: stay local-only, never block (Flow 7).
        if (active) setStatus("offline");
      }
    })();

    // Sync when the network returns or the tab regains focus, so changes made
    // while away are reconciled (the diff is the offline queue).
    const trigger = () => {
      if (email) void doSync();
    };
    window.addEventListener("online", trigger);
    window.addEventListener("focus", trigger);

    return () => {
      active = false;
      subscription?.unsubscribe();
      window.removeEventListener("online", trigger);
      window.removeEventListener("focus", trigger);
    };
  }, [configured, doSync, email]);

  const signIn = React.useCallback(
    async (address: string): Promise<{ ok: boolean; error?: string }> => {
      if (!configured) return { ok: false, error: "Sync is not configured." };
      try {
        const supabase = await getSupabase();
        const { error } = await supabase.auth.signInWithOtp({
          email: address,
          options: { emailRedirectTo: `${SITE_URL}/settings` },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      } catch {
        return { ok: false, error: "Could not reach the sign-in service." };
      }
    },
    [configured],
  );

  const signOut = React.useCallback(async () => {
    if (!configured) return;
    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    } catch {
      // Ignore; local data is untouched either way.
    }
    setEmail(null);
    setStatus("signedOut");
  }, [configured]);

  const value = React.useMemo<SyncContextValue>(
    () => ({ configured, status, email, lastSyncedAt, signIn, signOut, syncNow: doSync }),
    [configured, status, email, lastSyncedAt, signIn, signOut, doSync],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = React.useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within a SyncProvider");
  return ctx;
}
