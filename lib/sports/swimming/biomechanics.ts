/*
 * SwimFit front-crawl biomechanics (docs/sportfit/02-Sport-Modules.md
 * section 4). Pure math over pose frames; no React, DOM, or MediaPipe
 * runtime. The stroke is cyclic like pedaling, so cycles come from the
 * kernel's cyclic peak detector on the near-arm wrist track.
 *
 * ============================ BETA / HONESTY ============================
 * Swimming is the HARDEST capture in the app. Above-water, side-on,
 * pool-deck footage of the near arm is the only tractable case; splash,
 * refraction, and a land-trained pose model make everything here noisier
 * than the other sports. Every metric is a 2D PROXY from one side, several
 * are weak (body roll especially), and the whole module ships behind a beta
 * label until a real clip proves the confidence clears a usable bar. The
 * report leads with a confidence read and says plainly when the water beat
 * the camera. Constants are PLACEHOLDER data-quality tunings; targets live
 * in lib/sports/swimming/rules.ts.
 * =======================================================================
 */

import { scoreConfidence, type ConfidenceReport } from "@/lib/kernel/confidence";
import {
  detectCyclePeaks,
  type CycleOptions,
  type CyclePoint,
} from "@/lib/kernel/cycles";
import {
  computeStats,
  type MetricStats,
  type Point2,
} from "@/lib/kernel/geometry";
import {
  METRIC_VISIBILITY_FLOOR,
  detectFacingSide,
  type TimedFrame,
} from "@/lib/kernel/tracking";
import { SIDE_LANDMARKS, type PoseFrame, type Side } from "@/lib/pose-model";

// --- Per-frame extraction (near-side, side-on) ----------------------------------

export type SwimFrameMetrics = {
  shoulder: Point2 | null;
  elbow: Point2 | null;
  wrist: Point2 | null;
  hip: Point2 | null;
  nose: Point2 | null;
  /** Mean landmark visibility of the near side: the confidence signal. */
  visibility: number;
};

export type SwimTimedMetrics = { tMs: number; metrics: SwimFrameMetrics };

export function computeSwimFrameMetrics(
  frame: PoseFrame,
  side: Side,
  aspectRatio: number,
): SwimFrameMetrics {
  const point = (index: number): Point2 | null => {
    const lm = frame[index];
    if (!lm || (lm.visibility ?? 0) < METRIC_VISIBILITY_FLOOR) return null;
    return { x: lm.x * aspectRatio, y: lm.y };
  };
  const ids = SIDE_LANDMARKS[side];
  const nose = frame[0];
  const shoulder = point(ids.shoulder);
  const elbow = point(ids.elbow);
  const wrist = point(ids.wrist);
  const hip = point(ids.hip);

  // Confidence: mean visibility of the joints this module reads.
  const vis = [ids.shoulder, ids.elbow, ids.wrist, ids.hip].map(
    (i) => frame[i]?.visibility ?? 0,
  );
  const visibility = vis.reduce((a, b) => a + b, 0) / vis.length;

  return {
    shoulder,
    elbow,
    wrist,
    hip,
    nose:
      nose && (nose.visibility ?? 0) >= METRIC_VISIBILITY_FLOOR
        ? { x: nose.x * aspectRatio, y: nose.y }
        : null,
    visibility,
  };
}

// --- Stroke-cycle segmentation ---------------------------------------------------

/**
 * PLACEHOLDER: data-quality tunings (unsourced engineering defaults).
 * minSeparationMs 700 allows a near-arm cycle up to ~85 per minute (~170
 * total strokes/min), above any sane front-crawl rate.
 */
export const STROKE_SEGMENTATION: CycleOptions = {
  minSeparationMs: 700,
  minRelativeHeight: 0.5,
  smoothWindow: 5,
  // Splash and refraction drift the wrist amplitude; judge catches by local
  // prominence, and drop off-rhythm phantoms from bubbles.
  minProminence: 0.15,
  intervalTolerance: 0.4,
};

/** Below this many full near-arm cycles there is no report. PLACEHOLDER. */
export const MIN_STROKES_FOR_REPORT = 3;

/**
 * PLACEHOLDER: the confidence floor below which the report leads with "the
 * water beat the camera" rather than numbers. Mean near-side visibility.
 */
export const SWIM_CONFIDENCE_FLOOR = 0.55;

export type StrokeCycle = {
  /** Wrist lowest visible point: the catch / early pull. */
  catchIndex: number;
  /** Wrist highest point between catches: the recovery apex. */
  recoveryIndex: number | null;
  nextCatchIndex: number;
};

