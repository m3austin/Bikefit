/*
 * The fit engine (PRD §6). Pure and deterministic: same input, same output.
 * No imports from React, Next, or the DOM. Every formula here is locked by the
 * golden test suite; changing an output must fail CI (CLAUDE.md, PRD §9).
 */

import {
  BAR_DROP_BANDS,
  ENGINE_VERSION,
  PLAUSIBLE_RANGES,
  REACH_PRIORITY_MOD,
  SADDLE_BIKE_MOD,
  SADDLE_PRIORITY_MOD,
} from "@/lib/engine/constants";
import type {
  BikeType,
  CautionFlag,
  FitInput,
  FitResult,
  FrameSize,
  MeasurementKey,
  Measurements,
  Priority,
  RangeMm,
  SaddleHeight,
} from "@/lib/engine/types";

/**
 * Round to the nearest mm, ties away from zero (half-up). The +epsilon nudge
 * makes ties robust to binary-float error from the decimal coefficients in the
 * fit formulas, so the code matches a hand calculation (e.g. 71.5 -> 72).
 */
function roundMm(value: number): number {
  const epsilon = value >= 0 ? 1e-9 : -1e-9;
  return Math.round(value + epsilon);
}

/** Recommended crank length in mm by inseam (PRD §6.7). May be 172.5. */
export function recommendCrankMm(inseamMm: number): number {
  if (inseamMm < 750) return 165;
  if (inseamMm < 810) return 170;
  if (inseamMm < 860) return 172.5;
  return 175;
}

/** Saddle height: mean of LeMond and Hamley, then modifiers, ±6 mm (PRD §6.1). */
function saddleHeight(
  inseamMm: number,
  crankLengthMm: number,
  bikeType: BikeType,
  priority: Priority,
): SaddleHeight {
  const lemond = 0.883 * inseamMm;
  const hamley = 1.09 * inseamMm - crankLengthMm;
  const base = roundMm((lemond + hamley) / 2);
  const start = base + SADDLE_BIKE_MOD[bikeType] + SADDLE_PRIORITY_MOD[priority];
  return {
    low: start - 6,
    high: start + 6,
    start,
    methods: { lemond: roundMm(lemond), hamley: roundMm(hamley) },
  };
}

/** Saddle setback estimate from BB, ±10 mm (PRD §6.2). */
function saddleSetback(inseamMm: number): RangeMm {
  const start = roundMm(0.245 * inseamMm - 100);
  return { low: start - 10, high: start + 10, start };
}

/** Frame size, quoted in cm (road-like) or inches (MTB) (PRD §6.3). */
function frameSize(bikeType: BikeType, inseamMm: number): FrameSize {
  if (bikeType === "mtb") {
    // 0.225 x inseam(cm) inches; roundMm on (value x 10) gives one decimal.
    return { mtbInches: roundMm(0.225 * inseamMm) / 10 };
  }
  // Road, gravel, and hybrid: 0.665 x inseam(cm) seat tube c-t.
  return { roadCm: roundMm(0.665 * inseamMm) / 10 };
}

/** Reach (top tube + stem) estimate, ±15 mm, priority-shifted (PRD §6.4). */
function reachBand(torsoMm: number, armMm: number, priority: Priority): RangeMm {
  const start = roundMm((torsoMm + armMm) / 2 + 40) + REACH_PRIORITY_MOD[priority];
  return { low: start - 15, high: start + 15, start };
}

/** Handlebar drop band with a priority-positioned start (PRD §6.5). */
function barDrop(
  bikeType: BikeType,
  flexibility: FitInput["flexibility"],
  priority: Priority,
): RangeMm | undefined {
  if (bikeType !== "road" && bikeType !== "gravel") return undefined;
  const band = BAR_DROP_BANDS[flexibility];
  const start =
    priority === "comfort"
      ? band.low
      : priority === "performance"
        ? band.high
        : roundMm((band.low + band.high) / 2);
  return { low: band.low, high: band.high, start };
}

/** Handlebar width: shoulder rounded to the nearest 20 mm (PRD §6.6). */
function barWidthMm(bikeType: BikeType, shoulderMm: number): number | undefined {
  if (bikeType !== "road" && bikeType !== "gravel") return undefined;
  return roundMm(shoulderMm / 20) * 20;
}

/** Flag any measurement that fell outside its plausible range (PRD §5, Flow 2). */
function cautionFlags(measurements: Measurements): CautionFlag[] {
  const flags: CautionFlag[] = [];
  const entries: Array<[MeasurementKey, number | undefined]> = [
    ["height", measurements.heightMm],
    ["inseam", measurements.inseamMm],
    ["torso", measurements.torsoMm],
    ["arm", measurements.armMm],
    ["shoulder", measurements.shoulderMm],
    ["foot", measurements.footMm],
  ];
  for (const [key, value] of entries) {
    if (value === undefined) continue;
    const range = PLAUSIBLE_RANGES[key];
    if (value < range.minMm) flags.push({ input: key, direction: "below" });
    else if (value > range.maxMm) flags.push({ input: key, direction: "above" });
  }
  return flags;
}

/**
 * Compute the full fit. `computedAt` is injected by the caller (the engine
 * stays pure and never reads the clock); tests pass a fixed value.
 */
export function computeFit(input: FitInput, computedAt = ""): FitResult {
  const { bikeType, priority, flexibility, measurements } = input;
  const { inseamMm, torsoMm, armMm, shoulderMm, footMm } = measurements;

  const crankLengthMm = input.crankLengthMm ?? recommendCrankMm(inseamMm);

  const result: FitResult = {
    meta: {
      engineVersion: ENGINE_VERSION,
      computedAt,
      cautionFlags: cautionFlags(measurements),
    },
    saddleHeight: saddleHeight(inseamMm, crankLengthMm, bikeType, priority),
    saddleSetback: saddleSetback(inseamMm),
    frameSize: frameSize(bikeType, inseamMm),
    reachBand: reachBand(torsoMm, armMm, priority),
    barDrop: barDrop(bikeType, flexibility, priority),
    barWidthMm: barWidthMm(bikeType, shoulderMm),
    crankLengthMm,
  };

  if (footMm !== undefined) {
    result.cleat = { note: true };
  }

  return result;
}
