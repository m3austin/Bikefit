"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StoredFit } from "@/lib/db";
import type { Unit } from "@/lib/units";
import { formatMeasurement } from "@/lib/format";
import { BIKE_OPTIONS } from "@/lib/wizard";

function bikeLabel(fit: StoredFit): string {
  return (
    BIKE_OPTIONS.find((o) => o.value === fit.input.bikeType)?.label ?? "Bike"
  );
}

/*
 * A saved fit at a glance (UX-UI-Design §4.4): name, bike-type chip, headline
 * saddle height, created date, and a caution chip when a value was flagged.
 * Reused on /fits and the landing welcome-back. Actions and inline rename are
 * supplied by the parent so this stays presentational.
 */
export function FitSummaryCard({
  fit,
  unit,
  onOpen,
  actions,
  renameControl,
}: {
  fit: StoredFit;
  unit: Unit;
  onOpen: () => void;
  actions?: React.ReactNode;
  renameControl?: React.ReactNode;
}) {
  const saddle = formatMeasurement(fit.result.saddleHeight.start, unit);
  const hasCaution = fit.result.meta.cautionFlags.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        {renameControl ? (
          <div className="flex-1">{renameControl}</div>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="text-left text-base font-semibold text-ink hover:text-accent"
          >
            {fit.name}
          </button>
        )}
        {actions}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted">
          {bikeLabel(fit)}
        </span>
        {hasCaution ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">
            <TriangleAlert className="size-3" aria-hidden="true" />
            Caution
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col items-start gap-0.5 text-left"
      >
        <span className="text-xs text-ink-muted">Saddle height</span>
        <span className="measurement text-2xl font-semibold text-ink">
          {saddle.value}
          <span className="ml-1 text-sm font-normal text-ink-muted">
            {saddle.unit}
          </span>
        </span>
      </button>

      <span
        className={cn(
          "measurement text-xs text-ink-muted",
          "border-t border-line pt-3",
        )}
      >
        Created {new Date(fit.createdAt).toLocaleDateString()}
      </span>
    </div>
  );
}
