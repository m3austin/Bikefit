/*
 * GolfFit swing biomechanics (docs/sportfit/02-Sport-Modules.md section 3).
 * Pure math over pose frames; no React, DOM, or MediaPipe runtime. A golf
 * swing is a single event sequence (address, takeaway, top, impact,
 * follow-through), detected from wrist speed via the kernel's event
 * utilities rather than the cyclic peak detector.
 *
 * 2D honesty: from one camera these are PROXIES. Shoulder and hip "turn" are
 * measured as apparent-width shrink on a face-on view; spine angle is the
 * hip-to-shoulder segment; none of it is a launch monitor. The copy layer
 * says so plainly.
 *
 * The constants here are DATA-QUALITY tunings, marked PLACEHOLDER because
 * they are unsourced engineering defaults; fit targets live in
 * lib/sports/golf/rules.ts.
 */

import {
  argmaxSpeed,
  argminSpeedBetween,
  computeSpeedSeries,
  firstSustainedAbove,
  firstSustainedBelow,
  type MotionSample,
} from "@/lib/kernel/events";
import { interiorAngleDeg, type Point2 } from "@/lib/kernel/geometry";
import { METRIC_VISIBILITY_FLOOR, type TimedFrame } from "@/lib/kernel/tracking";
import { LANDMARK, type PoseFrame } from "@/lib/pose-model";

// --- Per-frame extraction -----------------------------------------------------

/** One frame's golf-relevant points and angles (view-agnostic; the report
 * builder and rules decide which matter for DTL vs face-on). */
export type GolfFrameMetrics = {
  /** Midpoint of the visible wrists: the swing's motion tracer. */
  wristPos: Point2 | null;
  nosePos: Point2 | null;
  shoulderMid: Point2 | null;
  hipMid: Point2 | null;
  /** Apparent spans (|left.x - right.x|), the 2D turn proxies. */
  shoulderSpan: number | null;
  hipSpan: number | null;
  /** Shoulder-elbow-wrist per arm; the straighter one at the top is lead. */
  leftArmDeg: number | null;
  rightArmDeg: number | null;
  /** Hip-to-shoulder segment lean from VERTICAL: 0 upright, bigger = more tilt. */
  spineDeg: number | null;
};

export type GolfTimedMetrics = { tMs: number; metrics: GolfFrameMetrics };

function midpoint(a: Point2 | null, b: Point2 | null): Point2 | null {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return a ?? b;
}

export function computeGolfFrameMetrics(
  frame: PoseFrame,
  aspectRatio: number,
): GolfFrameMetrics {
  const point = (index: number): Point2 | null => {
    const lm = frame[index];
    if (!lm || (lm.visibility ?? 0) < METRIC_VISIBILITY_FLOOR) return null;
    return { x: lm.x * aspectRatio, y: lm.y };
  };

  const leftShoulder = point(LANDMARK.LEFT_SHOULDER);
  const rightShoulder = point(LANDMARK.RIGHT_SHOULDER);
  const leftHip = point(LANDMARK.LEFT_HIP);
  const rightHip = point(LANDMARK.RIGHT_HIP);
  const leftElbow = point(LANDMARK.LEFT_ELBOW);
  const rightElbow = point(LANDMARK.RIGHT_ELBOW);
  const leftWrist = point(LANDMARK.LEFT_WRIST);
  const rightWrist = point(LANDMARK.RIGHT_WRIST);

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);

  let spineDeg: number | null = null;
  if (shoulderMid && hipMid) {
    const dx = Math.abs(shoulderMid.x - hipMid.x);
    const dy = Math.abs(hipMid.y - shoulderMid.y);
    if (dx > 1e-9 || dy > 1e-9) {
      // Lean from vertical: atan(horizontal / vertical).
      spineDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
    }
  }

  return {
    wristPos: midpoint(leftWrist, rightWrist),
    nosePos: point(LANDMARK.NOSE),
    shoulderMid,
    hipMid,
    shoulderSpan:
      leftShoulder && rightShoulder
        ? Math.abs(leftShoulder.x - rightShoulder.x)
        : null,
    hipSpan: leftHip && rightHip ? Math.abs(leftHip.x - rightHip.x) : null,
    leftArmDeg:
      leftShoulder && leftElbow && leftWrist
        ? interiorAngleDeg(leftShoulder, leftElbow, leftWrist)
        : null,
    rightArmDeg:
      rightShoulder && rightElbow && rightWrist
        ? interiorAngleDeg(rightShoulder, rightElbow, rightWrist)
        : null,
    spineDeg,
  };
}

// --- Swing phase detection ------------------------------------------------------

/**
 * PLACEHOLDER: data-quality tunings (unsourced engineering defaults) for
 * phase detection. Thresholds are fractions of the swing's own peak wrist
 * speed, so they are scale- and resolution-invariant.
 */
