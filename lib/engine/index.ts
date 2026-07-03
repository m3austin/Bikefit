/*
 * Public entry point for the fit engine. Import from "@/lib/engine".
 * The engine is pure and dependency-free (CLAUDE.md): no React, Next, or DOM.
 */

export { computeFit, recommendCrankMm } from "@/lib/engine/compute";
export {
  ENGINE_VERSION,
  PLAUSIBLE_RANGES,
  SADDLE_BIKE_MOD,
  SADDLE_PRIORITY_MOD,
  REACH_PRIORITY_MOD,
  BAR_DROP_BANDS,
} from "@/lib/engine/constants";
export type {
  BikeType,
  Priority,
  Flexibility,
  MeasurementKey,
  Measurements,
  FitInput,
  RangeMm,
  SaddleHeight,
  FrameSize,
  CautionFlag,
  FitResult,
} from "@/lib/engine/types";
