/*
 * Pure geometry and pose-analysis math (CLAUDE.md: video fit analysis
 * architecture rules). No React, Next, DOM, or MediaPipe runtime imports: this
 * module takes plain landmark arrays in and returns plain numbers/strings out,
 * so it is testable with synthetic fixtures alone.
 *
 * Contents: facing-side detection and tracking confidence (Stage 1), sagittal
 * joint angles, pedal-stroke segmentation, and aggregation (Stage 2), and
 * frontal-plane metrics from a straight-on view: lateral knee deviation,
 * left-right symmetry, and hip drop (Stage B). Function names carry `frontal`
 * when they belong to the straight-on view so the two planes stay easy to
 * tell apart.
 *
 * The constants in this file are DATA-QUALITY tunings (how clean must the
 * signal be), not fit targets; fit target ranges and recommendation rules
 * live only in lib/fit-rules.ts. They are still marked PLACEHOLDER because
 * they are unsourced engineering defaults, not validated values.
 */

import { SIDE_LANDMARKS, type PoseFrame, type Side } from "@/lib/pose-model";

const MIN_FRAMES_FOR_SIDE_VOTE = 1;

/** Visibility defaults to 1 when a landmark omits it (still image models do). */
function visibilityOf(frame: PoseFrame, index: number): number {
  return frame[index]?.visibility ?? 0;
}

/** Mean visibility across one side's tracked joints in a single frame. */
export function averageSideVisibility(frame: PoseFrame, side: Side): number {
  const indices = Object.values(SIDE_LANDMARKS[side]);
  const total = indices.reduce((sum, i) => sum + visibilityOf(frame, i), 0);
  return total / indices.length;
}

/** Mean landmark visibility across all tracked joints (both sides), one frame. */
export function averageFrameVisibility(frame: PoseFrame): number {
  const left = averageSideVisibility(frame, "left");
  const right = averageSideVisibility(frame, "right");
  return (left + right) / 2;
}

export type SideVote = {
  side: Side;
  /** 0 to 1: how much more visible the winning side was on average. */
  confidence: number;
  framesConsidered: number;
};

/**
 * Which side of the rider faces the camera, decided by comparing average
 * landmark visibility for the left versus right joint set across all sampled
 * frames (a rider filmed side-on occludes their far side, which MediaPipe
 * reports with lower visibility). Ties go to "right" (arbitrary but stable).
 */
export function detectFacingSide(frames: readonly PoseFrame[]): SideVote {
  const usable = frames.filter((f) => f.length > 0);
  if (usable.length < MIN_FRAMES_FOR_SIDE_VOTE) {
    return { side: "right", confidence: 0, framesConsidered: 0 };
  }

  const leftTotal = usable.reduce(
    (sum, f) => sum + averageSideVisibility(f, "left"),
    0,
  );
  const rightTotal = usable.reduce(
    (sum, f) => sum + averageSideVisibility(f, "right"),
    0,
  );
  const leftMean = leftTotal / usable.length;
  const rightMean = rightTotal / usable.length;

  const side: Side = leftMean > rightMean ? "left" : "right";
  const winner = Math.max(leftMean, rightMean);
  const loser = Math.min(leftMean, rightMean);
  // Normalise the gap by the winner so confidence is 0 when both sides are
  // equally visible and approaches 1 as the losing side disappears entirely.
  const confidence = winner === 0 ? 0 : (winner - loser) / winner;

  return { side, confidence, framesConsidered: usable.length };
}

export type ConfidenceSample = { timestampMs: number; visibility: number };

/**
 * True once at least `windowSize` of the most recent samples all fall below
 * `threshold` (Stage 1's "confidence stayed low" banner trigger). Older
 * samples outside the window never count, so recovery clears the warning.
 */
export function isSustainedLowConfidence(
  samples: readonly ConfidenceSample[],
  options: { windowSize: number; threshold: number },
): boolean {
  const { windowSize, threshold } = options;
  if (samples.length < windowSize) return false;
  const recent = samples.slice(-windowSize);
  return recent.every((s) => s.visibility < threshold);
}

// --- Stage 2: joint angles ---------------------------------------------------

export type Point2 = { x: number; y: number };

/**
 * PLACEHOLDER: data-quality cutoff (unsourced engineering default). A joint
 * below this landmark visibility is excluded from angle math for that frame.
 */
export const METRIC_VISIBILITY_FLOOR = 0.5;

/**
 * Interior angle at vertex b of the path a-b-c, in degrees within [0, 180].
 * Returns null when either segment has zero length (the angle is undefined).
 */