export const SWING_SEGMENTATION = {
  smoothWindow: 5,
  /** Sustained motion above this fraction of peak speed starts the takeaway. */
  startFraction: 0.15,
  /** Motion must stay above/below thresholds this long to count. */
  sustainMs: 100,
  minSamples: 20,
  /** Address-to-impact must take at least this long to be a real swing. */
  minSwingMs: 400,
  /** The top must be a real pause: its speed at most this fraction of peak. */
  topFraction: 0.5,
  /** A real backswing and downswing each take time; smoothing-edge minima
   * hugging the takeaway must not pass as a top. */
  minBackswingMs: 300,
  minDownswingMs: 100,
};

export type SwingPhases = {
  addressIdx: number;
  takeawayIdx: number;
  topIdx: number;
  impactIdx: number;
  followIdx: number;
};

export type PhaseDetection =
  | { ok: true; phases: SwingPhases }
  | { ok: false; reason: string };

/**
 * Detect the five swing phases from the wrist track. Impact is the wrist
 * speed peak; takeaway is the first sustained motion; the top is the speed
 * minimum between them (the pause and reversal); address is the stillest
 * moment before the takeaway; follow-through ends when motion settles.
 */
export function detectSwingPhases(
  samples: readonly GolfTimedMetrics[],
  options = SWING_SEGMENTATION,
): PhaseDetection {
  const motion: MotionSample[] = samples.map((s) => ({
    tMs: s.tMs,
    pos: s.metrics.wristPos,
  }));
  const series = computeSpeedSeries(motion, options.smoothWindow);
  if (series.length < options.minSamples) {
    return {
      ok: false,
      reason:
        "We couldn't see your hands for enough of the video to read a swing.",
    };
  }

  const peakSeriesIdx = argmaxSpeed(series);
  const peak = series[peakSeriesIdx];
  if (peakSeriesIdx < 0 || !peak || peak.speed <= 0) {
    return { ok: false, reason: "We couldn't find a swing in this video." };
  }
  const startThreshold = peak.speed * options.startFraction;

  const takeawaySeriesIdx = firstSustainedAbove(
    series,
    0,
    startThreshold,
    options.sustainMs,
  );
  if (takeawaySeriesIdx < 0 || takeawaySeriesIdx >= peakSeriesIdx) {
    return {
      ok: false,
      reason:
        "We couldn't separate the takeaway from the strike. Start the clip with a second of stillness at address.",
    };
  }

  const topSeriesIdx = argminSpeedBetween(
    series,
    takeawaySeriesIdx + 1,
    peakSeriesIdx - 1,
  );
  const topSpeed = series[topSeriesIdx]?.speed;
  const takeawayT = series[takeawaySeriesIdx]?.tMs ?? 0;
  const topT = series[topSeriesIdx]?.tMs ?? 0;
  const impactT2 = peak.tMs;
  if (
    topSeriesIdx <= takeawaySeriesIdx ||
    topSpeed === undefined ||
    topSpeed > peak.speed * options.topFraction ||
    topT - takeawayT < options.minBackswingMs ||
    impactT2 - topT < options.minDownswingMs
  ) {
    return {
      ok: false,
      reason:
        "The backswing and downswing blur together in this clip. A steadier camera or better light usually fixes it.",
    };
  }

  // Address: the stillest moment before the takeaway begins.
  const addressSeriesIdx = argminSpeedBetween(series, 0, takeawaySeriesIdx - 1);

  let followSeriesIdx = firstSustainedBelow(
    series,
    peakSeriesIdx + 1,
    startThreshold,
    options.sustainMs,
  );
  if (followSeriesIdx < 0) followSeriesIdx = series.length - 1;

  const idxOf = (seriesIdx: number): number =>
    series[Math.max(0, seriesIdx)]?.index ?? 0;

  const phases: SwingPhases = {
    addressIdx: idxOf(addressSeriesIdx < 0 ? 0 : addressSeriesIdx),
    takeawayIdx: idxOf(takeawaySeriesIdx),
    topIdx: idxOf(topSeriesIdx),
    impactIdx: idxOf(peakSeriesIdx),
    followIdx: idxOf(followSeriesIdx),
  };

  const addressT = samples[phases.addressIdx]?.tMs ?? 0;
  const impactT = samples[phases.impactIdx]?.tMs ?? 0;
  if (impactT - addressT < options.minSwingMs) {
    return {
      ok: false,
      reason:
        "That looked too quick to be a full swing. Film a complete swing from address to finish.",
    };
  }

  return { ok: true, phases };
}

// --- Report --------------------------------------------------------------------

export type SwingView = "dtl" | "face";

export type SwingPhaseTimes = {
  addressTMs: number;
  takeawayTMs: number;
  topTMs: number;
  impactTMs: number;
  followTMs: number;
};

export type SwingReport = {
  view: SwingView;
  sampleCount: number;
  analyzedMs: number;
  phases: SwingPhaseTimes;
  /** Backswing time over downswing time; the classic smooth swing sits near 3. */
  tempoRatio: number | null;
  /** DTL-meaningful. */
  spineAtAddressDeg: number | null;
  spineChangeDeg: number | null;
  /** Both views: max nose drift from address, percent of torso length. */
  headDriftPct: number | null;
  /** Face-on-meaningful turn proxies (apparent-width shrink, percent). */
  shoulderTurnPct: number | null;
  hipTurnPct: number | null;
  xFactorPct: number | null;
  hipSlidePct: number | null;
  leadArmAtTopDeg: number | null;
};

