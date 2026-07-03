"use client";

import type { StoredFit } from "@/lib/db";
import type { Unit } from "@/lib/units";
import { formatMeasurementText, formatRangeText } from "@/lib/format";
import { buildResultsCopy, DISCLAIMER } from "@/lib/results-copy";

type Row = { label: string; range: string; start: string };

/*
 * Print-only fit sheet (UX-UI-Design §7): a clean one-page, always-light
 * document. Numbers go through lib/format, so they match the screen exactly.
 * Rendered hidden on screen and shown only for print by the results page.
 */
export function FitSheet({ fit, unit }: { fit: StoredFit; unit: Unit }) {
  const { result, input } = fit;
  const copy = buildResultsCopy({ result, input, unit });
  const dash = "–"; // en dash for a "no range" cell

  const rows: Row[] = [
    {
      label: "Saddle height",
      range: formatRangeText(
        result.saddleHeight.low,
        result.saddleHeight.high,
        unit,
      ),
      start: formatMeasurementText(result.saddleHeight.start, unit),
    },
    {
      label: "Saddle setback",
      range: formatRangeText(
        result.saddleSetback.low,
        result.saddleSetback.high,
        unit,
      ),
      start: formatMeasurementText(result.saddleSetback.start, unit),
    },
  ];

  if (result.barDrop) {
    rows.push({
      label: "Handlebar drop",
      range: formatRangeText(result.barDrop.low, result.barDrop.high, unit),
      start: formatMeasurementText(result.barDrop.start, unit),
    });
  }

  rows.push({
    label: "Handlebar width",
    range: dash,
    start:
      result.barWidthMm !== undefined
        ? `${result.barWidthMm} mm`
        : "740 to 780 mm",
  });

  rows.push({
    label: "Reach",
    range: formatRangeText(result.reachBand.low, result.reachBand.high, unit),
    start: formatMeasurementText(result.reachBand.start, unit),
  });

  rows.push({
    label: "Crank length",
    range: dash,
    start: `${result.crankLengthMm} mm`,
  });

  if (result.cleat) {
    rows.push({
      label: "Cleat position",
      range: dash,
      start: "Ball of foot over the axle",
    });
  }

  rows.push({
    label: "Frame size (if shopping)",
    range: dash,
    start:
      result.frameSize.roadCm !== undefined
        ? `${result.frameSize.roadCm} cm`
        : `${result.frameSize.mtbInches} in`,
  });

  return (
    <div className="hidden print:block">
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <span className="measurement text-xl font-semibold text-ink">
          Bike<span className="text-accent">Fit</span>
        </span>
        <span className="text-sm text-ink-muted">Starting fit sheet</span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-ink">{fit.name}</h1>
        <span className="measurement text-sm text-ink-muted">
          {new Date(fit.createdAt).toLocaleDateString()}
        </span>
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-muted">
            <th className="py-2 font-medium">Output</th>
            <th className="py-2 font-medium">Range</th>
            <th className="py-2 text-right font-medium">Recommended start</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line">
              <td className="py-2 text-ink">{row.label}</td>
              <td className="measurement py-2 text-ink-muted">{row.range}</td>
              <td className="measurement py-2 text-right font-medium text-ink">
                {row.start}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5">
        <h2 className="text-sm font-semibold text-ink">Three things to do first</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-muted">
          {copy.keyInstructions.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </div>

      <p className="mt-5 border-t border-line pt-3 text-xs text-ink-muted">
        {DISCLAIMER}
      </p>
    </div>
  );
}
