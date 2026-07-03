"use client";

import * as React from "react";
import { CloudOff, WifiOff } from "lucide-react";

import { isPersistenceAvailable } from "@/lib/db";

const noopSubscribe = () => () => {};

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/*
 * Cross-cutting status (Flow 8): registers the service worker, shows an
 * "Offline, everything still works" chip when the network drops, and a banner
 * when IndexedDB is unavailable so the rider knows results will not persist.
 */
export function AppStatus() {
  const offline = React.useSyncExternalStore(
    subscribeOnline,
    () => !navigator.onLine,
    () => false,
  );
  const noPersistence = React.useSyncExternalStore(
    noopSubscribe,
    () => !isPersistenceAvailable(),
    () => false,
  );

  React.useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is progressive; ignore registration failures.
      });
    }
  }, []);

  return (
    <>
      {noPersistence ? (
        <div
          role="status"
          className="border-b border-warn/40 bg-warn/10 px-4 py-2 text-center text-sm text-ink print:hidden sm:px-6"
        >
          <span className="inline-flex items-center gap-2">
            <CloudOff className="size-4 text-warn" aria-hidden="true" />
            Private mode: your fits work for now but will not be saved on this
            device.
          </span>
        </div>
      ) : null}

      {offline ? (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-30 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-2 text-sm text-ink shadow-[var(--shadow-overlay)] print:hidden"
        >
          <WifiOff className="size-4 text-accent" aria-hidden="true" />
          Offline, everything still works
        </div>
      ) : null}
    </>
  );
}
