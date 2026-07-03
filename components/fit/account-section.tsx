"use client";

import * as React from "react";
import { CloudCheck, CloudOff, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSync, type SyncStatus } from "@/components/sync-provider";

const STATUS_TEXT: Record<SyncStatus, string> = {
  unconfigured: "Sync is not set up",
  signedOut: "Not signed in",
  syncing: "Syncing",
  synced: "Synced",
  offline: "Offline, will sync when back online",
  error: "Sync paused, will retry",
};

function StatusChip({ status }: { status: SyncStatus }) {
  const good = status === "synced" || status === "syncing";
  const Icon = status === "syncing" ? RefreshCw : good ? CloudCheck : CloudOff;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-sm text-ink-muted">
      <Icon
        className={`size-4 ${good ? "text-accent" : "text-warn"} ${status === "syncing" ? "motion-safe:animate-spin" : ""}`}
        aria-hidden="true"
      />
      {STATUS_TEXT[status]}
    </span>
  );
}

/*
 * Account section (Flow 7). Sync is optional and never blocks: sign in by magic
 * link, see a status chip, and sign out without losing local data. If sync is
 * not configured on this build, a short note explains it.
 */
export function AccountSection() {
  const { configured, status, email, signIn, signOut, syncNow } = useSync();
  const [address, setAddress] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (!configured) {
    return (
      <p className="text-sm text-ink-muted">
        Cloud sync is not set up on this build. BikeFit works fully without it,
        and your data stays on this device.
      </p>
    );
  }

  if (email) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={status} />
        </div>
        <p className="text-sm text-ink-muted">
          Signed in as <span className="font-medium text-ink">{email}</span>.
          Your saved fits sync across devices where you sign in.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => void syncNow()}
            disabled={status === "syncing"}
          >
            <RefreshCw />
            Sync now
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
        <p className="text-sm text-ink-muted">
          Signing out keeps every fit on this device. It only stops syncing.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!address.trim() || busy) return;
        setBusy(true);
        setError(null);
        const result = await signIn(address.trim());
        setBusy(false);
        if (result.ok) setSent(true);
        else setError(result.error ?? "Something went wrong.");
      }}
    >
      <p className="text-sm text-ink-muted">
        Sign in to sync your saved fits across devices. We email you a link, so
        there is no password.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="sync-email" className="text-sm font-medium text-ink">
            Email
          </label>
          <Input
            id="sync-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy || !address.trim()}>
          Send magic link
        </Button>
      </div>
      {sent ? (
        <p role="status" className="text-sm text-accent">
          Check your email for a sign-in link.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