export type StrokeSegmentation = {
  catchIndices: number[];
  cycles: StrokeCycle[];
};

/** Segment the near-arm wrist track into stroke cycles (catch to catch, with
 * the recovery apex between). */
export function segmentStrokes(
  samples: readonly SwimTimedMetrics[],
  options: CycleOptions = STROKE_SEGMENTATION,
): StrokeSegmentation {
  const usable: Array<{ index: number; point: CyclePoint }> = [];
  samples.forEach((s, index) => {
    if (s.metrics.wrist) {
      usable.push({ index, point: { tMs: s.tMs, value: s.metrics.wrist.y } });
    }
  });

  const peaks = detectCyclePeaks(
    usable.map((u) => u.point),
    options,
  );
  const catchIndices = peaks
    .map((p) => usable[p]?.index)
    .filter((i): i is number => i !== undefined);

  const cycles: StrokeCycle[] = [];
  for (let k = 0; k + 1 < catchIndices.length; k++) {
    const start = catchIndices[k];
    const end = catchIndices[k + 1];
    if (start === undefined || end === undefined) continue;
    let recoveryIndex: number | null = null;
    let bestY = Infinity;
    for (let i = start + 1; i < end; i++) {
      const w = samples[i]?.metrics.wrist;
      if (w && w.y < bestY) {
        bestY = w.y;
        recoveryIndex = i;
      }
    }
    cycles.push({ catchIndex: start, recoveryIndex, nextCatchIndex: end });
  }

  return { catchIndices, cycles };
}

// --- Metric primitives -----------------------------------------------------------

const torsoLen = (m: SwimFrameMetrics): number | null =>
  m.shoulder && m.hip
    ? Math.hypot(m.shoulder.x - m.hip.x, m.shoulder.y - m.hip.y)
    : null;

/** Elbow height above the shoulder at recovery apex, % of torso (positive =
 * elbow above shoulder, the high-elbow recovery). */
export function elbowRecoveryPct(
  recovery: SwimFrameMetrics | null,
): number | null {
  if (!recovery?.elbow || !recovery.shoulder) return null;
  const len = torsoLen(recovery);
  if (len === null || len < 1e-9) return null;
  // Image y grows downward: elbow above shoulder has the SMALLER y.
  return ((recovery.shoulder.y - recovery.elbow.y) / len) * 100;
}

/** Head lift: nose height above the shoulder-hip line at the catch, % of
 * torso. Higher = looking forward / head up (which sinks the hips). */
export function headLiftPct(catchFrame: SwimFrameMetrics): number | null {
  if (!catchFrame.nose || !catchFrame.shoulder || !catchFrame.hip) return null;
  const len = torsoLen(catchFrame);
  if (len === null || len < 1e-9) return null;
  // Project the nose onto the vertical gap above the shoulder along the body
  // line; a simple, honest proxy is nose-above-shoulder in y.
  return ((catchFrame.shoulder.y - catchFrame.nose.y) / len) * 100;
}

// --- Report ----------------------------------------------------------------------

export type SwimReport = {
  side: Side;
  sideConfidence: number;
  /** Mean near-side landmark visibility: the headline confidence read. */
  meanVisibility: number;
  /** True when visibility fell below the floor: the water beat the camera. */
  lowConfidence: boolean;
  sampleCount: number;
  analyzedMs: number;
  strokeCount: number;
  catchTMs: number[];
  recoveryTMs: number[];
  /** Total strokes per minute (both arms), from the near-arm cycle rate. */
  strokeRateSpm: number | null;
  /** Cycle-duration coefficient of variation (rhythm consistency), percent. */
  rhythmCvPct: number | null;
  /** Body roll PROXY: near-shoulder vertical travel per cycle, % of torso. */
  bodyRollPct: MetricStats | null;
  /** Head lift at the catch, % of torso (higher = looking forward). */
  headLiftPct: MetricStats | null;
  /** Elbow height above shoulder at recovery, % of torso. */
  elbowRecoveryPct: MetricStats | null;
  /** Overall result confidence (near-side tracking, stroke-rhythm steadiness,
   * side-vote). No underwater second signal, so no cross-validation term. */
  confidence: ConfidenceReport;
};

export type SwimAnalysis =
  | { ok: true; report: SwimReport }
  | { ok: false; reason: string };

