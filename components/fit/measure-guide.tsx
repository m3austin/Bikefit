import * as React from "react";
import { Lightbulb } from "lucide-react";

/*
 * MeasureGuide (UX-UI-Design §3): the illustration panel for a wizard step. A
 * line-art figure, numbered how-to steps, and a common-mistake callout. The
 * illustration is passed in so each step supplies its own line art.
 */
export function MeasureGuide({
  title,
  illustration,
  steps,
  mistake,
}: {
  title: string;
  illustration: React.ReactNode;
  steps: string[];
  mistake: string;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-md border border-line bg-surface p-5">
      <div className="grid place-items-center rounded-sm bg-surface-2 p-4 text-ink [&_svg]:h-44 [&_svg]:w-auto">
        {illustration}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink">
              <span className="measurement grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                {i + 1}
              </span>
              <span className="pt-0.5 text-ink-muted">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-2.5 rounded-sm bg-surface-2 p-3 text-sm">
        <Lightbulb className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden="true" />
        <p className="text-ink-muted">
          <span className="font-medium text-ink">Common mistake: </span>
          {mistake}
        </p>
      </div>
    </div>
  );
}
