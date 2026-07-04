"use client";

import * as React from "react";

import { PLAY_FLAG_KEY, isPlaySource } from "@/lib/support";

/*
 * Google Play distribution detection (docs/Google-Play.md). The Play-wrapped
 * app (a Trusted Web Activity) always starts at /?src=play; in-app navigation
 * drops the query, so the first sighting is persisted. Support surfaces
 * consult useIsPlayDistribution and hide, because Google's payment policy
 * requires Play Billing for in-app digital payments and a Stripe tip link
 * can be read as one. On the open web nothing here ever triggers.
 */

/** Mounted once in the root layout; persists the flag, renders nothing. */
export function DistributionFlag() {
  React.useEffect(() => {
    try {
      if (isPlaySource(window.location.search)) {
        localStorage.setItem(PLAY_FLAG_KEY, "play");
      }
    } catch {
      // Storage unavailable: the query param still hides surfaces this visit.
    }
  }, []);
  return null;
}

const noopSubscribe = () => () => {};

/** True inside the Play-wrapped app (current URL or the persisted flag). */
export function useIsPlayDistribution(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return (
          isPlaySource(window.location.search) ||
          localStorage.getItem(PLAY_FLAG_KEY) === "play"
        );
      } catch {
        return isPlaySource(window.location.search);
      }
    },
    () => false,
  );
}
