import { TriangleAlert } from "lucide-react";

import { formatDeg, formatPct } from "@/lib/format";
import type { FrontalStrokeReport, MetricStats } from "@/lib/sports/cycling/biomechanics";

/*
 * Frontal-plane (straight-on view) results: knee tracking, left-right
 * symmetry, and hip drop. Measurements only; verdicts and recommendations
 * are a future rules-engine stage, so nothing here says good or bad about a
 * number except data quality. Deviations and hip drop are percentages of hip
 * width (the video's own scale); timing is in degrees of the pedal cycle.
 */

const ROWS = [
  {
    key: "leftKneeDeviationPct",
    label: "Left knee tracking",
    hint: "Offset from the hip-ankle line; inward, toward the top tube, is positive",
    unit: "pct",
  },
  {
    key: "rightKneeDeviationPct",
    label: "Right knee tracking",
    hint: "Offset from the hip-ankle line; inward, toward the top tube, is positive",
    unit: "pct",
  },
  {
    key: "leftPeakDeviationPct",
    label: "Left knee peak, per stroke",
    hint: "Largest inward offset within each stroke",
    unit: "pct",
  },
  {
    key: "rightPeakDeviationPct",
    label: "Right knee peak, per stroke",
    hint: "Largest inward offset within each stroke",
    unit: "pct",
  },
  {
    key: "hipDropPct",
    label: "Hip drop",
    hint: "Vertical hip asymmetry; positive when the left hip sits lower",
    unit: "pct",
  },
  {
    key: "timingOffsetDeg",
    label: "Stroke timing offset",
    hint: "Left-right crank timing; 180 degrees is perfectly alternating",
    unit: "deg",
  },
] as const;

function StatCells({
  stats,
  unit,
}: {
  stats: MetricStats | null;
  unit: "pct" | "deg";
}) {
  if (!stats) {
    return (
      <td colSpan={4} className="px-3 py-3 text-sm text-ink-muted">
        Not visible enough in this video
      </td>
    );
  }
  const format = unit === "pct" ? formatPct : formatDeg;
  const cells = [stats.min, stats.max, stats.mean, stats.stdDev];
  return (
    <>
      {cells.map((value, i) => (
        <td
          key={i}
          className="measurement whitespace-nowrap px-3 py-3 text-right text-sm text-ink"
        >
          {format(value)}
        </td>
      ))}
    </>
  );
}

export function FrontalReportView({ report }: { report: FrontalStrokeReport }) {
  const summary = [
    {
      label: "Strokes detected",
      value: `${report.strokeCountLeft} L / ${report.strokeCountRight} R`,
    },
    {
      label: "Cadence",
      value:
        report.cadenceRpm === null
          ? "n/a"
          : `${Math.round(report.cadenceRpm)} rpm`,
    },
    {
      label: "Video analyzed",
      value: `${(report.analyzedMs / 1000).toFixed(1)} s`,
    },
  ];

  return (
    <section
      aria-label="Knee tracking and symmetry measurements"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-ink">
          Knee tracking and symmetry
        </h3>
        <p className="text-sm text-ink-muted">
          From the straight-on view. Knee and hip values are percentages of
          your hip width, so they are comparable between videos.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {summary.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 rounded-md border border-line bg-surface p-3"
          >
            <dt className="text-xs uppercase tracking-wide text-ink-muted">
              {item.label}
            </dt>
            <dd className="measurement text-lg font-medium text-ink">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      {report.highVariance ? (
        <div
          role="note"
          aria-label="Inconsistent readings"
          className="flex gap-3 rounded-md border border-warn/40 bg-warn/10 p-4 text-ink"
        >
          <TriangleAlert
            className="mt-0.5 shrink-0 text-warn"
            aria-hidden="true"
          />
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              These readings vary a lot between strokes
            </p>
            <p className="text-ink-muted">
              Knee tracking is a small movement, so this usually means camera
              shake or a not-quite-straight-on angle. A tripod, a level
              camera centered on the bike, and steady seated pedaling give
              more consistent numbers.
            </p>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-3 py-3 text-sm font-medium text-ink">
                Metric
              </th>
              {["Min", "Max", "Mean", "Std dev"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-3 py-3 text-right text-sm font-medium text-ink"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-line last:border-b-0">
                <th
                  scope="row"
                  className="min-w-44 px-3 py-3 align-top font-normal"
                >
                  <span className="block text-sm text-ink">{row.label}</span>
                  <span className="block text-xs text-ink-muted">
                    {row.hint}
                  </span>
                </th>
                <StatCells stats={report.stats[row.key]} unit={row.unit} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
