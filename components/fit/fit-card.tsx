"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Wrench } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type FitCardProps = {
  /** Usually a string; may carry inline GlossaryTerm wrapping for jargon. */
  title: React.ReactNode;
  /** Larger treatment for the hero (saddle height) card. */
  emphasis?: boolean;
  /** Typically a FitRange, or any body content. */
  children?: React.ReactNode;
  /** Numbered "How to apply" steps. */
  applySteps?: string[];
  /** "If it doesn't feel right" troubleshooting content. */
  troubleshooting?: React.ReactNode;
  /** "Show the method": formula, inputs, and modifiers for this output. */
  method?: React.ReactNode;
  /** Open the first available section by default (used by the gallery). */
  startOpen?: boolean;
  /** Deep link into the /adjust guide's matching procedure. */
  adjustHref?: string;
};

function Section({
  label,
  children,
  defaultOpen,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t border-line">
      <CollapsibleTrigger className="group flex w-full items-center justify-between py-3 text-left text-sm font-medium text-ink">
        {label}
        <ChevronDown
          className="text-ink-muted transition-transform duration-150 ease-[var(--ease-instrument)] group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4 text-sm text-ink-muted">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/*
 * FitCard (UX-UI-Design §3, §4.3): a results card with a title, a body (usually
 * a FitRange), and collapsibles for "How to apply", "If it doesn't feel right",
 * and "Show the method". All collapsed by default so Fiona sees a calm result
 * and Sam can expand for detail. Real copy is written in Phase 4.
 */
export function FitCard({
  title,
  emphasis = false,
  children,
  applySteps,
  troubleshooting,
  method,
  startOpen = false,
  adjustHref,
}: FitCardProps) {
  return (
    <section
      className={cn(
        "rounded-md border border-line bg-surface",
        emphasis ? "p-6" : "p-5",
      )}
    >
      <h3
        className={cn(
          "font-semibold text-ink",
          emphasis ? "text-xl" : "text-base",
        )}
      >
        {title}
      </h3>

      {children ? <div className="mt-4">{children}</div> : null}

      {applySteps || troubleshooting || method ? (
        <div className="mt-4">
          {applySteps ? (
            <Section label="How to apply" defaultOpen={startOpen}>
              <ol className="list-decimal space-y-1.5 pl-5">
                {applySteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Section>
          ) : null}
          {troubleshooting ? (
            <Section label="If it doesn't feel right">{troubleshooting}</Section>
          ) : null}
          {method ? <Section label="Show the method">{method}</Section> : null}
        </div>
      ) : null}

      {adjustHref ? (
        <div className="mt-4 border-t border-line pt-3 print:hidden">
          <Link
            href={adjustHref}
            className="inline-flex items-center gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
          >
            <Wrench className="size-4" aria-hidden="true" />
            How do I do this? Step-by-step guide
          </Link>
        </div>
      ) : null}
    </section>
  );
}
