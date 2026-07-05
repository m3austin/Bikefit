/*
 * RunFit gait biomechanics (docs/sportfit/02-Sport-Modules.md section 1).
 * Pure math over pose frames; no React, DOM, or MediaPipe runtime. Running
 * is cyclic like pedaling, so strides come from the kernel's cyclic peak
 * detector on the ankle track (footstrike = the ankle's lowest point, which
 * in image coordinates is its largest y), directly analogous to cycling's
 * bottom-dead-center detector.
 *
 * 2D honesty: one side-on camera reads the sagittal plane only. Overstride
 * and vertical oscillation are normalized by the runner's own leg length so
 * they are camera-distance invariant; foot strike is REPORTED, never judged.
 * The optional rear view reuses the same hip-drop idea as cycling's frontal
 * analysis for pelvic drop.
 *
 * The constants here are DATA-QUALITY tunings, marked PLACEHOLDER because
 * they are unsourced engineering defaults; gait targets live in
 * lib/sports/running/rules.ts.
 */

import {
  crossValidateEvents,
  scoreConfidence,
  type ConfidenceReport,
} from "@/lib/kernel/confidence";
import {
  detectCyclePeaks,
  type CycleOptions,
  type CyclePoint,
} from "@/lib/kernel/cycles";
import {
  computeStats,
  interiorAngleDeg,
  movingAverage,
  type MetricStats,
  type Point2,
} from "@/lib/kernel/geometry";
import {
  METRIC_VISIBILITY_FLOOR,
  detectFacingSide,
  type TimedFrame,
} from "@/lib/kernel/tracking";
import { LANDMARK, SIDE_LANDMARKS, type PoseFrame, type Side } from "@/lib/pose-model";

// --- Per-frame extraction (side view) -------------------------------------------

/** One frame's gait-relevant points and angles for the facing side. */
export type RunFrameMetrics = {
  /** Hip-knee-ankle interior angle (180 = straight leg). */
  kneeDeg: number | null;
  /** Hip-to-shoulder lean from VERTICAL: 0 upright, positive = tilted. */
  trunkLeanDeg: number | null;
  hipPos: Point2 | null;
  anklePos: Point2 | null;
  heelPos: Point2 | null;
  footPos: Point2 | null;
};

export type RunTimedMetrics = { tMs: number; metrics: RunFrameMetrics };

export function computeRunFrameMetrics(
  frame: PoseFrame,
  side: Side,
  aspectRatio: number,
): RunFrameMetrics {
  const point = (index: number): Point2 | null => {
    const lm = frame[index];
    if (!lm || (lm.visibility ?? 0) < METRIC_VISIBILITY_FLOOR) return null;
    return { x: lm.x * aspectRatio, y: lm.y };
  };
  const ids = SIDE_LANDMARKS[side];
  const heelIdx = side === "left" ? LANDMARK.LEFT_HEEL : LANDMARK.RIGHT_HEEL;
  const footIdx =
    side === "left" ? LANDMARK.LEFT_FOOT_INDEX : LANDMARK.RIGHT_FOOT_INDEX;

  const shoulder = point(ids.shoulder);
  const hip = point(ids.hip);
  const knee = point(ids.knee);
  const ankle = point(ids.ankle);

  let trunkLeanDeg: number | null = null;
  if (shoulder && hip) {
    const dx = Math.abs(shoulder.x - hip.x);
    const dy = Math.abs(hip.y - shoulder.y);
    if (dx > 1e-9 || dy > 1e-9) {
      // Lean from vertical: atan(horizontal / vertical).
      trunkLeanDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
    }
  }

  return {
    kneeDeg: hip && knee && ankle ? interiorAngleDeg(hip, knee, ankle) : null,
    trunkLeanDeg,
    hipPos: hip,
    anklePos: ankle,
    heelPos: point(heelIdx),
    footPos: point(footIdx),
  };
}

// --- Stride segmentation ---------------------------------------------------------

/**
 * PLACEHOLDER: data-quality tunings (unsourced engineering defaults).
 * minSeparationMs 400 allows one leg up to 150 strides/min (300 steps/min
 * counting both feet), comfortably above any human cadence.
 */
export const GAIT_SEGMENTATION = {
  minSeparationMs: 400,
  minRelativeHeight: 0.5,
  smoothWindow: 5,
  // A runner drifts across frame, so the ankle-Y amplitude drifts too: judge
  // footstrikes by local prominence, not a whole-clip height bar.
  minProminence: 0.15,
  // A contact off the stride beat is a tracker artifact, not a step.
  intervalTolerance: 0.4,
  /** Stance ends when the smoothed ankle lifts this fraction of its
   * within-stride travel above the footstrike level. */
  stanceLiftFraction: 0.25,
} as const;

