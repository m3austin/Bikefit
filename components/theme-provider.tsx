"use client";

import * as React from "react";

import {
  DEFAULT_THEME,
  THEME_COOKIE,
  THEME_STORAGE_KEY,
  isTheme,
  resolveTheme,
  type Theme,
} from "@/lib/theme";
import { isPersistenceAvailable, saveSettings } from "@/lib/db";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const MEDIA = "(prefers-color-scheme: dark)";
/* Same-tab notification: the `storage` event only fires in other tabs. */
const THEME_EVENT = "bikefit:theme";

/* --- Stored preference as an external store (localStorage). --- */
function subscribeStored(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

function getServerTheme(): Theme {
  return DEFAULT_THEME;
}

/* --- OS preference as an external store (matchMedia). --- */
function subscribeSystem(onChange: () => void) {
  const mql = window.matchMedia(MEDIA);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSystemDark(): boolean {
  return window.matchMedia(MEDIA).matches;
}

function getServerSystemDark(): boolean {
  return false;
}

function applyClass(resolved: "dark" | "light") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

/*
 * Client theme controller. The .dark class is first set by ThemeScript before
 * paint; this provider keeps it in sync with user and OS changes via external
 * stores (no setState-in-effect), and persists to localStorage (source of
 * truth) plus a cookie (SSR hint).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribeStored,
    getStoredTheme,
    getServerTheme,
  );
  const systemDark = React.useSyncExternalStore(
    subscribeSystem,
    getSystemDark,
    getServerSystemDark,
  );

  const resolvedTheme = resolveTheme(theme, systemDark);

  // Reflect the resolved theme onto <html>. Synchronising an external system
  // (the DOM) is exactly what effects are for.
  React.useEffect(() => {
    applyClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
      // Mirror to a cookie for SSR class application (UX-UI-Design §2).
      document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // Storage can be unavailable (private mode); theme still works in-session.
    }
    // Mirror to IndexedDB so it is captured in a backup (Flow 5, PRD §7).
    if (isPersistenceAvailable()) void saveSettings({ theme: next });
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
