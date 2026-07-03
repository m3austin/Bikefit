"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * ToggleGroup primitive (Radix). A rounded "pill" segmented control matching
 * UX-UI-Design §2.4 (fully round pills for unit toggles). Consumers pass items
 * as ToggleGroupItem children.
 */
function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1",
        className,
      )}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex min-w-11 items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors",
        "hover:text-ink data-[state=on]:bg-accent data-[state=on]:text-accent-ink",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
