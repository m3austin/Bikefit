import { Clock, Lightbulb, Store, Wrench } from "lucide-react";

import { GlossaryTerm } from "@/components/fit/glossary-term";
import type { DrillDifficulty, SportDrill } from "@/lib/sports/types";
import { cn } from "@/lib/utils";

/*
 * The generic drill guide (kernel presentation): the proven adjustment-guide
 * format shared by every sport. Each sport supplies its drill catalog and
 * header copy; the layout, badges-before-steps order, pro-tips note, and
 * when-to-see-a-coach line render identically everywhere. Server-rendered;
 * deep links target section ids matching drill ids.
 */

const DIFFICULTY_META: Record<
  DrillDifficulty,
  { label: string; className: string }
> = {
  easy: { label: "Easy", className: "bg-accent/15 text-ink" },
  moderate: { label: "Moderate", className: "bg-surface-2 text-ink-muted" },
};

function DrillSection({ drill }: { drill: SportDrill }) {
  const difficulty = DIFFICULTY_META[drill.difficulty];
  return (
    <section
      id={drill.id}
      aria-labelledby={`${drill.id}-title`}
      className="flex scroll-mt-20 flex-col gap-5 border-t border-line pt-8"
    >
      <div className="flex flex-col gap-3">
        <h2 id={`${drill.id}-title`} className="text-xl font-semibold text-ink">
          {drill.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              difficulty.className,
            )}
          >
            {difficulty.label}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted">
            <Clock className="size-3.5" aria-hidden="true" />
            {drill.time}
          </span>
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          {drill.why}
        </p>
        {drill.glossaryIds.length > 0 ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted print:hidden">
            <span>Jargon here, tap for plain English:</span>
            {drill.glossaryIds.map((id) => (
              <GlossaryTerm key={id} id={id} />
            ))}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <Wrench className="size-4 text-ink-muted" aria-hidden="true" />
          You will need
        </p>
        <ul className="flex flex-col gap-1 text-sm leading-relaxed text-ink-muted">
          {drill.gear.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-accent" aria-hidden="true">
                •
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <ol className="flex max-w-prose flex-col gap-3">
        {drill.steps.map((step, i) => (
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

      <div
        role="note"
        aria-label="Pro tips"
        className="flex gap-3 rounded-md border border-accent/40 bg-accent/10 p-4"
      >
        <Lightbulb
          className="mt-0.5 size-4 shrink-0 text-accent"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">Pro tips</p>
          <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-ink-muted">
            {drill.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="flex max-w-prose gap-3 text-sm leading-relaxed text-ink-muted">
        <Store className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {drill.coachNote}
      </p>
    </section>
  );
}

export type DrillGuideProps = {
  /** The small uppercase kicker, e.g. "GolfFit drill guide". */
  kicker: string;
  title: string;
  intro: string;
  drills: readonly SportDrill[];
  /** The guidance-not-a-lesson closing line, in the sport's own words. */
  footer: string;
};

export function DrillGuide({
  kicker,
  title,
  intro,
  drills,
  footer,
}: DrillGuideProps) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          {kicker}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          {intro}
        </p>
      </header>

      <nav aria-label="Drills" className="flex flex-wrap gap-2 print:hidden">
        {drills.map((d) => (
          <a
            key={d.id}
            href={`#${d.id}`}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:bg-surface-2"
          >
            {d.title}
          </a>
        ))}
      </nav>

      {drills.map((drill) => (
        <DrillSection key={drill.id} drill={drill} />
      ))}

      <p className="max-w-prose border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
        {footer}
      </p>
    </div>
  );
}
