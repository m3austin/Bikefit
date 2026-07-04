"use client";

import * as React from "react";

/*
 * Resolves a design token (e.g. "--accent") to its current computed color, and
 * re-resolves whenever the theme class on <html> changes, so canvas drawing
 * (which can't use Tailwind classes) still themes correctly. Built on
 * useSyncExternalStore, the same pattern AppStatus uses for the online/offline
 * chip, so no effect ever calls setState directly.
 */
export function useThemeColor(cssVar: string, fallback: string): string {
  const subscribe = React.useCallback((onChange: () => void) => {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const getSnapshot = React.useCallback(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(cssVar)
      .trim();
    return value || fallback;
  }, [cssVar, fallback]);

  const getServerSnapshot = React.useCallback(() => fallback, [fallback]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
