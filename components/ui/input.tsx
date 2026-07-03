import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Text input primitive. For measurements use MeasurementInput instead
 * (CLAUDE.md); this is for plain text like the fit name. Focus ring is handled
 * globally in globals.css.
 */
function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
