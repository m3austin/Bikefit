import Link from "next/link";
import { ArrowRight, CheckCircle2, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/mascot/mascot";
import { cn } from "@/lib/utils";
import type { Confidence, Finding } from "@/lib/kernel/rules";

/*
 * "One change at a time" (Stage 3): the single highest-priority finding is
 * the primary recommendation, displayed prominently; everything else is a
 * secondary finding to look at only after the primary is dealt with.
 */

const CONFIDENCE_TEXT: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={cn(
        // Tint carries the state; ink text keeps AA contrast in light theme.
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
        confidence === "high"
          ? "bg-accent/15 text-ink"
          : "bg-surface-2 text-ink-muted",
      )}
    >
      {CONFIDENCE_TEXT[confidence]}
    </span>
  );
}

export function FitRecommendations({
  primary,
  secondary,
  drillsBase,
  allClearNote = "No change to make from these numbers. Ride, and let comfort have the final say.",
}: {
  primary: Finding | null;
  secondary: Finding[];
  /** The sport's drill guide base path, e.g. "/cycling/drills". */
  drillsBase: string;
  /** The sport's own words for the everything-in-range state. */
  allClearNote?: string;
}) {
  if (!primary) {
    // Tier 3 earned delight (docs/sportfit/04 s4): the everything-in-range
    // state is a celebration, not a results number, so the mascot belongs.
    return (
      <div className="flex items-center gap-3 rounded-md border border-accent/40 bg-accent/10 p-5">
        <Mascot pose="cheer" size={52} className="shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2 font-medium text-ink">
            <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
            Everything we measured sits inside its target range
          </p>
          <p className="text-ink-muted">{allClearNote}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border-2 border-accent bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="measurement text-xs font-medium uppercase tracking-wide text-accent">
            Make this one change first
          </p>
          <ConfidenceChip confidence={primary.confidence} />
        </div>
        <p className="text-lg font-semibold text-ink">{primary.action}</p>
        <p className="text-sm leading-relaxed text-ink-muted">
          {primary.description}
        </p>
        {primary.adjust ? (
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href={`${drillsBase}#${primary.adjust}`}>
              <Wrench />
              How do I do this?
            </Link>
          </Button>
        ) : null}
      </div>

      {secondary.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-ink">
            Worth a look after that, one at a time
          </p>
          <ul className="flex flex-col gap-2">
            {secondary.map((finding) => (
              <li
                key={finding.ruleId}
                className="flex items-start gap-3 rounded-md border border-line bg-surface p-4"
              >
                <Wrench
                  className="mt-0.5 size-4 shrink-0 text-ink-muted"
                  aria-hidden="true"
                />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-ink">
                      {finding.action}
                    </span>
                    <ConfidenceChip confidence={finding.confidence} />
                  </div>
                  <span className="text-sm text-ink-muted">
                    {finding.description}
                  </span>
                  {finding.adjust ? (
                    <Link
                      href={`${drillsBase}#${finding.adjust}`}
                      className="inline-flex items-center gap-1 self-start text-sm text-accent underline-offset-2 hover:underline"
                    >
                      Step-by-step guide
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
