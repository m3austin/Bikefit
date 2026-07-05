import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { formatByUnit } from "@/lib/format";
import type { SavedAnalysis } from "@/lib/db";
import type { ScoreBoard } from "@/lib/kernel/dashboard";
import { cn } from "@/lib/utils";

/*
 * "Since last time": compares this analysis to the previous saved one of the
 * same sport+variant. Leads with the overall technique-score change, then the
 * categories that moved, each arrow colored by whether the sub-score improved
 * (a metric can be "up" in value but that is not always better, so direction
 * follows the 0-10 score, which already encodes closer-to-range = higher).
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Jun 29" in a fixed order. Deterministic on purpose: Intl's default-locale
 * output differs between the SSR runtime and the browser (month-day vs
 * day-month), which tripped a hydration mismatch on the dev preview. */
function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function Delta({ delta }: { delta: number }) {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded > 0)
    return (
      <span className="inline-flex items-center gap-1 font-medium text-accent">
        <TrendingUp className="size-4" aria-hidden="true" />+{rounded.toFixed(1)}
      </span>
    );
  if (rounded < 0)
    return (
      <span className="inline-flex items-center gap-1 font-medium text-danger">
        <TrendingDown className="size-4" aria-hidden="true" />
        {rounded.toFixed(1)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 font-medium text-ink-muted">
      <Minus className="size-4" aria-hidden="true" />0.0
    </span>
  );
}

export function ComparisonStrip({
  board,
  previous,
}: {
  board: ScoreBoard;
  previous: SavedAnalysis;
}) {
  if (board.overall === null || previous.overall === null) return null;

  const prevByKey = new Map(previous.metrics.map((m) => [m.key, m]));
  // Categories measured in both runs whose sub-score actually moved, biggest
  // change first.
  const changed = board.categories
    .map((c) => {
      const p = prevByKey.get(c.key);
      if (!p) return null;
      return { c, prev: p, scoreDelta: c.score - p.score };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && Math.abs(x.scoreDelta) >= 0.1)
    .sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta));

  const overallDelta = board.overall - previous.overall;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent/40 bg-accent/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">
          Since last time{" "}
          <span className="text-ink-muted">({shortDate(previous.createdAt)})</span>
        </p>
        <p className="flex items-center gap-2 text-sm text-ink">
          <span className="measurement text-ink-muted">
            {previous.overall.toFixed(1)}
          </span>
          <ArrowRight className="size-3.5 text-ink-muted" aria-hidden="true" />
          <span className="measurement font-semibold text-ink">
            {board.overall.toFixed(1)}
          </span>
          <Delta delta={overallDelta} />
        </p>
      </div>

      {changed.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {changed.slice(0, 4).map(({ c, prev, scoreDelta }) => (
            <li
              key={c.key}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-sm"
            >
              <span className="text-ink">{c.label}</span>
              <span className="flex items-center gap-2 text-ink-muted">
                <span className="measurement">
                  {formatByUnit(prev.value, prev.target.unit)}
                </span>
                <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
                <span
                  className={cn(
                    "measurement font-medium",
                    scoreDelta > 0
                      ? "text-accent"
                      : scoreDelta < 0
                        ? "text-danger"
                        : "text-ink",
                  )}
                >
                  {formatByUnit(c.value, c.target.unit)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-ink-muted">
          Holding steady since last time. Consistency is its own win.
        </p>
      )}
    </div>
  );
}