/**
 * The whole SwimFit pipeline over a recorded pass: pick the near side, per-
 * frame metrics (aspect-corrected), segment stroke cycles from the wrist
 * track, then aggregate. It never hides low confidence: the report carries
 * the mean visibility and a lowConfidence flag, and the copy layer leads
 * with it.
 */
export function buildSwimReport(
  timedFrames: readonly TimedFrame[],
  aspectRatio: number,
  options: CycleOptions = STROKE_SEGMENTATION,
): SwimAnalysis {
  const vote = detectFacingSide(timedFrames.map((t) => t.frame));
  const samples: SwimTimedMetrics[] = timedFrames.map((t) => ({
    tMs: t.tMs,
    metrics: computeSwimFrameMetrics(t.frame, vote.side, aspectRatio),
  }));

  const wristFrames = samples.filter((s) => s.metrics.wrist !== null).length;
  if (wristFrames < 10) {
    return {
      ok: false,
      reason:
        "We couldn't follow an arm through the water. Film side on from the deck, swimmer in the near lane, a few strokes in clear water.",
    };
  }

  const { cycles } = segmentStrokes(samples, options);
  if (cycles.length < MIN_STROKES_FOR_REPORT) {
    return {
      ok: false,
      reason: `We need at least ${MIN_STROKES_FOR_REPORT} clean stroke cycles to read anything. Splash and bubbles often cost the rest; try clearer water or a slower lane.`,
    };
  }

  const meanVisibility =
    samples.reduce((sum, s) => sum + s.metrics.visibility, 0) / samples.length;

  const catchTMs: number[] = [];
  const recoveryTMs: number[] = [];
  const roll: number[] = [];
  const head: number[] = [];
  const elbow: number[] = [];
  const durations: number[] = [];

  for (const cycle of cycles) {
    const start = samples[cycle.catchIndex];
    const end = samples[cycle.nextCatchIndex];
    if (!start || !end) continue;
    catchTMs.push(start.tMs);
    durations.push(end.tMs - start.tMs);

    const recovery =
      cycle.recoveryIndex === null ? null : samples[cycle.recoveryIndex] ?? null;
    if (recovery) recoveryTMs.push(recovery.tMs);

    // Body roll proxy: near-shoulder vertical travel across the cycle.
    const len = torsoLen(start.metrics);
    if (len !== null && len > 1e-9) {
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = cycle.catchIndex; i <= cycle.nextCatchIndex; i++) {
        const sh = samples[i]?.metrics.shoulder;
        if (!sh) continue;
        if (sh.y < minY) minY = sh.y;
        if (sh.y > maxY) maxY = sh.y;
      }
      if (maxY > minY) roll.push(((maxY - minY) / len) * 100);
    }

    const h = headLiftPct(start.metrics);
    if (h !== null) head.push(h);
    const e = elbowRecoveryPct(recovery ? recovery.metrics : null);
    if (e !== null) elbow.push(e);
  }

  let strokeRateSpm: number | null = null;
  if (catchTMs.length >= 2) {
    const first = catchTMs[0];
    const last = catchTMs[catchTMs.length - 1];
    if (first !== undefined && last !== undefined && last > first) {
      const meanCycleMs = (last - first) / (catchTMs.length - 1);
      // Near-arm cycle rate; both arms stroke, so total is twice.
      strokeRateSpm = 2 * (60000 / meanCycleMs);
    }
  }

  const durStats = computeStats(durations);
  const rhythmCvPct =
    durStats && durStats.mean > 0
      ? (durStats.stdDev / durStats.mean) * 100
      : null;

  const lastSample = samples[samples.length - 1];

  const confidence = scoreConfidence({
    trackedFraction: samples.length > 0 ? wristFrames / samples.length : 0,
    cycleDurationsMs: durations,
    cycleCount: cycles.length,
    minCycles: MIN_STROKES_FOR_REPORT,
    sideConfidence: vote.confidence,
  });

  return {
    ok: true,
    report: {
      side: vote.side,
      sideConfidence: vote.confidence,
      meanVisibility,
      lowConfidence: meanVisibility < SWIM_CONFIDENCE_FLOOR,
      confidence,
      sampleCount: samples.length,
      analyzedMs: lastSample ? lastSample.tMs : 0,
      strokeCount: cycles.length,
      catchTMs,
      recoveryTMs,
      strokeRateSpm,
      rhythmCvPct,
      bodyRollPct: computeStats(roll),
      headLiftPct: computeStats(head),
      elbowRecoveryPct: computeStats(elbow),
    },
  };
}
