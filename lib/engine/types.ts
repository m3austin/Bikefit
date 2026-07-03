/*
 * The fit engine contract (PRD §6, §9). These types are pure data: no React,
 * Next, or DOM. All lengths are integer millimetres unless a field name says
 * otherwise (crankLengthMm may be a half-mm like 172.5; frame sizes are quoted
 * in cm/inches by convention). See docs/engine-verification.md.
 */

export type BikeType = "road" | "gravel" | "mtb" | "hybrid";
export type Priority = "comfort" | "balanced" | "performance";
export type Flexibility = "low" | "medium" | "high";

/** The body measurements the engine reasons about (PRD §5). */
export type MeasurementKey =
  | "height"
  | "inseam"
  | "torso"
  | "arm"
  | "shoulder"
  | "foot";

/** All measurements in integer mm. `foot` is optional (cleat guidance). */
export type Measurements = {
  heightMm: number;
  inseamMm: number;
  torsoMm: number;
  armMm: number;
  shoulderMm: number;
  footMm?: number;
};

export type FitInput = {
  bikeType: BikeType;
  priority: Priority;
  flexibility: Flexibility;
  measurements: Measurements;
  /** If the rider knows their crank length; otherwise the engine recommends one. */
  crankLengthMm?: number;
};

/** A recommended range with a starting point, all in integer mm. */
export type RangeMm = {
  low: number;
  high: number;
  start: number;
};

/** Saddle height also reports the two source methods (PRD §6.1). */
export type SaddleHeight = RangeMm & {
  methods: { lemond: number; hamley: number };
};

/** Frame sizing is buyer-facing, quoted in cm (road-like) or inches (MTB). */
export type FrameSize = {
  roadCm?: number;
  mtbInches?: number;
};

/** A measurement that fell outside its plausible range (Flow 2 caution). */
export type CautionFlag = {
  input: MeasurementKey;
  direction: "below" | "above";
};

export type FitResult = {
  meta: {
    engineVersion: string;
    computedAt: string;
    cautionFlags: CautionFlag[];
  };
  saddleHeight: SaddleHeight;
  saddleSetback: RangeMm;
  frameSize: FrameSize;
  reachBand: RangeMm;
  /** Undefined for MTB and hybrid (no drop bars). */
  barDrop?: RangeMm;
  /** Undefined for MTB and hybrid (flat bars, informational only). */
  barWidthMm?: number;
  /** May be a 2.5 mm step (e.g. 172.5); not constrained to integers. */
  crankLengthMm: number;
  /** Present only when foot length was provided. */
  cleat?: { note: true };
};
