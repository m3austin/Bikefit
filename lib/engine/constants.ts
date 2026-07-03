/*
 * Engine constants: the fit-method facts from PRD §5 and §6. Changing any of
 * these changes golden values and must fail CI (CLAUDE.md). These are the
 * single source of truth for the plausible ranges the wizard also uses.
 */

import type { BikeType, Flexibility, MeasurementKey, Priority } from "@/lib/engine/types";

/** Bump when any golden value changes; recorded in every FitResult. */
export const ENGINE_VERSION = "1.0.0";

/** Plausible ranges in mm (PRD §5). Outside these, the engine flags caution. */
export const PLAUSIBLE_RANGES: Record<
  MeasurementKey,
  { minMm: number; maxMm: number }
> = {
  height: { minMm: 1400, maxMm: 2100 },
  inseam: { minMm: 600, maxMm: 1000 },
  torso: { minMm: 450, maxMm: 750 },
  arm: { minMm: 500, maxMm: 800 },
  shoulder: { minMm: 320, maxMm: 500 },
  foot: { minMm: 220, maxMm: 330 },
};

/** Saddle-height bike-type modifier in mm (PRD §6.1). */
export const SADDLE_BIKE_MOD: Record<BikeType, number> = {
  road: 0,
  gravel: -2,
  mtb: -5,
  hybrid: -5,
};

/** Saddle-height priority modifier in mm (PRD §6.1). */
export const SADDLE_PRIORITY_MOD: Record<Priority, number> = {
  comfort: -3,
  balanced: -1,
  performance: 0,
};

/** Reach priority modifier in mm (PRD §6.4). */
export const REACH_PRIORITY_MOD: Record<Priority, number> = {
  comfort: -10,
  balanced: 0,
  performance: 10,
};

/**
 * Handlebar drop bands in mm below the saddle, by flexibility (PRD §6.5).
 * Priority positions the start within the band: comfort = least drop (band
 * low), performance = most drop (band high), balanced = midpoint.
 */
export const BAR_DROP_BANDS: Record<Flexibility, { low: number; high: number }> = {
  high: { low: 60, high: 100 },
  medium: { low: 30, high: 60 },
  low: { low: 0, high: 30 },
};
