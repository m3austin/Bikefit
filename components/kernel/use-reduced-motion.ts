"use client";

import * as React from "react";

/*
 * True when the user asked for reduced motion. Score rings and count-ups read
 * this to render their final state instantly instead of animating (UX-UI
 * §2.4). Uses useSyncExternalStore so it subscribes to the media query
 * without setState-in-effect, and stays SSR-safe (server snapshot is false).
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