export type SwingAnalysis =
  | { ok: true; report: SwingReport }
  | { ok: false; reason: string };

/**
 * The whole GolfFit pipeline over a recorded swing: per-frame metrics
 * (aspect-corrected), phase detection from the wrist track, then metrics
 * anchored to the phases. Every metric is computed when its landmarks were
 * visible, whatever the declared view; the rules decide which to judge.
 */
export function buildSwingReport(
  timedFrames: readonly TimedFrame[],
  aspectRatio: number,
  view: SwingView,
): SwingAnalysis {
  const samples: GolfTimedMetrics[] = timedFrames.map((t) => ({
    tMs: t.tMs,
    metrics: computeGolfFrameMetrics(t.frame, aspectRatio),
  }));

  const detection = detectSwingPhases(samples);
  if (!detection.ok) return detection;
  const { phases } = detection;

  const at = (i: number) => samples[i]?.metrics;
  const tOf = (i: number) => samples[i]?.tMs ?? 0;
  const address = at(phases.addressIdx);
  const top = at(phases.topIdx);

  const phaseTimes: SwingPhaseTimes = {
    addressTMs: tOf(phases.addressIdx),
    takeawayTMs: tOf(phases.takeawayIdx),
    topTMs: tOf(phases.topIdx),
    impactTMs: tOf(phases.impactIdx),
    followTMs: tOf(phases.followIdx),
  };

  const backswingMs = phaseTimes.topTMs - phaseTimes.takeawayTMs;
  const downswingMs = phaseTimes.impactTMs - phaseTimes.topTMs;
  const tempoRatio =
    backswingMs > 0 && downswingMs > 0 ? backswingMs / downswingMs : null;

  // Normalizers from address.
  const torsoLen =
    address?.hipMid && address.shoulderMid
      ? Math.hypot(
          address.shoulderMid.x - address.hipMid.x,
          address.shoulderMid.y - address.hipMid.y,
        )
      : null;

  // Max head drift and spine change across the swing proper.
  let headDriftPct: number | null = null;
  let spineChangeDeg: number | null = null;
  let hipSlidePct: number | null = null;
  const spineAtAddress = address?.spineDeg ?? null;
  for (let i = phases.takeawayIdx; i <= phases.impactIdx; i++) {
    const m = at(i);
    if (!m) continue;
    if (m.nosePos && address?.nosePos && torsoLen && torsoLen > 1e-9) {
      const drift =
        (Math.hypot(
          m.nosePos.x - address.nosePos.x,
          m.nosePos.y - address.nosePos.y,
        ) /
          torsoLen) *
        100;
      headDriftPct = Math.max(headDriftPct ?? 0, drift);
    }
    if (m.spineDeg !== null && spineAtAddress !== null) {
      const change = Math.abs(m.spineDeg - spineAtAddress);
      spineChangeDeg = Math.max(spineChangeDeg ?? 0, change);
    }
    if (
      m.hipMid &&
      address?.hipMid &&
      address.hipSpan &&
      address.hipSpan > 1e-9
    ) {
      const slide =
        (Math.abs(m.hipMid.x - address.hipMid.x) / address.hipSpan) * 100;
      hipSlidePct = Math.max(hipSlidePct ?? 0, slide);
    }
  }

  // Turn proxies at the top (apparent-width shrink vs address).
  const turnPct = (
    atTop: number | null | undefined,
    atAddress: number | null | undefined,
  ): number | null => {
    if (
      atTop === null ||
      atTop === undefined ||
      atAddress === null ||
      atAddress === undefined ||
      atAddress <= 1e-9
    ) {
      return null;
    }
    return (1 - atTop / atAddress) * 100;
  };
  const shoulderTurnPct = turnPct(top?.shoulderSpan, address?.shoulderSpan);
  const hipTurnPct = turnPct(top?.hipSpan, address?.hipSpan);
  const xFactorPct =
    shoulderTurnPct !== null && hipTurnPct !== null
      ? shoulderTurnPct - hipTurnPct
      : null;

  // The straighter arm at the top is the lead arm in a real swing.
  const leadArmAtTopDeg =
    top?.leftArmDeg !== null || top?.rightArmDeg !== null
      ? Math.max(top?.leftArmDeg ?? -Infinity, top?.rightArmDeg ?? -Infinity)
      : null;

  const lastSample = samples[samples.length - 1];

  return {
    ok: true,
    report: {
      view,
      sampleCount: samples.length,
      analyzedMs: lastSample ? lastSample.tMs : 0,
      phases: phaseTimes,
      tempoRatio,
      spineAtAddressDeg: spineAtAddress,
      spineChangeDeg,
      headDriftPct,
      shoulderTurnPct,
      hipTurnPct,
      xFactorPct,
      hipSlidePct,
      leadArmAtTopDeg:
        leadArmAtTopDeg === -Infinity ? null : leadArmAtTopDeg,
    },
  };
}
