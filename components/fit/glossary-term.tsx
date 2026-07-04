"use client";

import * as React from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GLOSSARY, type GlossaryId } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/*
 * GlossaryTerm: a dotted-underline word that reveals its definition. Works
 * on every input the garage offers: tap (touch), click, keyboard focus, and
 * mouse hover. Built on Popover (not a hover-only tooltip) so it is
 * dismissible with Escape and an outside tap. Definitions come only from
 * lib/glossary.ts (single source).
 *
 * Hover open/close is gated to mouse pointers: on touch, the synthetic
 * pointerenter that precedes the tap must not pre-open the popover, or the
 * tap's click-toggle would immediately close it again.
 */
export function GlossaryTerm({
  id,
  children,
  className,
}: {
  id: GlossaryId;
  /** The word as it appears in the sentence; defaults to the glossary term. */
  children?: React.ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[id];
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setOpen(false);
        }}
        onFocus={(e) => {
          // Keyboard focus reveals the definition; programmatic or
          // click-driven focus does not (the click handles those).
          if (e.target.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // A click PINS the definition open, it never closes it: for mouse
          // users the popover is already open from hover, and Radix's
          // click-toggle would snap it shut again. preventDefault makes
          // Radix skip its toggle (composed handlers respect it); Escape and
          // outside taps remain the ways to dismiss.
          if (open) e.preventDefault();
        }}
        className={cn(
          // Inline with the surrounding text; the negative margin + padding
          // trick grows the touch target without disturbing line layout.
          "-my-1 cursor-help rounded-sm py-1 underline decoration-ink-muted decoration-dotted underline-offset-4 transition-colors hover:decoration-accent",
          className,
        )}
      >
        {children ?? entry.term}
      </PopoverTrigger>
      <PopoverContent
        // Keep focus on the trigger word. Radix's default moves focus into
        // the content on open, which makes the click that follows a hover
        // read as focus-leaving-the-content and dismisses it immediately.
        // For a one-sentence definition, focus should never move anyway.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p>
          <span className="font-medium">{entry.term}:</span> {entry.definition}
        </p>
      </PopoverContent>
    </Popover>
  );
}
