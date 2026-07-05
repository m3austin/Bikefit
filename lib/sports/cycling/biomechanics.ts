/*
 * Cycling (BikeFit) biomechanics: sagittal joint angles, pedal-stroke
 * segmentation, and frontal-plane knee tracking. Pure math over pose frames;
 * no React, Next, DOM, or MediaPipe runtime. Moved from the original
 * lib/biomechanics.ts with the generic pieces extracted to lib/kernel/*;
 * every output is locked by the same golden tests as before.
 *
 * The constants here are DATA-QUALITY tunings (how clean must the signal be),
 * not fit targets; fit target ranges and recommendation rules live only in
 * lib/sports/cycling/rules.ts. They are still marked PLACEHOLDER because they
 * are unsourced engineering defaults, not validated values.
 */

import { scoreConfidence, type ConfidenceReport } from "@/lib/kernel/confidence";
import {
  detectCyclePeaks,
  type CycleOptions,
  type CyclePoint,
} from "@/lib/kernel/cycles";
import { cleanPoseFrames } from "@/lib/kernel/pose-clean";
import {
  computeStats,
  interiorAngleDeg,
  torsoAngleDeg,
  type MetricStats,
  type Point2,
} from "@/lib/kernel/geometry";
import {
  METRIC_VISIBILITY_FLOOR,
  detectFacingSide,
  type TimedFrame,
} from "@/lib/kernel/tracking";
import { SIDE_LANDMARKS, type PoseFrame, type Side } from "@/lib/pose-model";

// Convenience re-exports so cycling consumers keep one import path for the
// kernel utilities this module is built on.
export {
  computeStats,
  interiorAngleDeg,
  movingAverage,
  torsoAngleDeg,
} from "@/lib/kernel/geometry";
export type { MetricStats, Point2 } from "@/lib/kernel/geometry";
export {
  METRIC_VISIBILITY_FLOOR,
  averageFrameVisibility,
  averageSideVisibility,
  detectFacingSide,
  isSustainedLowConfidence,
} from "@/lib/kernel/tracking";
export type {
  ConfidenceSample,
  SideVote,
  TimedFrame,
} from "@/lib/kernel/tracking";

// --- Sagittal (side view) joint angles ---------------------------------------

/** One frame's joint angles and the positions later stages segment on. */
export type FrameMetrics = {
  /** Hip-knee-ankle interior angle (extension = larger). */
  kneeDeg: number | null;
  /** Shoulder-hip-knee interior angle (how closed the hip is). */
  hipDeg: number | null;
  /** Shoulder-elbow-wrist interior angle. */
  elbowDeg: number | null;
  /** Back lean from horizontal. */
  torsoDeg: number | null;
  anklePos: Point2 | null;
  hipPos: Point2 | null;
  shoulderPos: Point2 | null;
};

export type TimedMetrics = { tMs: number; metrics: FrameMetrics };

/**
 * Per-frame joint angles for one side of the rider. MediaPipe x and y are
 * normalized by video width and height separately, so x is multiplied by the
 * video aspect ratio (width / height) to put both axes in one unit; without
 * that, every angle would be distorted, differently for portrait and
 * landscape footage. Each metric is computed independently, so one occluded
 * joint (say, the wrist behind the hip) only nulls the metrics that need it.
 */
export function computeFrameMetrics(
  frame: PoseFrame,
  side: Side,
  aspectRatio: number,
): FrameMetrics {
  const ids = SIDE_LANDMARKS[side];
  const point = (index: number): Point2 | null => {
    const lm = frame[index];
    if (!lm || (lm.visibility ?? 0) < METRIC_VISIBILITY_FLOOR) return null;
    return { x: lm.x * aspectRatio, y: lm.y };
  };
  const shoulder = point(ids.shoulder);
  const elbow = point(ids.elbow);
  const wrist = point(ids.wrist);
  const hip = point(ids.hip);
  const knee = point(ids.knee);
  const ankle = point(ids.ankle);

  return {
    kneeDeg: hip && knee && ankle ? interiorAngleDeg(hip, knee, ankle) : null,
    hipDeg: shoulder && hip && knee ? interiorAngleDeg(shoulder, hip, knee) : null,
    elbowDeg:
      shoulder && elbow && wrist ? interiorAngleDeg(shoulder, elbow, wrist) : null,
    torsoDeg: hip && shoulder ? torsoAngleDeg(hip, shoulder) : null,
    anklePos: ankle,
    hipPos: hip,
    shoulderPos: shoulder,
  };
}

