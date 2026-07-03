"use client";

import { Toast as ToastPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * Toast primitives (Radix). Bottom-right viewport, tokens only. Used for the
 * "Saved" confirmation (Phase 4) and reused for the ~10s Undo toast (Phase 5).
 */
function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        "fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none",
        className,
      )}
      {...props}
    />
  );
}

function ToastRoot({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2 p-4 shadow-[var(--shadow-overlay)]",
        "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      className={cn("text-sm font-medium text-ink", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      className={cn("text-sm text-ink-muted", className)}
      {...props}
    />
  );
}

export { ToastViewport, ToastRoot, ToastTitle, ToastDescription };
