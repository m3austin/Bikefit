"use client";

import * as React from "react";
import dynamic from "next/dynamic";

export type ToastAction = { label: string; onClick: () => void };

type ToastOptions = {
  title: string;
  description?: string;
  action?: ToastAction;
  /** Auto-dismiss after this many ms. Undo toasts use ~10000 (Phase 5). */
  durationMs?: number;
};

type ToastItem = ToastOptions & { id: string };

type ToastContextValue = { toast: (options: ToastOptions) => void };

const ToastContext = React.createContext<ToastContextValue | null>(null);

// The Radix render tree loads only once a toast is queued, so radix-ui Toast
// stays out of the first-load bundle (PRD §8).
const ToastRenderer = dynamic(() =>
  import("@/components/ui/toast-renderer").then((m) => m.ToastRenderer),
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((options: ToastOptions) => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), ...options }]);
  }, []);

  const value = React.useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <ToastRenderer toasts={toasts} onDismiss={remove} />
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