/** Below this many full strides there is no report at all. PLACEHOLDER. */
export const MIN_STRIDES_FOR_REPORT = 3;

export type GaitSegmentationOptions = CycleOptions & {
  stanceLiftFraction: number;
};

export type Stride = {
  contactIndex: number;
  /** First index after contact where the ankle has clearly lifted; null when
   * the ankle track inside the stride was too sparse to tell. */
  toeOffIndex: number | null;
  nextContactIndex: number;
};

export type GaitSegmentation = {
  /** Indices (into samples) of each footstrike of the visible-side leg. */
  contactIndices: number[];
  strides: Stride[];
};

/**
 * Segment the visible-side ankle track into strides. Footstrike is one
 * ankle-Y peak per stride (kernel cyclic detector); toe-off is the first
 * moment after contact where the smoothed ankle rises a fixed fraction of
 * that stride's vertical travel above the contact level.
 */
export function segmentStrides(
  samples: readonly RunTimedMetrics[],
  options: GaitSegmentationOptions = GAIT_SEGMENTATION,
): GaitSegmentation {
  const usable: Array<{ index: number; point: CyclePoint }> = [];
  samples.forEach((s, index) => {
    if (s.metrics.anklePos) {
      usable.push({ index, point: { tMs: s.tMs, value: s.metrics.anklePos.y } });
    }
  });

  const peaks = detectCyclePeaks(
    usable.map((u) => u.point),
    options,
  );
  const smoothed = movingAverage(
    usable.map((u) => u.point.value),
    options.smoothWindow,
  );

  const contactIndices: number[] = [];
  for (const p of peaks) {
    const u = usable[p];
    if (u) contactIndices.push(u.index);
  }

  const strides: Stride[] = [];
  for (let k = 0; k + 1 < peaks.length; k++) {
    const startU = peaks[k];
    const endU = peaks[k + 1];
    const start = startU === undefined ? undefined : usable[startU]?.index;
    const end = endU === undefined ? undefined : usable[endU]?.index;
    if (
      startU === undefined ||
      endU === undefined ||
      start === undefined ||
      end === undefined
    ) {
      continue;
    }

    // Vertical travel within this stride, on the smoothed track.
    const contactY = smoothed[startU];
    let minY = Infinity;
    for (let j = startU; j <= endU; j++) {
      const y = smoothed[j];
      if (y !== undefined && y < minY) minY = y;
    }
    let toeOffIndex: number | null = null;
    if (contactY !== undefined && contactY - minY > 1e-9) {
      const threshold = contactY - options.stanceLiftFraction * (contactY - minY);
      for (let j = startU + 1; j < endU; j++) {
        const y = smoothed[j];
        if (y !== undefined && y < threshold) {
          toeOffIndex = usable[j]?.index ?? null;
          break;
        }
      }
    }
    strides.push({ contactIndex: start, toeOffIndex, nextContactIndex: end });
  }

  return { contactIndices, strides };
}

/**
 * The runner's forward direction along x: the foot points the way you run,
 * so the mean sign of (toe x - heel x) decides it. +1 facing increasing x,
 * -1 decreasing, 0 undeterminable.
 */
