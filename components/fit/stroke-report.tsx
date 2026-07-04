import { TriangleAlert } from "lucide-react";

import { formatDeg } from "@/lib/format";
import type { MetricStats, StrokeReport } from "@/lib/sports/cycling/biomechanics";

/*
 * Stage 2 results: the aggregated joint-angle table. Measurements only; the
 * verdicts and recommendations arrive with the rules engine (Stage 3), so
 * nothing here says good or bad about a number except data quality.
 */

const ROWS = [
  {
    key: "kneeAtBdc",
    label: "Knee angle at bottom dead center",
    hint: "One reading per stroke, at the pedal's lowest point",
  },
  {
    key: "hip",
    label: "Hip angle",
    hint: "Shoulder-hip-knee, across the analyzed strokes",
  },
  {
    key: "elbow",
    label: "Elbow angle",
    hint: "Shoulder-elbow-wrist, across the analyzed strokes",
  },
  {
    key: "torso",
    label: "Torso angle",
    hint: "Back lean from horizontal, across the analyzed strokes",
  },
] as const;

function StatCells({ stats }: { stats: MetricStats | null }) {
  if (!stats) {
    return (
      <td colSpan={4} className="px-3 py-3 text-sm text-ink-muted">
        Not visible enough in this video
      </td>
    );
  }
  const cells = [stats.min, stats.max, stats.mean, stats.stdDev];
  return (
    <>
      {cells.map((value, i) => (
        <td
          key={i}
          className="measurement whitespace-nowrap px-3 py-3 text-right text-sm text-ink"
        >
          {formatDeg(value)}
        </td>
      ))}
    </>
  );
}

export function StrokeReportView({ report }: { report: StrokeReport }) {
  const summary = [
    { label: "Strokes detected", value: String(report.strokeCount) },
    {
      label: "Cadence",
      value:
        report.cadenceRpm === null
          ? "n/a"
          : `${Math.round(report.cadenceRpm)} rpm`,
    },
    { label: "Tracked side", value: report.side === "left" ? "Left" : "Right" },
    {
      label: "Video analyzed",
      value: `${(report.analyzedMs / 1000).toFixed(1)} s`,
    },
  ];

  return (
    <section
      aria-label="Pedal stroke measurements"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">Measured angles</h2>
        <p className="text-sm text-ink-muted">
          Measurements only for now. Nothing here is a verdict on your fit.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            <p className="font-medium">These readings vary a lot between strokes</p>
            <p className="text-ink-muted">
              That usually means the tracking struggled, not that your pedaling
              did. Steady, seated pedaling at a normal cadence, better light,
              and a level side-on camera give more consistent numbers.
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
                  <span className="block text-xs text-ink-muted">{row.hint}</span>
                </th>
                <StatCells stats={report.stats[row.key]} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
