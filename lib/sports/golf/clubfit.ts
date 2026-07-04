/*
 * GolfFit Tool A: static club-fitting starting points (docs/sportfit/02
 * section 3). Educational, not a fitting: the honest limit (a real fitting
 * uses a lie board and a launch monitor) ships with the copy.
 *
 * ============================ PLACEHOLDERS ============================
 * The length chart below is a PLACEHOLDER modeled on common static-fit
 * charts, NOT a sourced manufacturer table. The owner replaces it with a
 * confirmed chart; no session may tune it silently.
 * ======================================================================
 */

export type LengthAdjustment = {
  /** Athlete-facing label, e.g. "Standard length". */
  label: string;
  /** Suggested change from standard, in inches (clubs are sold that way). */
  deltaInches: number;
};

/**
 * PLACEHOLDER static-fit chart: wrist-to-floor is the primary axis (it
 * captures arm length better than height alone); height only nudges the
 * extremes. All boundaries in mm.
 */
const WRIST_TO_FLOOR_CHART: ReadonlyArray<{
  maxMm: number;
  deltaInches: number;
}> = [
  { maxMm: 737, deltaInches: -1 },
  { maxMm: 787, deltaInches: -0.5 },
  { maxMm: 889, deltaInches: 0 },
  { maxMm: 940, deltaInches: 0.5 },
  { maxMm: Infinity, deltaInches: 1 },
];

/** PLACEHOLDER: very tall or short players nudge one half-step further. */
const TALL_HEIGHT_MM = 1930;
const SHORT_HEIGHT_MM = 1550;

function label(deltaInches: number): string {
  if (deltaInches === 0) return "Standard length";
  const sign = deltaInches > 0 ? "+" : "-";
  const magnitude = Math.abs(deltaInches);
  const fraction = magnitude === 0.25 ? "1/4" : magnitude === 0.5 ? "1/2" : magnitude === 0.75 ? "3/4" : String(magnitude);
  return `${sign}${fraction} inch${magnitude > 1 ? "es" : ""} from standard`;
}

/**
 * Starting club-length suggestion from height and wrist-to-floor, both in
 * mm (integer, per the app-wide unit rule). A starting point for trying
 * clubs, not a spec.
 */
export function clubLengthAdjustment(
  heightMm: number,
  wristToFloorMm: number,
): LengthAdjustment {
  let delta = 0;
  for (const row of WRIST_TO_FLOOR_CHART) {
    if (wristToFloorMm <= row.maxMm) {
      delta = row.deltaInches;
      break;
    }
  }
  if (heightMm >= TALL_HEIGHT_MM) delta += 0.25;
  if (heightMm <= SHORT_HEIGHT_MM) delta -= 0.25;
  // Clubs are commonly adjusted in quarter-inch steps within +/- 1.5".
  delta = Math.max(-1.5, Math.min(1.5, delta));
  return { label: label(delta), deltaInches: delta };
}

/** Plausible input ranges for the calculator's challenge state (mm). */
export const CLUBFIT_RANGES = {
  // PLACEHOLDER plausible ranges, same convention as the cycling wizard.
  height: { minMm: 1400, maxMm: 2100 },
  wristToFloor: { minMm: 600, maxMm: 1100 },
};
