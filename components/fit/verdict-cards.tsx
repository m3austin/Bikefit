import { cn } from "@/lib/utils";
import { formatByUnit } from "@/lib/format";
import type { TargetRange, Verdict } from "@/lib/kernel/rules";

/*
 * Measured value vs target range, one card per metric, with an at-a-glance
 * in/marginal/out indicator. Sport-agnostic presentation: each sport maps
 * its verdicts to items (label, hint, value, target, verdict); the band
 * shows the target zone inside a wider display window, and the dot is the
 * measured value, colored by verdict.
 */

export type VerdictItem = {
  key: string;
  label: string;
  hint: string;
  value: number;
  target: TargetRange;
  verdict: Verdict;
};

const VERDICT_TEXT: Record<Verdict, string> = {
  in_range: "In range",
  marginal: "Marginal",
  out_of_range: "Out of range",
};

// Tinted backgrounds carry the verdict color; text stays ink for AA contrast
// in the light theme (colored text on its own tint reads under 4.5:1).
function verdictClasses(verdict: Verdict): { pill: string; dot: string } {
  switch (verdict) {
    case "in_range":
      return { pill: "bg-accent/15 text-ink", dot: "bg-accent" };
    case "marginal":
      return { pill: "bg-warn/15 text-ink", dot: "bg-warn" };
    case "out_of_range":
      return { pill: "bg-danger/15 text-ink", dot: "bg-danger" };
  }
}

function formatFor(target: TargetRange): (value: number) => string {
  return (value: number) => formatByUnit(value, target.unit);
}

function TargetBand({ item }: { item: VerdictItem }) {
  // Display window: the target plus three margins each side, so marginal and
  // out-of-range values still land visibly inside the band.
  const windowLow = item.target.low - 3 * item.target.margin;
  const windowHigh = item.target.high + 3 * item.target.margin;
  const span = windowHigh - windowLow;
  const pct = (x: number) =>
    Math.min(98, Math.max(2, ((x - windowLow) / span) * 100));
  const { dot } = verdictClasses(item.verdict);

  return (
    <div className="relative h-2 w-full rounded-full bg-surface-2">
      <div
        className="absolute inset-y-0 rounded-full bg-accent/25"
        style={{
          left: `${pct(item.target.low)}%`,
          width: `${pct(item.target.high) - pct(item.target.low)}%`,
        }}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg",
          dot,
        )}
        style={{ left: `${pct(item.value)}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

export function VerdictCards({ items }: { items: VerdictItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const format = formatFor(item.target);
        const { pill } = verdictClasses(item.verdict);
        return (
          <div
            key={item.key}
            className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-ink">
                  {item.label}
                </span>
                <span className="text-xs text-ink-muted">{item.hint}</span>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                  pill,
                )}
              >
                {VERDICT_TEXT[item.verdict]}
              </span>
            </div>
            <TargetBand item={item} />
            <p className="text-sm text-ink-muted">
              Measured{" "}
              <span className="measurement font-medium text-ink">
                {format(item.value)}
              </span>{" "}
              against{" "}
              <span className="measurement">
                {format(item.target.low)} to {format(item.target.high)}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
