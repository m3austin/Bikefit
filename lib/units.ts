/*
 * Units: the single source for mm <-> cm <-> in conversion and for parsing
 * measurement input. Storage is always integer millimetres (CLAUDE.md); cm and
 * in exist only for display and input. Never do unit math inline in a component.
 */

export type Unit = "cm" | "in";

export const MM_PER_CM = 10;
export const MM_PER_IN = 25.4;

/** cm -> integer mm. */
export function cmToMm(cm: number): number {
  return Math.round(cm * MM_PER_CM);
}

/** in -> integer mm. */
export function inToMm(inch: number): number {
  return Math.round(inch * MM_PER_IN);
}

/** mm -> cm (float; round at the display layer via lib/format). */
export function mmToCm(mm: number): number {
  return mm / MM_PER_CM;
}

/** mm -> in (float; round at the display layer via lib/format). */
export function mmToIn(mm: number): number {
  return mm / MM_PER_IN;
}

/** A value in the given display unit -> integer mm. */
export function toMm(value: number, unit: Unit): number {
  return unit === "cm" ? cmToMm(value) : inToMm(value);
}

/** Integer mm -> a value in the given display unit (unrounded). */
export function fromMm(mm: number, unit: Unit): number {
  return unit === "cm" ? mmToCm(mm) : mmToIn(mm);
}

export function isUnit(value: unknown): value is Unit {
  return value === "cm" || value === "in";
}

/*
 * Parse a raw measurement string to integer mm, interpreted in `unit` unless
 * the string names its own unit. Accepts decimals ("72.5"), comma decimals
 * ("72,5"), fractional inches ("28 1/2", "28-1/2"), bare fractions ("1/2"),
 * and explicit unit suffixes ("72.5 cm", '28 1/2 in', '28 1/2"'). Returns null
 * when nothing sensible can be read (Flow 2 "we couldn't read that").
 */
export function parseMeasurement(input: string, unit: Unit): number | null {
  if (typeof input !== "string") return null;
  let s = input.trim().toLowerCase();
  if (s === "") return null;

  let detected: Unit | null = null;

  // A double quote means inches.
  if (s.includes('"')) {
    detected = "in";
    s = s.replace(/"/g, " ");
  }

  // Unit letters only ever appear as the unit token (digits, dots, commas,
  // slashes and spaces carry none), so no word boundaries are needed. Longest
  // alternatives come first so "inches" is matched before "in".
  if (/centimet(?:er|re)s?|cm/.test(s)) {
    detected = "cm";
    s = s.replace(/centimet(?:er|re)s?|cm/g, " ");
  } else if (/inches|inch|in/.test(s)) {
    detected = "in";
    s = s.replace(/inches|inch|in/g, " ");
  }

  const value = parseNumericCore(s.trim());
  if (value === null) return null;

  return toMm(value, detected ?? unit);
}

/** Parse the numeric portion (unit already stripped) to a number, or null. */
function parseNumericCore(raw: string): number | null {
  // Comma is a decimal separator ("72,5" -> "72.5").
  const core = raw.replace(/,/g, ".").trim();
  if (core === "") return null;

  // Whole number plus a fraction: "28 1/2" or "28-1/2".
  const mixed = core.match(/^(\d+(?:\.\d+)?)[\s-]+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den === 0) return null;
    return whole + num / den;
  }

  // Bare fraction: "1/2".
  const frac = core.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }

  // Plain decimal: "72", "72.5", ".5".
  if (/^\d+(?:\.\d+)?$/.test(core) || /^\.\d+$/.test(core)) {
    return Number(core);
  }

  return null;
}