// --- Pedal stroke segmentation ------------------------------------------------

export type SegmentationOptions = CycleOptions;

/**
 * PLACEHOLDER: data-quality tunings (unsourced engineering defaults).
 * minSeparationMs 350 assumes cadence stays under ~170 rpm.
 */
export const DEFAULT_SEGMENTATION: SegmentationOptions = {
  minSeparationMs: 350,
  minRelativeHeight: 0.5,
  smoothWindow: 5,
  // A pedal stroke off the cadence beat is a tracker artifact, not a stroke.
  intervalTolerance: 0.4,
};

/**
 * Indices (into `samples`) of bottom dead center: one ankle-Y peak per
 * revolution (image y grows downward, so the pedal's lowest point is the
 * largest y). Wraps the kernel's cyclic peak detector over the frames where
 * the ankle is visible, then maps indices back to the full sample stream.
 */
export function detectBottomDeadCenters(
  samples: readonly TimedMetrics[],
  options: SegmentationOptions = DEFAULT_SEGMENTATION,
): number[] {
  const usable: Array<{ index: number; point: CyclePoint }> = [];
  samples.forEach((s, index) => {
    if (s.metrics.anklePos) {
      usable.push({
        index,
        point: { tMs: s.tMs, value: s.metrics.anklePos.y },
      });
    }
  });
  const peaks = detectCyclePeaks(
    usable.map((u) => u.point),
    options,
  );
  const result: number[] = [];
  for (const p of peaks) {
    const u = usable[p];
    if (u) result.push(u.index);
  }
  return result;
}

/**
 * The rider's forward direction along x: +1 facing increasing x, -1 facing
 * decreasing x, 0 undeterminable. A seated rider leans toward the bars, so
 * the shoulder sits ahead of the hip.
 */