export function interiorAngleDeg(
  a: Point2,
  b: Point2,
  c: Point2,
): number | null {
  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;
  const lenAb = Math.hypot(abX, abY);
  const lenCb = Math.hypot(cbX, cbY);
  if (lenAb === 0 || lenCb === 0) return null;
  const cos = (abX * cbX + abY * cbY) / (lenAb * lenCb);
  const clamped = Math.min(1, Math.max(-1, cos));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/**
 * Torso lean relative to horizontal, in degrees: 0 is a flat back parallel to
 * the ground, 90 is bolt upright. Independent of which way the rider faces.
 * Image y grows downward, so the shoulder being above the hip means
 * hip.y - shoulder.y is positive. Null when hip and shoulder coincide.
 */
export function torsoAngleDeg(hip: Point2, shoulder: Point2): number | null {
  const dx = Math.abs(shoulder.x - hip.x);
  const dy = hip.y - shoulder.y;
  if (dx === 0 && dy === 0) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

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

// --- Stage 2: pedal stroke segmentation --------------------------------------

/** Centered moving average. Windows are clamped odd and to the series length. */
export function movingAverage(
  values: readonly number[],
  window: number,
): number[] {
  if (values.length === 0) return [];
  const half = Math.floor(Math.max(1, Math.min(window, values.length)) / 2);
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let n = 0;
    for (let j = i - half; j <= i + half; j++) {
      const v = values[j];
      if (v !== undefined) {
        sum += v;
        n++;
      }
    }
    out.push(sum / n);
  }
  return out;
}

export type SegmentationOptions = {
  /** Two bottom-dead-center peaks closer than this are one pedal stroke. */
  minSeparationMs: number;
  /** A peak must sit this far up the ankle's min-to-max Y travel, 0 to 1. */
  minRelativeHeight: number;
  /** Moving-average window (samples) applied to ankle Y before peak-picking. */
  smoothWindow: number;
};

/**
 * PLACEHOLDER: data-quality tunings (unsourced engineering defaults).
 * minSeparationMs 350 assumes cadence stays under ~170 rpm.
 */
export const DEFAULT_SEGMENTATION: SegmentationOptions = {
  minSeparationMs: 350,
  minRelativeHeight: 0.5,
  smoothWindow: 5,
};

/**
 * Indices (into `samples`) of bottom dead center: local maxima of ankle Y per
 * revolution (image y grows downward, so the pedal's lowest point is the
 * largest y). Peaks are smoothed, must clear a relative-height bar so the
 * back-of-stroke wiggle doesn't count, and are picked greedily by height with
 * a minimum time gap. Returned in time order.
 */
export function detectBottomDeadCenters(
  samples: readonly TimedMetrics[],
  options: SegmentationOptions = DEFAULT_SEGMENTATION,
): number[] {
  const usable: Array<{ index: number; tMs: number }> = [];
  const rawY: number[] = [];
  samples.forEach((s, index) => {
    if (s.metrics.anklePos) {
      usable.push({ index, tMs: s.tMs });
      rawY.push(s.metrics.anklePos.y);
    }
  });
  if (usable.length < 3) return [];

  const ys = movingAverage(rawY, options.smoothWindow);
  let min = Infinity;
  let max = -Infinity;
  for (const y of ys) {
    if (y < min) min = y;
    if (y > max) max = y;
  }
  if (max - min < 1e-9) return [];
  const bar = min + options.minRelativeHeight * (max - min);

  const candidates: number[] = [];
  for (let i = 1; i < ys.length - 1; i++) {
    const prev = ys[i - 1];
    const here = ys[i];
    const next = ys[i + 1];
    if (prev === undefined || here === undefined || next === undefined) continue;
    if (here < bar) continue;
    // >= on the left, > on the right: a flat-topped peak counts once.
    if (here >= prev && here > next) candidates.push(i);
  }

  // Greedy by height, keeping only peaks far enough (in time) from the ones
  // already accepted, so noise riding on a real peak can't double-count it.
  candidates.sort((a, b) => (ys[b] ?? 0) - (ys[a] ?? 0));
  const accepted: number[] = [];
  for (const c of candidates) {
    const tc = usable[c]?.tMs;
    if (tc === undefined) continue;
    const clear = accepted.every((a) => {
      const ta = usable[a]?.tMs;
      return ta === undefined || Math.abs(ta - tc) >= options.minSeparationMs;
    });
    if (clear) accepted.push(c);
  }
  accepted.sort((a, b) => a - b);

  const result: number[] = [];
  for (const a of accepted) {
    const u = usable[a];
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

// --- Stage 2: aggregation -----------------------------------------------------

export type MetricStats = {
  min: number;
  max: number;
  mean: number;
  /** Sample standard deviation (n - 1); 0 when only one value. */
  stdDev: number;
  count: number;
};

/** Basic stats over a series. Null for an empty series. */
export function computeStats(values: readonly number[]): MetricStats | null {
  if (values.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  const mean = sum / values.length;
  let sq = 0;
  for (const v of values) sq += (v - mean) * (v - mean);
  const stdDev = values.length > 1 ? Math.sqrt(sq / (values.length - 1)) : 0;
  return { min, max, mean, stdDev, count: values.length };
}

/**
 * PLACEHOLDER: data-quality cutoffs (unsourced engineering defaults). A
 * knee-at-BDC standard deviation above this flags the recording as too noisy
 * to trust; below MIN_STROKES_FOR_REPORT strokes there is no report at all.
 */
export const HIGH_VARIANCE_KNEE_STDDEV_DEG = 5;
export const MIN_STROKES_FOR_REPORT = 2;

export type TimedFrame = { tMs: number; frame: PoseFrame };

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
};

/**
 * The whole Stage 2 pipeline over a recorded pass: pick the facing side from
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
  const vote = detectFacingSide(timedFrames.map((t) => t.frame));
  const samples: TimedMetrics[] = timedFrames.map((t) => ({
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

  return {
    side: vote.side,
    sideConfidence: vote.confidence,
    sampleCount: samples.length,
    analyzedMs: lastSample ? lastSample.tMs : 0,
    strokeCount: strokes.length,
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

// --- Stage B: frontal plane (straight-on view) --------------------------------

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
  const samples: FrontalTimedMetrics[] = timedFrames.map((t) => ({
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
