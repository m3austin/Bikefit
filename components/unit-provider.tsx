"use client";

import * as React from "react";

import { isUnit, type Unit } from "@/lib/units";
import { isPersistenceAvailable, saveSettings } from "@/lib/db";

type UnitContextValue = {
  unit: Unit;
  setUnit: (unit: Unit) => void;
};

const UnitContext = React.createContext<UnitContextValue | null>(null);

const STORAGE_KEY = "units";
const DEFAULT_UNIT: Unit = "cm";
/* Same-tab notification: the `storage` event only fires in other tabs. */
const UNIT_EVENT = "bikefit:units";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(UNIT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(UNIT_EVENT, onChange);
  };
}

function getStoredUnit(): Unit {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isUnit(stored) ? stored : DEFAULT_UNIT;
}

function getServerUnit(): Unit {
  return DEFAULT_UNIT;
}

/*
 * Global unit preference (cm/in). localStorage-backed via useSyncExternalStore,
 * mirroring the theme approach. Storage is always mm; this only affects display
 * and input (Flow 5). Phase 5 will additionally mirror this into IndexedDB.
 */
export function UnitProvider({ children }: { children: React.ReactNode }) {
  const unit = React.useSyncExternalStore(
    subscribe,
    getStoredUnit,
    getServerUnit,
  );

  const setUnit = React.useCallback((next: Unit) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the toggle still works
      // for the session via the dispatched event below.
    }
    // Mirror to IndexedDB so it is captured in a backup (Flow 5).
    if (isPersistenceAvailable()) void saveSettings({ units: next });
    window.dispatchEvent(new Event(UNIT_EVENT));
  }, []);

  const value = React.useMemo<UnitContextValue>(
    () => ({ unit, setUnit }),
    [unit, setUnit],
  );

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useUnit(): UnitContextValue {
  const ctx = React.useContext(UnitContext);
  if (!ctx) throw new Error("useUnit must be used within a UnitProvider");
  return ctx;
}
