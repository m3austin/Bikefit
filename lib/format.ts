/*
 * format: the single source for displaying a measurement. Screen and print
 * MUST format numbers identically (CLAUDE.md), so both go through here. Input
 * is always integer mm; output is a string in the chosen display unit.
 */

import { fromMm, type Unit } from "@/lib/units";

/** Decimal places shown per unit. cm and in both display to one decimal. */
const DECIMALS: Record<Unit, number> = { cm: 1, in: 1 };

/** The short unit label, e.g. "cm" / "in". */
export function unitLabel(unit: Unit): string {
  return unit;
}

/** The spelled-out unit, for accessible names, e.g. "centimetres". */
export function unitWord(unit: Unit): string {
  return unit === "cm" ? "centimetres" : "inches";
}

/** The numeric part only, e.g. 724 mm -> "72.4" (cm) or "28.5" (in). */
export function formatValue(mm: number, unit: Unit): string {
  return fromMm(mm, unit).toFixed(DECIMALS[unit]);
}

/**
 * Split display: the number and its unit, so components can render a large mono
 * number beside a small muted unit (UX-UI-Design §2.3).
 */
export function formatMeasurement(
  mm: number,
  unit: Unit,
): { value: string; unit: string } {
  return { value: formatValue(mm, unit), unit: unitLabel(unit) };
}

/** Single-string display, e.g. "72.4 cm". Used for print and accessible text. */
export function formatMeasurementText(mm: number, unit: Unit): string {
  return `${formatValue(mm, unit)} ${unitLabel(unit)}`;
}

/** A range as text, e.g. "71.8 to 73.0 cm". */
export function formatRangeText(low: number, high: number, unit: Unit): string {
  return `${formatValue(low, unit)} to ${formatValue(high, unit)} ${unitLabel(unit)}`;
}

/**
 * A joint angle, e.g. "142.3°". Angles have no cm/in mode; one decimal keeps
 * screen and any future print output identical (single-source display rule).
 */
export function formatDeg(degrees: number): string {
  return `${degrees.toFixed(1)}°`;
}

/** A dimensionless percentage, e.g. "12.5%" (frontal metrics, % of hip width). */
export function formatPct(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

/** A time ratio, e.g. golf tempo "2.8:1" (backswing over downswing). */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}

/** Running cadence in steps per minute, e.g. "172 spm". Whole steps only. */
export function formatSpm(stepsPerMinute: number): string {
  return `${Math.round(stepsPerMinute)} spm`;
}
