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
  argmaxIndexBetween,
  argminIndexBetween,
  firstSustainedAboveIdx,
  firstSustainedBelowIdx,
  lastStillEndBefore,
  speedsFromTrack,
} from "@/lib/kernel/events";
import { scoreConfidence, type ConfidenceReport } from "@/lib/kernel/confidence";
import {
  interiorAngleDeg,
  medianFilter,
  movingAverage,
  type Point2,
} from "@/lib/kernel/geometry";
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
 * phase detection. Speed thresholds are fractions of the swing's own peak
 * wrist speed and distances are fractions of torso length, so everything is
 * scale- and resolution-invariant.
 */
export const SWING_SEGMENTATION = {
  /** Median window (position de-glitch) and mean window (speed smoothing). */
  medianWindow: 5,
  smoothWindow: 5,
  minSamples: 20,
  /** Tracking gaps longer than this contribute no speed reading. */
  maxGapMs: 250,
  /** Impact is the hands-lowest moment within this window of the speed peak. */
  impactRefineMs: 150,
  // ponytail: a fixed backswing window; a practice swing topping out within
  // 2 s of impact could still steal the top. Template-match the full
  // rise-fall shape if that shows up in real footage.
  maxBackswingMs: 2000,
  /** A real backswing and downswing each take time. */
  minBackswingMs: 300,
  minDownswingMs: 100,
  /** Hands must rise at least this fraction of torso length from impact to
   * the top for the clip to read as a full swing. */
  minTopRiseFrac: 0.25,
  /** Address stillness: speed under this fraction of peak, held stillMs. */
  stillFraction: 0.05,
  stillMs: 250,
  /** Takeaway: wrists displaced from address by this fraction of torso. */
  takeawayFrac: 0.08,
  /** Motion must stay above/below thresholds this long to count. */
  sustainMs: 100,
  /** Follow-through settles when speed stays under this fraction of peak;
   * also the speed-based takeaway fallback when torso length is unreadable. */
  settleFraction: 0.15,
  /** Address-to-impact must take at least this long to be a real swing. */
  minSwingMs: 400,
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

const NO_HANDS =
  "We couldn't see your hands for enough of the video to read a swing.";
const NO_SWING = "We couldn't find a swing in this video.";
const NO_TAKEAWAY =
  "We couldn't separate the takeaway from the strike. Start the clip with a second of stillness at address.";
const BLURRED =
  "The backswing and downswing blur together in this clip. A steadier camera or better light usually fixes it.";
const TOO_QUICK =
  "That looked too quick to be a full swing. Film a complete swing from address to finish.";

/**
 * Detect the five swing phases. The anchors are the wrist TRAJECTORY, with
 * speed only where it is reliable, because on real footage a single-frame
 * tracker glitch out-spikes the swing and waggles or practice swings pass a
 * pure speed heuristic:
 *
 * 1. Impact: the hands-lowest moment near the (de-glitched) speed peak.
 * 2. Top: the hands-highest moment in the backswing window before impact.
 * 3. Address: the end of the LAST sustained-still window before the top, so
 *    a re-address after a practice swing beats the walk-in stillness.
 * 4. Takeaway: the first sustained wrist DISPLACEMENT from the address
 *    position (jitter oscillates; a takeaway leaves and stays gone).
 * 5. Follow-through: when motion settles after impact.
 */
export function detectSwingPhases(
  samples: readonly GolfTimedMetrics[],
  options = SWING_SEGMENTATION,
): PhaseDetection {
  const fail = (reason: string): PhaseDetection => ({ ok: false, reason });

  // The wrist track: frames where the hands were visible, positions
  // median-filtered so one teleported frame cannot anchor anything.
  const track: Array<{ tMs: number; index: number }> = [];
  const rawX: number[] = [];
  const rawY: number[] = [];
  samples.forEach((s, index) => {
    if (!s.metrics.wristPos) return;
    track.push({ tMs: s.tMs, index });
    rawX.push(s.metrics.wristPos.x);
    rawY.push(s.metrics.wristPos.y);
  });
  if (track.length < options.minSamples) return fail(NO_HANDS);

  const xs = medianFilter(rawX, options.medianWindow);
  const ys = medianFilter(rawY, options.medianWindow);
  const times = track.map((p) => p.tMs);
  const speeds = movingAverage(
    speedsFromTrack(times, xs, ys, options.maxGapMs),
    options.smoothWindow,
  );

  const firstAtOrAfter = (t: number) => times.findIndex((v) => v >= t);
  const lastAtOrBefore = (t: number) => {
    for (let i = times.length - 1; i >= 0; i--) {
      const v = times[i];
      if (v !== undefined && v <= t) return i;
    }
    return -1;
  };
  const tOf = (i: number) => times[i] ?? 0;

  const peakI = argmaxIndexBetween(speeds, 0, speeds.length - 1);
  const peakSpeed = speeds[peakI] ?? 0;
  if (peakI < 0 || peakSpeed <= 0) return fail(NO_SWING);

  // 1. Impact: hands lowest (max image y) near the speed peak; the club
  // passes the ball with the hands at the bottom of their arc.
  const impactI = argmaxIndexBetween(
    ys,
    Math.max(0, firstAtOrAfter(tOf(peakI) - options.impactRefineMs)),
    lastAtOrBefore(tOf(peakI) + options.impactRefineMs),
  );
  if (impactI < 0) return fail(NO_SWING);

  // 2. Top: hands highest (min image y) within the backswing window.
  const topFrom = firstAtOrAfter(tOf(impactI) - options.maxBackswingMs);
  const topI = argminIndexBetween(
    ys,
    Math.max(0, topFrom),
    lastAtOrBefore(tOf(impactI) - options.minDownswingMs),
  );
  if (topI < 0) return fail(BLURRED);

  // Torso length normalizes the position thresholds; a swing whose hands
  // never rise a real fraction of it is not a full swing.
  const torsoAt = (i: number): number | null => {
    const m = samples[track[i]?.index ?? -1]?.metrics;
    if (!m?.shoulderMid || !m.hipMid) return null;
    return Math.hypot(
      m.shoulderMid.x - m.hipMid.x,
      m.shoulderMid.y - m.hipMid.y,
    );
  };
  const torso = torsoAt(impactI) ?? torsoAt(topI);
  if (
    torso !== null &&
    (ys[impactI] ?? 0) - (ys[topI] ?? 0) < options.minTopRiseFrac * torso
  ) {
    return fail(BLURRED);
  }

  // 3. Address: the end of the last sustained stillness before the backswing
  // could have started; falls back to the least-motion moment.
  const addressBound = lastAtOrBefore(tOf(topI) - options.minBackswingMs);
  if (addressBound < 0) return fail(NO_TAKEAWAY);
  let addressI = lastStillEndBefore(
    speeds,
    times,
    addressBound,
    peakSpeed * options.stillFraction,
    options.stillMs,
  );
  if (addressI < 0) addressI = argminIndexBetween(speeds, 0, addressBound);
  if (addressI < 0) return fail(NO_TAKEAWAY);

  // 4. Takeaway: first sustained displacement of the wrists from where they
  // sat at address; speed-threshold fallback when torso is unreadable.
  const takeawayI =
    torso !== null
      ? firstSustainedAboveIdx(
          xs.map((x, i) =>
            Math.hypot(x - (xs[addressI] ?? 0), (ys[i] ?? 0) - (ys[addressI] ?? 0)),
          ),
          times,
          addressI + 1,
          options.takeawayFrac * torso,
          options.sustainMs,
        )
      : firstSustainedAboveIdx(
          speeds,
          times,
          addressI + 1,
          peakSpeed * options.settleFraction,
          options.sustainMs,
        );
  if (takeawayI < 0 || takeawayI > topI) return fail(NO_TAKEAWAY);
  if (tOf(topI) - tOf(takeawayI) < options.minBackswingMs) return fail(BLURRED);

  // 5. Follow-through: motion settling after impact, else the last frame.
  let followI = firstSustainedBelowIdx(
    speeds,
    times,
    impactI + 1,
    peakSpeed * options.settleFraction,
    options.sustainMs,
  );
  if (followI < 0) followI = speeds.length - 1;

  if (tOf(impactI) - tOf(addressI) < options.minSwingMs) return fail(TOO_QUICK);

  const sampleIdx = (i: number) => track[i]?.index ?? 0;
  return {
    ok: true,
    phases: {
      addressIdx: sampleIdx(addressI),
      takeawayIdx: sampleIdx(takeawayI),
      topIdx: sampleIdx(topI),
      impactIdx: sampleIdx(impactI),
      followIdx: sampleIdx(Math.max(followI, impactI)),
    },
  };
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
  /** Overall result confidence, driven by how much of the swing the hands
   * were tracked (a single-event capture, so no cyclic rhythm term). */
  confidence: ConfidenceReport;
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

  // Single-event capture: confidence is driven by how much of the clip the
  // hands were tracked (no cyclic rhythm, no left/right side-vote here).
  const wristVisible = samples.filter((s) => s.metrics.wristPos !== null).length;
  const confidence = scoreConfidence({
    trackedFraction: samples.length > 0 ? wristVisible / samples.length : 0,
    cycleDurationsMs: [],
    cycleCount: 1,
    minCycles: 1,
  });

  return {
    ok: true,
    report: {
      view,
      sampleCount: samples.length,
      analyzedMs: lastSample ? lastSample.tMs : 0,
      phases: phaseTimes,
      confidence,
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
