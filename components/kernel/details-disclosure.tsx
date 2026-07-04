"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/*
 * A "details on demand" disclosure. The scored dashboard is the default
 * view; the dense number tables and per-rep breakdowns live behind this, so
 * results read as a clean summary and the walls of detail are one click away
 * (the information-overload fix). Native-feeling, keyboard accessible, and
 * closed by default.
 */
export function DetailsDisclosure({
  label,
  children,
  defaultOpen = false,
  className,
}: {
  /** Trigger text, e.g. "See the full measurements". */
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        "rounded-lg border border-line bg-surface",
        className,
      )}
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-ink">
        {label}
        <ChevronDown
          className="size-4 shrink-0 text-ink-muted transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 px-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
