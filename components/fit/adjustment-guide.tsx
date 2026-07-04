"use client";

import * as React from "react";
import {
  ChevronDown,
  Clock,
  Lightbulb,
  Store,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { GlossaryTerm } from "@/components/fit/glossary-term";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ADJUSTMENTS,
  SHOP_JOBS,
  type Adjustment,
  type Difficulty,
} from "@/lib/sports/cycling/drills";
import { listSavedFits } from "@/lib/db";
import type { BikeType } from "@/lib/engine";
import { DISCLAIMER } from "@/lib/results-copy";
import { cn } from "@/lib/utils";

/*
 * The adjustment guide (/adjust): plain-language, step-by-step wrenching for
 * riders who have never loosened a seatpost. Content comes only from
 * lib/adjustments.ts; this file is presentation. Difficulty, time, and tools
 * render BEFORE the steps so nobody is surprised mid-job.
 */

const BIKE_LABELS: Record<BikeType, string> = {
  road: "Road",
  gravel: "Gravel",
  mtb: "Mountain",
  hybrid: "Hybrid",
};

// Tinted backgrounds carry the state; text stays ink for AA contrast in the
// light theme (accent-on-accent-tint reads under 4.5:1 at chip sizes).
const DIFFICULTY_META: Record<Difficulty, { label: string; className: string }> =
  {
    easy: { label: "Easy", className: "bg-accent/15 text-ink" },
    moderate: { label: "Moderate", className: "bg-surface-2 text-ink-muted" },
    involved: { label: "Take your time", className: "bg-warn/15 text-ink" },
  };