export function detectForwardSign(
  samples: readonly TimedMetrics[],
): -1 | 0 | 1 {
  let sum = 0;
  let n = 0;
  for (const s of samples) {
    const { shoulderPos, hipPos } = s.metrics;
    if (shoulderPos && hipPos) {
      sum += shoulderPos.x - hipPos.x;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  if (Math.abs(mean) < 1e-9) return 0;
  return mean > 0 ? 1 : -1;
}

export type Stroke = {
  bdcIndex: number;
  nextBdcIndex: number;
  /**
   * The 3 o'clock crank position: the sample of maximum forward ankle
   * displacement from the hip within this revolution. Null when the forward
   * direction is unknown or no frame in the revolution had both landmarks.
   */
  threeOClockIndex: number | null;
};

export type Segmentation = {
  bdcIndices: number[];
  strokes: Stroke[];
  forwardSign: -1 | 0 | 1;
};

/** Split the sample stream into pedal strokes (one per BDC-to-BDC interval). */
export function segmentStrokes(
  samples: readonly TimedMetrics[],
  options: SegmentationOptions = DEFAULT_SEGMENTATION,
): Segmentation {
  const bdcIndices = detectBottomDeadCenters(samples, options);
  const forwardSign = detectForwardSign(samples);
  const strokes: Stroke[] = [];

  for (let k = 0; k + 1 < bdcIndices.length; k++) {
    const start = bdcIndices[k];
    const end = bdcIndices[k + 1];
    if (start === undefined || end === undefined) continue;

    let best: number | null = null;
    let bestValue = -Infinity;
    if (forwardSign !== 0) {
      for (let j = start + 1; j < end; j++) {
        const m = samples[j]?.metrics;
        if (!m?.anklePos || !m.hipPos) continue;
        const value = forwardSign * (m.anklePos.x - m.hipPos.x);
        if (value > bestValue) {
          bestValue = value;
          best = j;
        }
      }
    }
    strokes.push({ bdcIndex: start, nextBdcIndex: end, threeOClockIndex: best });
  }

  return { bdcIndices, strokes, forwardSign };
}

// --- Sagittal aggregation -------------------------------------------------------

/**
 * PLACEHOLDER: data-quality cutoffs (unsourced engineering defaults). A
 * knee-at-BDC standard deviation above this flags the recording as too noisy
 * to trust; below MIN_STROKES_FOR_REPORT strokes there is no report at all.
 */
export const HIGH_VARIANCE_KNEE_STDDEV_DEG = 5;
export const MIN_STROKES_FOR_REPORT = 2;

export type StrokeReport = {
  side: Side;
  sideConfidence: number;
  sampleCount: number;
  analyzedMs: number;
  strokeCount: number;
  /** From mean BDC spacing; null below two BDCs. */
  cadenceRpm: number | null;
  /** Key-frame timestamps for marking on the timeline. */
  bdcTMs: number[];
  threeOClockTMs: number[];
  /** One knee reading per detected BDC (nulls skipped). */
  kneeAtBdcDeg: number[];
  stats: {
    kneeAtBdc: MetricStats | null;
    hip: MetricStats | null;
    elbow: MetricStats | null;
    torso: MetricStats | null;
  };
  /** Data-quality flag: knee-at-BDC spread beyond the placeholder cutoff. */
  highVariance: boolean;
  /** Overall result confidence (leg tracking, cadence steadiness, side-vote). */
  confidence: ConfidenceReport;
};

/**
 * The whole sagittal pipeline over a recorded pass: pick the facing side from
 * the footage itself, compute per-frame angles (aspect-corrected), segment
 * pedal strokes, and aggregate. Knee angle is read once per stroke at BDC
 * (that is the fit-relevant instant); hip, elbow, and torso are aggregated
 * across every frame between the first and last BDC, where pedaling is
 * steady-state.
 */
export function buildStrokeReport(
  timedFrames: readonly TimedFrame[],
  aspectRatio: number,
  options: SegmentationOptions = DEFAULT_SEGMENTATION,
): StrokeReport {
  const frames = cleanPoseFrames(timedFrames);
  const vote = detectFacingSide(frames.map((t) => t.frame));
  const samples: TimedMetrics[] = frames.map((t) => ({
    tMs: t.tMs,
    metrics: computeFrameMetrics(t.frame, vote.side, aspectRatio),
  }));

  const segmentation = segmentStrokes(samples, options);
  const { bdcIndices, strokes } = segmentation;

  const bdcTMs: number[] = [];
  const kneeAtBdcDeg: number[] = [];
  for (const i of bdcIndices) {
    const s = samples[i];
    if (!s) continue;
    bdcTMs.push(s.tMs);
    if (s.metrics.kneeDeg !== null) kneeAtBdcDeg.push(s.metrics.kneeDeg);
  }

  const threeOClockTMs: number[] = [];
  for (const stroke of strokes) {
    if (stroke.threeOClockIndex === null) continue;
    const s = samples[stroke.threeOClockIndex];
    if (s) threeOClockTMs.push(s.tMs);
  }

  let cadenceRpm: number | null = null;
  if (bdcTMs.length >= 2) {
    const first = bdcTMs[0];
    const last = bdcTMs[bdcTMs.length - 1];
    if (first !== undefined && last !== undefined && last > first) {
      const meanIntervalMs = (last - first) / (bdcTMs.length - 1);
      cadenceRpm = 60000 / meanIntervalMs;
    }
  }

  // Steady-state region: everything between the first and last BDC.
  const firstBdc = bdcIndices[0];
  const lastBdc = bdcIndices[bdcIndices.length - 1];
  const hip: number[] = [];
  const elbow: number[] = [];
  const torso: number[] = [];
  if (firstBdc !== undefined && lastBdc !== undefined) {
    for (let i = firstBdc; i <= lastBdc; i++) {
      const m = samples[i]?.metrics;
      if (!m) continue;
      if (m.hipDeg !== null) hip.push(m.hipDeg);
      if (m.elbowDeg !== null) elbow.push(m.elbowDeg);
      if (m.torsoDeg !== null) torso.push(m.torsoDeg);
    }
  }

  const kneeStats = computeStats(kneeAtBdcDeg);
  const lastSample = samples[samples.length - 1];

  const cadenceDurationsMs: number[] = [];
  for (let i = 1; i < bdcTMs.length; i++) {
    cadenceDurationsMs.push((bdcTMs[i] ?? 0) - (bdcTMs[i - 1] ?? 0));
  }
  const legVisible = samples.filter((s) => s.metrics.kneeDeg !== null).length;
  const confidence = scoreConfidence({
    trackedFraction: samples.length > 0 ? legVisible / samples.length : 0,
    cycleDurationsMs: cadenceDurationsMs,
    cycleCount: strokes.length,
    minCycles: 3,
    sideConfidence: vote.confidence,
  });

  return {
    side: vote.side,
    sideConfidence: vote.confidence,
    sampleCount: samples.length,
    analyzedMs: lastSample ? lastSample.tMs : 0,
    strokeCount: strokes.length,
    confidence,
    cadenceRpm,
    bdcTMs,
    threeOClockTMs,
    kneeAtBdcDeg,
    stats: {
      kneeAtBdc: kneeStats,
      hip: computeStats(hip),
      elbow: computeStats(elbow),
      torso: computeStats(torso),
    },
    highVariance:
      kneeStats !== null && kneeStats.stdDev > HIGH_VARIANCE_KNEE_STDDEV_DEG,
  };
}

// --- Frontal plane (straight-on view) ------------------------------------------

/**
 * Signed lateral offset of the knee from the hip-ankle line, measured at the
 * knee's height, in the same (aspect-corrected) units as the input points.
 * Positive is MEDIAL: the knee collapsing toward the bike's centerline
 * (`midlineX`, normally the mid-hip x). Negative is lateral, bowing away.
 * The convention is defined relative to the midline, so it holds whether the
 * camera is in front of or behind the rider. Null when hip and ankle share a
 * y (the line has no defined x at the knee's height).
 */
export function frontalKneeDeviation(
  hip: Point2,
  knee: Point2,
  ankle: Point2,
  midlineX: number,
): number | null {
  const spanY = ankle.y - hip.y;
  if (Math.abs(spanY) < 1e-9) return null;
  const t = (knee.y - hip.y) / spanY;
  const lineX = hip.x + t * (ankle.x - hip.x);
  const dx = knee.x - lineX;
  // Which side of the midline this leg occupies decides which x direction is
  // medial. On the midline itself, treat +x toward-midline as medial.
  const legX = (hip.x + ankle.x) / 2;
  const medialSign = legX <= midlineX ? 1 : -1;
  return dx * medialSign;
}

/**
 * One straight-on frame's metrics for both legs. Deviations and hip drop are
 * normalized by hip width (the distance between the two hip landmarks), so
 * they are dimensionless fractions comparable across videos and resolutions;
 * multiply by 100 for percent. Ankles are kept even when the hips are not
 * visible, because stroke segmentation only needs the ankles.
 */
export type FrontalFrameMetrics = {
  /** Left knee's offset from its hip-ankle line, medial positive, / hip width. */
  leftKneeDeviation: number | null;
  rightKneeDeviation: number | null;
  /** Positive when the LEFT hip sits lower in the frame, / hip width. */
  hipDrop: number | null;
  leftAnkle: Point2 | null;
  rightAnkle: Point2 | null;
};

export type FrontalTimedMetrics = { tMs: number; metrics: FrontalFrameMetrics };

/**
 * Per-frame frontal metrics. Aspect correction is identical to the sagittal
 * path: x is multiplied by width / height so both axes share one unit. The
 * hip-width normalization then cancels the video's overall scale.
 */
export function computeFrontalFrameMetrics(
  frame: PoseFrame,
  aspectRatio: number,
): FrontalFrameMetrics {
  const point = (index: number): Point2 | null => {
    const lm = frame[index];
    if (!lm || (lm.visibility ?? 0) < METRIC_VISIBILITY_FLOOR) return null;
    return { x: lm.x * aspectRatio, y: lm.y };
  };
  const left = SIDE_LANDMARKS.left;
  const right = SIDE_LANDMARKS.right;
  const leftHip = point(left.hip);
  const rightHip = point(right.hip);
  const leftKnee = point(left.knee);
  const rightKnee = point(right.knee);
  const leftAnkle = point(left.ankle);
  const rightAnkle = point(right.ankle);

  const none: FrontalFrameMetrics = {
    leftKneeDeviation: null,
    rightKneeDeviation: null,
    hipDrop: null,
    leftAnkle,
    rightAnkle,
  };

  if (!leftHip || !rightHip) return none;
  const hipWidth = Math.abs(leftHip.x - rightHip.x);
  if (hipWidth < 1e-9) return none;
  const midlineX = (leftHip.x + rightHip.x) / 2;

  const leftRaw =
    leftKnee && leftAnkle
      ? frontalKneeDeviation(leftHip, leftKnee, leftAnkle, midlineX)
      : null;
  const rightRaw =
    rightKnee && rightAnkle
      ? frontalKneeDeviation(rightHip, rightKnee, rightAnkle, midlineX)
      : null;

  return {
    leftKneeDeviation: leftRaw === null ? null : leftRaw / hipWidth,
    rightKneeDeviation: rightRaw === null ? null : rightRaw / hipWidth,
    hipDrop: (leftHip.y - rightHip.y) / hipWidth,
    leftAnkle,
    rightAnkle,
  };
}

/**
 * Crank-timing offset between the legs, one value per left-leg stroke, in
 * degrees of the pedal cycle. For each left BDC, the elapsed time since the
 * most recent right BDC is expressed as a fraction of the left leg's mean
 * period times 360. Perfectly alternating legs read 180.
 */
export function strokeTimingOffsetDeg(
  leftBdcTMs: readonly number[],
  rightBdcTMs: readonly number[],
): number[] {
  if (leftBdcTMs.length < 2 || rightBdcTMs.length < 1) return [];
  const first = leftBdcTMs[0];
  const last = leftBdcTMs[leftBdcTMs.length - 1];
  if (first === undefined || last === undefined || last <= first) return [];
  const period = (last - first) / (leftBdcTMs.length - 1);

  const offsets: number[] = [];
  for (const tLeft of leftBdcTMs) {
    let tRight: number | undefined;
    for (const r of rightBdcTMs) {
      if (r <= tLeft) tRight = r;
      else break;
    }
    if (tRight === undefined) continue;
    const fraction = ((tLeft - tRight) / period) % 1;
    offsets.push(fraction * 360);
  }
  return offsets;
}

/**
 * PLACEHOLDER: data-quality cutoff (unsourced engineering default). A
 * per-stroke peak knee deviation spread above this many percent of hip width
 * flags the recording as too noisy to trust, usually camera shake or a
 * not-quite-straight-on angle.
 */
export const FRONTAL_HIGH_VARIANCE_PEAK_PCT = 8;

export type FrontalStrokeReport = {
  sampleCount: number;
  analyzedMs: number;
  strokeCountLeft: number;
  strokeCountRight: number;
  /** From BDC spacing, averaged over the legs that have two or more BDCs. */
  cadenceRpm: number | null;
  /** All stats are in percent of hip width except timing (degrees). */
  stats: {
    leftKneeDeviationPct: MetricStats | null;
    rightKneeDeviationPct: MetricStats | null;
    /** Peak medial deviation within each left-leg stroke. */
    leftPeakDeviationPct: MetricStats | null;
    rightPeakDeviationPct: MetricStats | null;
    hipDropPct: MetricStats | null;
    /** Left-right crank timing per stroke; 180 is perfectly alternating. */
    timingOffsetDeg: MetricStats | null;
  };
  /** Data-quality flag: per-stroke peaks spread beyond the placeholder cutoff. */
  highVariance: boolean;
};

/** Wrap one leg's ankle track in the sagittal sample shape so the shared BDC
 * detector can segment it. Indices returned by the detector line up 1:1 with
 * the frontal samples array. */
function ankleOnlySamples(
  samples: readonly FrontalTimedMetrics[],
  leg: "left" | "right",
): TimedMetrics[] {
  return samples.map((s) => ({
    tMs: s.tMs,
    metrics: {
      kneeDeg: null,
      hipDeg: null,
      elbowDeg: null,
      torsoDeg: null,
      anklePos: leg === "left" ? s.metrics.leftAnkle : s.metrics.rightAnkle,
      hipPos: null,
      shoulderPos: null,
    },
  }));
}

/** Peak (max medial) deviation per stroke for one leg, in percent. */
function perStrokePeaksPct(
  samples: readonly FrontalTimedMetrics[],
  bdcIndices: readonly number[],
  leg: "left" | "right",
): number[] {
  const peaks: number[] = [];
  for (let k = 0; k + 1 < bdcIndices.length; k++) {
    const start = bdcIndices[k];
    const end = bdcIndices[k + 1];
    if (start === undefined || end === undefined) continue;
    let best: number | null = null;
    for (let i = start; i <= end; i++) {
      const m = samples[i]?.metrics;
      const value =
        leg === "left" ? m?.leftKneeDeviation : m?.rightKneeDeviation;
      if (value === null || value === undefined) continue;
      if (best === null || value > best) best = value;
    }
    if (best !== null) peaks.push(best * 100);
  }
  return peaks;
}

/**
 * The whole frontal pipeline over a recorded straight-on pass: per-frame
 * metrics (aspect-corrected, hip-width normalized), per-leg pedal-stroke
 * segmentation from each ankle's vertical track, then aggregation. Per-frame
 * stats cover the steady-state region between the earliest and latest BDC of
 * either leg; peaks and timing are per stroke.
 */
export function buildFrontalStrokeReport(
  timedFrames: readonly TimedFrame[],
  aspectRatio: number,
  options: SegmentationOptions = DEFAULT_SEGMENTATION,
): FrontalStrokeReport {
  const samples: FrontalTimedMetrics[] = cleanPoseFrames(timedFrames).map((t) => ({
    tMs: t.tMs,
    metrics: computeFrontalFrameMetrics(t.frame, aspectRatio),
  }));

  const leftBdc = detectBottomDeadCenters(ankleOnlySamples(samples, "left"), options);
  const rightBdc = detectBottomDeadCenters(ankleOnlySamples(samples, "right"), options);

  const bdcTimes = (indices: readonly number[]): number[] => {
    const times: number[] = [];
    for (const i of indices) {
      const s = samples[i];
      if (s) times.push(s.tMs);
    }
    return times;
  };
  const leftBdcT = bdcTimes(leftBdc);
  const rightBdcT = bdcTimes(rightBdc);

  const cadenceOf = (times: readonly number[]): number | null => {
    if (times.length < 2) return null;
    const first = times[0];
    const last = times[times.length - 1];
    if (first === undefined || last === undefined || last <= first) return null;
    return 60000 / ((last - first) / (times.length - 1));
  };
  const cadences = [cadenceOf(leftBdcT), cadenceOf(rightBdcT)].filter(
    (c): c is number => c !== null,
  );
  const cadenceRpm =
    cadences.length > 0
      ? cadences.reduce((sum, c) => sum + c, 0) / cadences.length
      : null;

  // Steady-state region: earliest to latest BDC across both legs.
  const allBdc = [...leftBdc, ...rightBdc].sort((a, b) => a - b);
  const firstIdx = allBdc[0];
  const lastIdx = allBdc[allBdc.length - 1];
  const leftDev: number[] = [];
  const rightDev: number[] = [];
  const hipDrop: number[] = [];
  if (firstIdx !== undefined && lastIdx !== undefined) {
    for (let i = firstIdx; i <= lastIdx; i++) {
      const m = samples[i]?.metrics;
      if (!m) continue;
      if (m.leftKneeDeviation !== null) leftDev.push(m.leftKneeDeviation * 100);
      if (m.rightKneeDeviation !== null)
        rightDev.push(m.rightKneeDeviation * 100);
      if (m.hipDrop !== null) hipDrop.push(m.hipDrop * 100);
    }
  }

  const leftPeaks = computeStats(perStrokePeaksPct(samples, leftBdc, "left"));
  const rightPeaks = computeStats(perStrokePeaksPct(samples, rightBdc, "right"));
  const lastSample = samples[samples.length - 1];

  return {
    sampleCount: samples.length,
    analyzedMs: lastSample ? lastSample.tMs : 0,
    strokeCountLeft: Math.max(0, leftBdcT.length - 1),
    strokeCountRight: Math.max(0, rightBdcT.length - 1),
    cadenceRpm,
    stats: {
      leftKneeDeviationPct: computeStats(leftDev),
      rightKneeDeviationPct: computeStats(rightDev),
      leftPeakDeviationPct: leftPeaks,
      rightPeakDeviationPct: rightPeaks,
      hipDropPct: computeStats(hipDrop),
      timingOffsetDeg: computeStats(strokeTimingOffsetDeg(leftBdcT, rightBdcT)),
    },
    highVariance:
      (leftPeaks !== null && leftPeaks.stdDev > FRONTAL_HIGH_VARIANCE_PEAK_PCT) ||
      (rightPeaks !== null && rightPeaks.stdDev > FRONTAL_HIGH_VARIANCE_PEAK_PCT),
  };
}