export function detectRunForwardSign(
  samples: readonly RunTimedMetrics[],
): -1 | 0 | 1 {
  let sum = 0;
  let n = 0;
  for (const s of samples) {
    const { footPos, heelPos } = s.metrics;
    if (footPos && heelPos) {
      sum += footPos.x - heelPos.x;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  if (Math.abs(mean) < 1e-9) return 0;
  return mean > 0 ? 1 : -1;
}

// --- Foot strike (reported, not judged) ------------------------------------------

export type FootStrike = "heel" | "mid" | "fore";

/**
 * PLACEHOLDER: data-quality tuning. The heel-vs-toe height difference at
 * contact must exceed this fraction of foot length to call heel or forefoot;
 * anything closer reads as midfoot.
 */
export const FOOT_STRIKE_TILT_FRACTION = 0.25;

/** Classify one contact from heel and toe heights (image y grows downward). */
export function classifyFootStrike(
  heel: Point2,
  foot: Point2,
): FootStrike | null {
  const footLen = Math.hypot(foot.x - heel.x, foot.y - heel.y);
  if (footLen < 1e-9) return null;
  const tilt = (heel.y - foot.y) / footLen;
  if (tilt > FOOT_STRIKE_TILT_FRACTION) return "heel";
  if (tilt < -FOOT_STRIKE_TILT_FRACTION) return "fore";
  return "mid";
}

// --- Side-view report ------------------------------------------------------------

/**
 * PLACEHOLDER: data-quality cutoff (unsourced engineering default). A
 * knee-flexion-at-contact spread above this flags the recording as too noisy
 * to trust.
 */
export const HIGH_VARIANCE_KNEE_FLEX_STDDEV_DEG = 6;

export type GaitReport = {
  side: Side;
  sideConfidence: number;
  sampleCount: number;
  analyzedMs: number;
  strideCount: number;
  /** Steps per minute counting BOTH feet (2x the visible leg's stride rate). */
  cadenceSpm: number | null;
  /** Key-frame timestamps for marking on the timeline. */
  contactTMs: number[];
  toeOffTMs: number[];
  /** Per-contact horizontal foot-ahead-of-hip distance, % of leg length.
   * Positive = landing ahead of the hip. Null stats when direction unknown. */
  overstridePct: MetricStats | null;
  /** Per-contact knee flexion from straight (180 - interior angle), degrees. */
  kneeFlexAtContactDeg: MetricStats | null;
  /** Per-stride hip vertical travel, % of leg length. */
  verticalOscillationPct: MetricStats | null;
  /** Trunk lean from vertical across the steady-state region, degrees. */
  trunkLeanDeg: MetricStats | null;
  /** Foot strike, reported not judged: contact counts and the majority call. */
  footStrike: {
    heel: number;
    mid: number;
    fore: number;
    label: FootStrike | null;
  };
  /** Data-quality flag: knee-at-contact spread beyond the placeholder cutoff. */
  highVariance: boolean;
  /** Overall result confidence (tracking, rhythm, side-vote, and how often
   * the ankle-low contacts agree with the knee-flexion minima). */
  confidence: ConfidenceReport;
};

export type GaitAnalysis =
  | { ok: true; report: GaitReport }
  | { ok: false; reason: string };

/**
 * The whole side-view pipeline over a recorded pass: pick the facing side
 * from the footage, compute per-frame metrics (aspect-corrected), segment
 * strides from the ankle track, then aggregate. Contact-anchored metrics
 * (overstride, knee flexion, foot strike) are read once per footstrike;
 * trunk lean is aggregated across the steady-state region between the first
 * and last contact; vertical oscillation is per stride.
 */
export function buildGaitReport(
  timedFrames: readonly TimedFrame[],
  aspectRatio: number,
  options: GaitSegmentationOptions = GAIT_SEGMENTATION,
): GaitAnalysis {
  const vote = detectFacingSide(timedFrames.map((t) => t.frame));
  const samples: RunTimedMetrics[] = timedFrames.map((t) => ({
    tMs: t.tMs,
    metrics: computeRunFrameMetrics(t.frame, vote.side, aspectRatio),
  }));

  const ankleFrames = samples.filter((s) => s.metrics.anklePos !== null).length;
  if (ankleFrames < 10) {
    return {
      ok: false,
      reason:
        "We couldn't see your feet for enough of the video to read your stride. Whole body in frame, good light.",
    };
  }

  const { contactIndices, strides } = segmentStrides(samples, options);
  if (strides.length < MIN_STRIDES_FOR_REPORT) {
    return {
      ok: false,
      reason: `We need at least ${MIN_STRIDES_FOR_REPORT} full strides to measure anything honestly. Film a few more seconds of steady running.`,
    };
  }

  const forwardSign = detectRunForwardSign(samples);

  const contactTMs: number[] = [];
  const toeOffTMs: number[] = [];
  const overstride: number[] = [];
  const kneeFlex: number[] = [];
  const legLens: number[] = [];
  const strikes = { heel: 0, mid: 0, fore: 0 };

  for (const i of contactIndices) {
    const s = samples[i];
    if (!s) continue;
    contactTMs.push(s.tMs);
    const m = s.metrics;

    if (m.hipPos && m.anklePos) {
      const legLen = Math.hypot(
        m.anklePos.x - m.hipPos.x,
        m.anklePos.y - m.hipPos.y,
      );
      if (legLen > 1e-9) {
        legLens.push(legLen);
        if (forwardSign !== 0) {
          overstride.push(
            ((forwardSign * (m.anklePos.x - m.hipPos.x)) / legLen) * 100,
          );
        }
      }
    }
    if (m.kneeDeg !== null) kneeFlex.push(180 - m.kneeDeg);
    if (m.heelPos && m.footPos) {
      const strike = classifyFootStrike(m.heelPos, m.footPos);
      if (strike) strikes[strike]++;
    }
  }

  for (const stride of strides) {
    if (stride.toeOffIndex === null) continue;
    const s = samples[stride.toeOffIndex];
    if (s) toeOffTMs.push(s.tMs);
  }

  let cadenceSpm: number | null = null;
  if (contactTMs.length >= 2) {
    const first = contactTMs[0];
    const last = contactTMs[contactTMs.length - 1];
    if (first !== undefined && last !== undefined && last > first) {
      const meanStrideMs = (last - first) / (contactTMs.length - 1);
      // One leg's strides; both feet step, so cadence is twice the rate.
      cadenceSpm = 2 * (60000 / meanStrideMs);
    }
  }

  const meanLegLen =
    legLens.length > 0
      ? legLens.reduce((sum, l) => sum + l, 0) / legLens.length
      : null;

  // Per-stride hip vertical travel, normalized by leg length.
  const vertOsc: number[] = [];
  if (meanLegLen !== null && meanLegLen > 1e-9) {
    for (const stride of strides) {
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = stride.contactIndex; i <= stride.nextContactIndex; i++) {
        const hip = samples[i]?.metrics.hipPos;
        if (!hip) continue;
        if (hip.y < minY) minY = hip.y;
        if (hip.y > maxY) maxY = hip.y;
      }
      if (maxY > minY) vertOsc.push(((maxY - minY) / meanLegLen) * 100);
    }
  }

  // Steady-state trunk lean: every frame between the first and last contact.
  const firstContact = contactIndices[0];
  const lastContact = contactIndices[contactIndices.length - 1];
  const trunk: number[] = [];
  if (firstContact !== undefined && lastContact !== undefined) {
    for (let i = firstContact; i <= lastContact; i++) {
      const lean = samples[i]?.metrics.trunkLeanDeg;
      if (lean !== null && lean !== undefined) trunk.push(lean);
    }
  }

  const strikeTotal = strikes.heel + strikes.mid + strikes.fore;
  let strikeLabel: FootStrike | null = null;
  if (strikeTotal > 0) {
    strikeLabel = (["heel", "mid", "fore"] as const).reduce((best, k) =>
      strikes[k] > strikes[best] ? k : best,
    );
  }

  const kneeStats = computeStats(kneeFlex);
  const lastSample = samples[samples.length - 1];

  // Second, independent contact signal: the knee is most flexed (interior
  // angle smallest) around stance, so minima of the knee angle should line up
  // with the ankle-low contacts. How often they agree is a confidence input.
  const kneeMinTMs = detectCyclePeaks(
    samples
      .filter((s) => s.metrics.kneeDeg !== null)
      .map((s) => ({ tMs: s.tMs, value: -(s.metrics.kneeDeg ?? 0) })),
    options,
  ).map((i) => {
    const kneeSamples = samples.filter((s) => s.metrics.kneeDeg !== null);
    return kneeSamples[i]?.tMs ?? 0;
  });
  const { agreement } = crossValidateEvents(contactTMs, kneeMinTMs, 150);

  const cycleDurationsMs: number[] = [];
  for (let i = 1; i < contactTMs.length; i++) {
    cycleDurationsMs.push((contactTMs[i] ?? 0) - (contactTMs[i - 1] ?? 0));
  }
  const confidence = scoreConfidence({
    trackedFraction: samples.length > 0 ? ankleFrames / samples.length : 0,
    cycleDurationsMs,
    cycleCount: strides.length,
    minCycles: MIN_STRIDES_FOR_REPORT,
    sideConfidence: vote.confidence,
    agreement,
  });

  return {
    ok: true,
    report: {
      side: vote.side,
      sideConfidence: vote.confidence,
      sampleCount: samples.length,
      analyzedMs: lastSample ? lastSample.tMs : 0,
      strideCount: strides.length,
      confidence,
      cadenceSpm,
      contactTMs,
      toeOffTMs,
      overstridePct: computeStats(overstride),
      kneeFlexAtContactDeg: kneeStats,
      verticalOscillationPct: computeStats(vertOsc),
      trunkLeanDeg: computeStats(trunk),
      footStrike: { ...strikes, label: strikeLabel },
      highVariance:
        kneeStats !== null &&
        kneeStats.stdDev > HIGH_VARIANCE_KNEE_FLEX_STDDEV_DEG,
    },
  };
}

// --- Rear view (optional): pelvic drop + crossover --------------------------------

/** One rear-view frame's metrics, hip-width normalized like cycling's frontal
 * path. Ankles are kept even without hips, because segmentation only needs
 * the ankles. */
export type RearFrameMetrics = {
  /** (left hip y - right hip y) / hip width. Positive = LEFT hip lower. */
  hipDrop: number | null;
  midlineX: number | null;
  hipWidth: number | null;
  leftAnkle: Point2 | null;
  rightAnkle: Point2 | null;
};

export type RearTimedMetrics = { tMs: number; metrics: RearFrameMetrics };

export function computeRearFrameMetrics(
  frame: PoseFrame,
  aspectRatio: number,
): RearFrameMetrics {
  const point = (index: number): Point2 | null => {
    const lm = frame[index];
    if (!lm || (lm.visibility ?? 0) < METRIC_VISIBILITY_FLOOR) return null;
    return { x: lm.x * aspectRatio, y: lm.y };
  };
  const leftHip = point(LANDMARK.LEFT_HIP);
  const rightHip = point(LANDMARK.RIGHT_HIP);
  const leftAnkle = point(LANDMARK.LEFT_ANKLE);
  const rightAnkle = point(LANDMARK.RIGHT_ANKLE);

  if (!leftHip || !rightHip) {
    return {
      hipDrop: null,
      midlineX: null,
      hipWidth: null,
      leftAnkle,
      rightAnkle,
    };
  }
  const hipWidth = Math.abs(leftHip.x - rightHip.x);
  if (hipWidth < 1e-9) {
    return {
      hipDrop: null,
      midlineX: null,
      hipWidth: null,
      leftAnkle,
      rightAnkle,
    };
  }
  return {
    hipDrop: (leftHip.y - rightHip.y) / hipWidth,
    midlineX: (leftHip.x + rightHip.x) / 2,
    hipWidth,
    leftAnkle,
    rightAnkle,
  };
}

export type RearGaitReport = {
  sampleCount: number;
  analyzedMs: number;
  strideCountLeft: number;
  strideCountRight: number;
  cadenceSpm: number | null;
  contactTMsLeft: number[];
  contactTMsRight: number[];
  /** Peak drop of the OPPOSITE hip within each leg's stride, % of hip width. */
  pelvicDropLeftStancePct: MetricStats | null;
  pelvicDropRightStancePct: MetricStats | null;
  /** Ankle-to-midline distance at contact, % of hip width. Positive = on its
   * own side; negative = crossed the midline. Reported, not judged. */
  stanceWidthLeftPct: MetricStats | null;
  stanceWidthRightPct: MetricStats | null;
};

export type RearGaitAnalysis =
  | { ok: true; report: RearGaitReport }
  | { ok: false; reason: string };

function ankleTrack(
  samples: readonly RearTimedMetrics[],
  leg: "left" | "right",
): Array<{ index: number; point: CyclePoint }> {
  const usable: Array<{ index: number; point: CyclePoint }> = [];
  samples.forEach((s, index) => {
    const ankle = leg === "left" ? s.metrics.leftAnkle : s.metrics.rightAnkle;
    if (ankle) usable.push({ index, point: { tMs: s.tMs, value: ankle.y } });
  });
  return usable;
}

/**
 * The rear-view pipeline: per-frame hip drop (hip-width normalized), per-leg
 * footstrike segmentation from each ankle's vertical track, then per-stride
 * peak contralateral pelvic drop and per-contact stance width.
 */
export function buildRearGaitReport(
  timedFrames: readonly TimedFrame[],
  aspectRatio: number,
  options: CycleOptions = GAIT_SEGMENTATION,
): RearGaitAnalysis {
  const samples: RearTimedMetrics[] = timedFrames.map((t) => ({
    tMs: t.tMs,
    metrics: computeRearFrameMetrics(t.frame, aspectRatio),
  }));

  const hipFrames = samples.filter((s) => s.metrics.hipDrop !== null).length;
  if (hipFrames < 10) {
    return {
      ok: false,
      reason:
        "We couldn't see both hips for enough of the video. Film from directly behind, whole body in frame.",
    };
  }

  const legs = (["left", "right"] as const).map((leg) => {
    const usable = ankleTrack(samples, leg);
    const peaks = detectCyclePeaks(
      usable.map((u) => u.point),
      options,
    );
    const contactIndices = peaks
      .map((p) => usable[p]?.index)
      .filter((i): i is number => i !== undefined);
    return { leg, contactIndices };
  });
  const left = legs[0];
  const right = legs[1];
  if (!left || !right) {
    return { ok: false, reason: "We couldn't find a stride in this video." };
  }

  const strideCountLeft = Math.max(0, left.contactIndices.length - 1);
  const strideCountRight = Math.max(0, right.contactIndices.length - 1);
  if (strideCountLeft < MIN_STRIDES_FOR_REPORT && strideCountRight < MIN_STRIDES_FOR_REPORT) {
    return {
      ok: false,
      reason: `We need at least ${MIN_STRIDES_FOR_REPORT} full strides to measure anything honestly. Film a few more seconds of steady running.`,
    };
  }

  const contactTimes = (indices: readonly number[]): number[] => {
    const times: number[] = [];
    for (const i of indices) {
      const s = samples[i];
      if (s) times.push(s.tMs);
    }
    return times;
  };
  const contactTMsLeft = contactTimes(left.contactIndices);
  const contactTMsRight = contactTimes(right.contactIndices);

  const strideCadence = (times: readonly number[]): number | null => {
    if (times.length < 2) return null;
    const first = times[0];
    const last = times[times.length - 1];
    if (first === undefined || last === undefined || last <= first) return null;
    return 2 * (60000 / ((last - first) / (times.length - 1)));
  };
  const cadences = [
    strideCadence(contactTMsLeft),
    strideCadence(contactTMsRight),
  ].filter((c): c is number => c !== null);
  const cadenceSpm =
    cadences.length > 0
      ? cadences.reduce((sum, c) => sum + c, 0) / cadences.length
      : null;

  // Peak contralateral drop within each stance leg's stride window. During
  // LEFT stance the RIGHT hip drops (right lower = hipDrop negative), and
  // vice versa; both report as positive percent.
  const stanceDrops = (
    contactIndices: readonly number[],
    stanceLeg: "left" | "right",
  ): number[] => {
    const drops: number[] = [];
    for (let k = 0; k + 1 < contactIndices.length; k++) {
      const start = contactIndices[k];
      const end = contactIndices[k + 1];
      if (start === undefined || end === undefined) continue;
      let peak: number | null = null;
      for (let i = start; i <= end; i++) {
        const drop = samples[i]?.metrics.hipDrop;
        if (drop === null || drop === undefined) continue;
        const contralateral = stanceLeg === "left" ? -drop : drop;
        if (peak === null || contralateral > peak) peak = contralateral;
      }
      if (peak !== null) drops.push(peak * 100);
    }
    return drops;
  };

  // Ankle-to-midline distance at each contact, signed so the leg's usual
  // side is positive (crossing the midline goes negative).
  const stanceWidths = (
    contactIndices: readonly number[],
    leg: "left" | "right",
  ): number[] => {
    // Which x direction is "own side" for this leg, from its mean position.
    let sum = 0;
    let n = 0;
    for (const s of samples) {
      const ankle = leg === "left" ? s.metrics.leftAnkle : s.metrics.rightAnkle;
      const midline = s.metrics.midlineX;
      if (ankle && midline !== null) {
        sum += ankle.x - midline;
        n++;
      }
    }
    if (n === 0) return [];
    const dir = sum / n >= 0 ? 1 : -1;

    const widths: number[] = [];
    for (const i of contactIndices) {
      const m = samples[i]?.metrics;
      const ankle = leg === "left" ? m?.leftAnkle : m?.rightAnkle;
      if (!ankle || !m || m.midlineX === null || m.hipWidth === null) continue;
      widths.push(((dir * (ankle.x - m.midlineX)) / m.hipWidth) * 100);
    }
    return widths;
  };

  const lastSample = samples[samples.length - 1];

  return {
    ok: true,
    report: {
      sampleCount: samples.length,
      analyzedMs: lastSample ? lastSample.tMs : 0,
      strideCountLeft,
      strideCountRight,
      cadenceSpm,
      contactTMsLeft,
      contactTMsRight,
      pelvicDropLeftStancePct: computeStats(
        stanceDrops(left.contactIndices, "left"),
      ),
      pelvicDropRightStancePct: computeStats(
        stanceDrops(right.contactIndices, "right"),
      ),
      stanceWidthLeftPct: computeStats(stanceWidths(left.contactIndices, "left")),
      stanceWidthRightPct: computeStats(
        stanceWidths(right.contactIndices, "right"),
      ),
    },
  };
}