function Chip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Callout({
  tone,
  title,
  items,
}: {
  tone: "tip" | "safety";
  title: string;
  items: readonly string[];
}) {
  const Icon = tone === "tip" ? Lightbulb : TriangleAlert;
  return (
    <div
      role="note"
      aria-label={title}
      className={cn(
        "flex gap-3 rounded-md border p-4",
        tone === "tip"
          ? "border-accent/40 bg-accent/10"
          : "border-warn/40 bg-warn/10",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "tip" ? "text-accent" : "text-warn",
        )}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">{title}</p>
        <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-ink-muted">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VariantCard({
  variant,
  matches,
}: {
  variant: Adjustment["variants"][number];
  matches: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border bg-surface p-4",
        matches ? "border-accent" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-ink">{variant.title}</p>
        {matches ? (
          <Chip className="bg-accent/15 text-ink print:hidden">
            Likely your setup
          </Chip>
        ) : null}
      </div>
      <p className="text-xs text-ink-muted">{variant.appliesTo}</p>
      <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-ink-muted">
        {variant.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </div>
  );
}

function AdjustmentSection({
  adjustment,
  bikeType,
}: {
  adjustment: Adjustment;
  bikeType: BikeType;
}) {
  const difficulty = DIFFICULTY_META[adjustment.difficulty];
  // Variants matching the selected bike (or universal ones) render up front;
  // the rest sit behind a collapsible so the page reads simple but hides
  // nothing. Print always shows everything: paper has no toggles.
  const shownVariants = adjustment.variants.filter(
    (v) => !v.bikeTypes || v.bikeTypes.includes(bikeType),
  );
  const otherVariants = adjustment.variants.filter(
    (v) => v.bikeTypes && !v.bikeTypes.includes(bikeType),
  );
  return (
    <section
      id={adjustment.id}
      aria-labelledby={`${adjustment.id}-title`}
      className="flex scroll-mt-20 flex-col gap-5 border-t border-line pt-8"
    >
      <div className="flex flex-col gap-3">
        <h2
          id={`${adjustment.id}-title`}
          className="text-xl font-semibold text-ink"
        >
          {adjustment.title}
        </h2>
        {/* Know what you are in for BEFORE the steps. */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip className={difficulty.className}>{difficulty.label}</Chip>
          <Chip className="bg-surface-2 text-ink-muted">
            <Clock className="size-3.5" aria-hidden="true" />
            {adjustment.time}
          </Chip>
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          {adjustment.why}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted print:hidden">
          <span>Jargon here, tap for plain English:</span>
          {adjustment.glossaryIds.map((id) => (
            <GlossaryTerm key={id} id={id} />
          ))}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <Wrench className="size-4 text-ink-muted" aria-hidden="true" />
          You will need
        </p>
        <ul className="flex flex-col gap-1 text-sm leading-relaxed text-ink-muted">
          {adjustment.tools.map((tool) => (
            <li key={tool} className="flex gap-2">
              <span className="text-accent" aria-hidden="true">
                •
              </span>
              {tool}
            </li>
          ))}
        </ul>
      </div>

      <ol className="flex max-w-prose flex-col gap-3">
        {adjustment.steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink">
            <span
              className="measurement mt-px shrink-0 font-medium text-accent"
              aria-hidden="true"
            >
              {i + 1}.
            </span>
            {step}
          </li>
        ))}
      </ol>

      <Callout tone="tip" title="Pro tips" items={adjustment.tips} />
      <Callout tone="safety" title="Before you tighten" items={adjustment.safety} />

      {adjustment.variants.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-ink">
            Which setup do you have?
          </h3>
          {shownVariants.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {shownVariants.map((variant) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  matches={variant.bikeTypes?.includes(bikeType) ?? false}
                />
              ))}
            </div>
          ) : null}
          {otherVariants.length > 0 ? (
            <>
              <Collapsible className="print:hidden">
                <CollapsibleTrigger className="group inline-flex items-center gap-1.5 py-2 text-sm text-ink-muted transition-colors hover:text-ink">
                  <ChevronDown
                    className="size-4 transition-transform duration-150 ease-[var(--ease-instrument)] group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                  Show other setups (
                  {otherVariants.map((v) => v.title).join(", ")})
                </CollapsibleTrigger>
                <CollapsibleContent className="grid gap-3 pt-2 sm:grid-cols-2">
                  {otherVariants.map((variant) => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      matches={false}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
              {/* Paper has no toggles: print always shows every setup. */}
              <div className="hidden gap-3 print:grid">
                {otherVariants.map((variant) => (
                  <VariantCard
                    key={`print-${variant.id}`}
                    variant={variant}
                    matches={false}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <p className="flex max-w-prose gap-3 text-sm leading-relaxed text-ink-muted">
        <Store className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {adjustment.shopNote}
      </p>
    </section>
  );
}

export function AdjustmentGuide() {
  const [bikeType, setBikeType] = React.useState<BikeType>("road");

  // Default the selector from the most recent saved fit, when one exists.
  React.useEffect(() => {
    let active = true;
    listSavedFits()
      .then((fits) => {
        const latest = fits[0];
        if (active && latest) setBikeType(latest.input.bikeType);
      })
      .catch(() => {
        // The guide works fine without a saved fit.
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          Adjustment guide
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          You can do this
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          Most of the changes below are three tools and ten minutes, and every
          one starts by marking where you are today, so there is always a way
          back. No experience needed; the steps assume you have never loosened
          a <GlossaryTerm id="seatpost" /> before.
        </p>
      </header>

      <div className="flex gap-3 rounded-md border border-accent/40 bg-accent/10 p-4">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-ink">
          One change at a time. Adjust, ride for real, and only then judge.
          Two changes at once means you never know which one helped.
        </p>
      </div>

      <div className="flex flex-col gap-2 print:hidden">
        <p className="text-sm font-medium text-ink">Your bike</p>
        <ToggleGroup
          type="single"
          value={bikeType}
          onValueChange={(next) => {
            if (next) setBikeType(next as BikeType);
          }}
          aria-label="Bike type"
          className="flex-wrap"
        >
          {(Object.keys(BIKE_LABELS) as BikeType[]).map((type) => (
            <ToggleGroupItem key={type} value={type}>
              {BIKE_LABELS[type]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-ink-muted">
          Used to highlight the setup notes that likely match your bike.
        </p>
      </div>

      <nav aria-label="Adjustments" className="flex flex-wrap gap-2 print:hidden">
        {ADJUSTMENTS.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:bg-surface-2"
          >
            {a.title}
          </a>
        ))}
      </nav>

      {ADJUSTMENTS.map((adjustment) => (
        <AdjustmentSection
          key={adjustment.id}
          adjustment={adjustment}
          bikeType={bikeType}
        />
      ))}

      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
          <Store className="size-5 text-ink-muted" aria-hidden="true" />
          When it is a shop job, not a driveway job
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Knowing when to stop is a skill too. These are worth handing over,
          and none of them are expensive visits:
        </p>
        <ul className="flex max-w-prose flex-col gap-1.5 text-sm leading-relaxed text-ink-muted">
          {SHOP_JOBS.map((job) => (
            <li key={job} className="flex gap-2">
              <span className="text-accent" aria-hidden="true">
                •
              </span>
              {job}
            </li>
          ))}
        </ul>
      </section>

      <p className="max-w-prose border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
        {DISCLAIMER}
      </p>
    </div>
  );
}
