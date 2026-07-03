"use client";

import { Toast as ToastPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import {
  ToastDescription,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export type RenderableToast = {
  id: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
};

/*
 * The Radix Toast render tree. Kept separate and dynamically imported by the
 * provider so radix-ui Toast stays out of the first-load bundle (it is only
 * needed once a toast is queued).
 */
export function ToastRenderer({
  toasts,
  onDismiss,
}: {
  toasts: RenderableToast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastRoot
          key={t.id}
          duration={t.durationMs ?? 6000}
          onOpenChange={(open) => {
            if (!open) onDismiss(t.id);
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
              <Button variant="outline" size="sm" onClick={t.action.onClick}>
                {t.action.label}
              </Button>
            </ToastPrimitive.Action>
          ) : null}
        </ToastRoot>
      ))}
      <ToastViewport />
    </ToastPrimitive.Provider>
  );
}
