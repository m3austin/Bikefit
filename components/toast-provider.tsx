"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import {
  ToastDescription,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

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
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastRoot
            key={t.id}
            duration={t.durationMs ?? 6000}
            onOpenChange={(open) => {
              if (!open) remove(t.id);
            }}
          >
            <div className="flex flex-col gap-0.5">
              <ToastTitle>{t.title}</ToastTitle>
              {t.description ? (
                <ToastDescription>{t.description}</ToastDescription>
              ) : null}
            </div>
            {t.action ? (
              <ToastPrimitive.Action altText={t.action.label} asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={t.action.onClick}
                >
                  {t.action.label}
                </Button>
              </ToastPrimitive.Action>
            ) : null}
          </ToastRoot>
        ))}
        <ToastViewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
