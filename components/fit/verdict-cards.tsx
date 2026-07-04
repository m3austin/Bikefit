import { cn } from "@/lib/utils";
import { formatDeg, formatPct } from "@/lib/format";
import type { MetricVerdict, Verdict } from "@/lib/fit-rules";

/*
 * Measured value vs target range, one card per metric, with an at-a-glance
 * in/marginal/out indicator (Stage 3). The band shows the target zone inside
 * a wider display window; the dot is the measured value, colored by verdict.
 */

const LABELS: Record<MetricVerdict["id"], { label: string; hint: string }> = {
  kneeAtBdc: {
    label: "Knee at stroke bottom",
    hint: "Mean across strokes",
  },
  elbow: { label: "Elbow angle", hint: "Mean across the recording" },
  torso: { label: "Torso angle", hint: "Lean from horizontal" },
  hipMin: { label: "Hip at its most closed", hint: "Tightest point per stroke" },
  leftPeakDev: {
    label: "Left knee tracking",
    hint: "Peak inward offset, % of hip width",
  },
  rightPeakDev: {
    label: "Right knee tracking",
    hint: "Peak inward offset, % of hip width",
  },
  kneeDevAsymmetry: {
    label: "Left-right difference",
    hint: "Knee tracking gap between legs",
  },
  hipDropAbs: { label: "Hip tilt", hint: "Sideways pelvic lean" },
  timingOffset: {
    label: "Stroke timing",
    hint: "180 degrees is evenly alternating",
  },
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

function TargetBand({ verdict: v }: { verdict: MetricVerdict }) {
  // Display window: the target plus three margins each side, so marginal and
  // out-of-range values still land visibly inside the band.
  const windowLow = v.target.low - 3 * v.target.margin;
  const windowHigh = v.target.high + 3 * v.target.margin;
  const span = windowHigh - windowLow;
  const pct = (x: number) =>
    Math.min(98, Math.max(2, ((x - windowLow) / span) * 100));
  const { dot } = verdictClasses(v.verdict);

  return (
    <div className="relative h-2 w-full rounded-full bg-surface-2">
      <div
        className="absolute inset-y-0 rounded-full bg-accent/25"
        style={{
          left: `${pct(v.target.low)}%`,
          width: `${pct(v.target.high) - pct(v.target.low)}%`,
        }}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg",
          dot,
        )}
        style={{ left: `${pct(v.value)}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

export function VerdictCards({ verdicts }: { verdicts: MetricVerdict[] }) {
  if (verdicts.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {verdicts.map((v) => {
        const meta = LABELS[v.id];
        const format = v.target.unit === "deg" ? formatDeg : formatPct;
        const { pill } = verdictClasses(v.verdict);
        return (
          <div
            key={v.id}
            className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-ink">
                  {meta.label}
                </span>
                <span className="text-xs text-ink-muted">{meta.hint}</span>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                  pill,
                )}
              >
                {VERDICT_TEXT[v.verdict]}
              </span>
            </div>
            <TargetBand verdict={v} />
            <p className="text-sm text-ink-muted">
              Measured{" "}
              <span className="measurement font-medium text-ink">
                {format(v.value)}
              </span>{" "}
              against{" "}
              <span className="measurement">
                {format(v.target.low)} to {format(v.target.high)}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
