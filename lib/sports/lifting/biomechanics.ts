/*
 * LiftFit biomechanics (docs/sportfit/02-Sport-Modules.md section 2). Pure
 * math over pose frames; no React, DOM, or MediaPipe runtime. A set of reps
 * is cyclic like pedaling: the tracked point (hip for squat and deadlift,
 * wrist for bench) runs a vertical cycle, so reps come from the kernel's
 * cyclic peak detector, exactly like strokes and strides.
 *
 * Rep anatomy, uniform across lifts: the ANCHOR is the tracker's LOWEST
 * point (largest image y): the squat bottom, the bench chest touch, the
 * deadlift bar-on-floor setup. The EXTREME is the highest point between
 * anchors: the lockout. Each lift's config names them for display and picks
 * which one its metrics read.
 *
 * WHAT A LIFT IS HERE: a config entry (lib/sports/lifting/lifts.ts) wiring
 * these shared primitives to its own metrics, targets, rules, and cues.
 * Adding a lift means adding a config entry; this file does not change.
 *
 * The constants here are DATA-QUALITY tunings, marked PLACEHOLDER because
 * they are unsourced engineering defaults; lift targets live in the configs.
 */

import {
  detectCyclePeaks,
  type CycleOptions,
  type CyclePoint,
} from "@/lib/kernel/cycles";
import {
  computeStats,
  interiorAngleDeg,
  type MetricStats,
  type Point2,
} from "@/lib/kernel/geometry";
import type { TargetRange } from "@/lib/kernel/rules";
import {
  METRIC_VISIBILITY_FLOOR,
  detectFacingSide,
  type TimedFrame,
} from "@/lib/kernel/tracking";
import { LANDMARK, SIDE_LANDMARKS, type PoseFrame, type Side } from "@/lib/pose-model";

// --- Per-frame extraction -----------------------------------------------------

/** One frame's lift-relevant points and angles for the facing side. */
export type LiftFrameMetrics = {
  shoulder: Point2 | null;
  elbow: Point2 | null;
  wrist: Point2 | null;
  hip: Point2 | null;
  knee: Point2 | null;
  ankle: Point2 | null;
  heel: Point2 | null;
  foot: Point2 | null;
  /** Hip-to-shoulder lean from VERTICAL: 0 upright, positive = tilted. */
  torsoFromVerticalDeg: number | null;
  /** Shoulder-hip-knee interior angle (180 = fully open hip). */
  hipAngleDeg: number | null;
};

export type LiftTimedMetrics = { tMs: number; metrics: LiftFrameMetrics };

export function computeLiftFrameMetrics(
  frame: PoseFrame,
  side: Side,
  aspectRatio: number,
): LiftFrameMetrics {
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

  let torsoFromVerticalDeg: number | null = null;
  if (shoulder && hip) {
    const dx = Math.abs(shoulder.x - hip.x);
    const dy = Math.abs(hip.y - shoulder.y);
    if (dx > 1e-9 || dy > 1e-9) {
      torsoFromVerticalDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
    }
  }

  return {
    shoulder,
    elbow: point(ids.elbow),
    wrist: point(ids.wrist),
    hip,
    knee,
    ankle: point(ids.ankle),
    heel: point(heelIdx),
    foot: point(footIdx),
    torsoFromVerticalDeg,
    hipAngleDeg:
      shoulder && hip && knee ? interiorAngleDeg(shoulder, hip, knee) : null,
  };
}

// --- Rep segmentation ------------------------------------------------------------

/** Which landmark's vertical cycle marks the reps. */
export type LiftTracker = "hip" | "wrist";

/**
 * PLACEHOLDER: data-quality tunings (unsourced engineering defaults).
 * minSeparationMs 1200 assumes no one grinds reps faster than one per 1.2 s.
 */
export const REP_SEGMENTATION: CycleOptions = {
  // 550ms floor admits fast, honest reps (speed squats, touch-and-go bench)
  // that a 1.2s floor merged into one; the rhythm filter below removes the
  // real double-counts a low floor would otherwise let through.
  minSeparationMs: 550,
  minRelativeHeight: 0.5,
  smoothWindow: 5,
  // A "rep" off the set's tempo is a bounce or tracker artifact, not a rep.
  intervalTolerance: 0.4,
};

/** Below this many full reps there is no report at all. PLACEHOLDER. */
export const MIN_REPS_FOR_REPORT = 2;

/**
 * PLACEHOLDER: data-quality cutoff. Rep durations spreading beyond this
 * fraction of their mean flags the set as drifting (a fatigue signal).
 */
export const FATIGUE_DRIFT_FRACTION = 0.2;

export type Rep = {
  /** The tracker's lowest point: squat bottom, chest touch, bar on floor. */
  anchorIndex: number;
  /** The highest point between this anchor and the next: the lockout. */
  extremeIndex: number | null;
  nextAnchorIndex: number;
};

export type RepSegmentation = {
  anchorIndices: number[];
  reps: Rep[];
};

function trackerPos(m: LiftFrameMetrics, tracker: LiftTracker): Point2 | null {
  return tracker === "hip" ? m.hip : m.wrist;
}

/** Segment the tracker's vertical cycle into reps (anchor to anchor, with
 * the lockout extreme between). */
export function segmentReps(
  samples: readonly LiftTimedMetrics[],
  tracker: LiftTracker,
  options: CycleOptions = REP_SEGMENTATION,
): RepSegmentation {
  const usable: Array<{ index: number; point: CyclePoint }> = [];
  samples.forEach((s, index) => {
    const pos = trackerPos(s.metrics, tracker);
    if (pos) usable.push({ index, point: { tMs: s.tMs, value: pos.y } });
  });

  const peaks = detectCyclePeaks(
    usable.map((u) => u.point),
    options,
  );

  const anchorIndices = peaks
    .map((p) => usable[p]?.index)
    .filter((i): i is number => i !== undefined);

  const reps: Rep[] = [];
  for (let k = 0; k + 1 < anchorIndices.length; k++) {
    const start = anchorIndices[k];
    const end = anchorIndices[k + 1];
    if (start === undefined || end === undefined) continue;
    let extremeIndex: number | null = null;
    let bestY = Infinity;
    for (let i = start + 1; i < end; i++) {
      const sample = samples[i];
      const pos = sample ? trackerPos(sample.metrics, tracker) : null;
      if (pos && pos.y < bestY) {
        bestY = pos.y;
        extremeIndex = i;
      }
    }
    reps.push({ anchorIndex: start, extremeIndex, nextAnchorIndex: end });
  }

  return { anchorIndices, reps };
}

/** The lifter's forward direction along x from the way the foot points. */
export function detectLiftForwardSign(
  samples: readonly LiftTimedMetrics[],
): -1 | 0 | 1 {
  let sum = 0;
  let n = 0;
  for (const s of samples) {
    const { foot, heel } = s.metrics;
    if (foot && heel) {
      sum += foot.x - heel.x;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  if (Math.abs(mean) < 1e-9) return 0;
  return mean > 0 ? 1 : -1;
}

// --- The metric-extraction contract each lift config wires up --------------------

/** Everything one rep exposes to a metric extractor. */
export type RepContext = {
  /** Frame metrics at the anchor (bottom / chest touch / setup). */
  anchor: LiftFrameMetrics;
  /** Frame metrics at the lockout extreme; null if it could not be found. */
  extreme: LiftFrameMetrics | null;
  /** Every sample in the anchor-to-next-anchor window, inclusive. */
  window: readonly LiftTimedMetrics[];
  forwardSign: -1 | 0 | 1;
};

export type LiftMetricSpec = {
  id: string;
  label: string;
  hint: string;
  /** PLACEHOLDER target band, judged on the across-rep mean. */
  target: TargetRange;
  /** One value per rep; null when its landmarks were not visible. */
  extract: (rep: RepContext) => number | null;
  /** True for metrics judged across the set rather than per rep (the value
   * is extractAcross over all reps, e.g. touch-point spread). */
  across?: (reps: readonly RepContext[]) => number | null;
};

// --- Shared extraction primitives (the vocabulary lift configs compose) ----------

export const midfootX = (m: LiftFrameMetrics): number | null =>
  m.heel && m.foot ? (m.heel.x + m.foot.x) / 2 : null;

export const footLen = (m: LiftFrameMetrics): number | null =>
  m.heel && m.foot
    ? Math.hypot(m.foot.x - m.heel.x, m.foot.y - m.heel.y)
    : null;

export const segLen = (a: Point2 | null, b: Point2 | null): number | null =>
  a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;

/** Hip below the knee at the anchor, percent of (extended) thigh length.
 * Positive = hip crease below the knee. */
export function depthPct(rep: RepContext): number | null {
  const { anchor, extreme } = rep;
  if (!anchor.hip || !anchor.knee) return null;
  const thigh = segLen(extreme?.hip ?? null, extreme?.knee ?? null);
  if (thigh === null || thigh < 1e-9) return null;
  return ((anchor.hip.y - anchor.knee.y) / thigh) * 100;
}

/** Heel rise at the anchor vs the lockout, percent of foot length. */
export function heelLiftPct(rep: RepContext): number | null {
  const { anchor, extreme } = rep;
  if (!anchor.heel || !extreme?.heel) return null;
  const len = footLen(anchor);
  if (len === null || len < 1e-9) return null;
  // Image y grows downward: a lifted heel has a SMALLER y at the anchor.
  return ((extreme.heel.y - anchor.heel.y) / len) * 100;
}

/** Signed forward offset of a point from the midfoot, percent of foot length. */
export function overMidfootPct(
  point: Point2 | null,
  frame: LiftFrameMetrics,
  forwardSign: -1 | 0 | 1,
): number | null {
  const mid = midfootX(frame);
  const len = footLen(frame);
  if (!point || mid === null || len === null || len < 1e-9 || forwardSign === 0) {
    return null;
  }
  return ((forwardSign * (point.x - mid)) / len) * 100;
}

/** Horizontal wrist-to-elbow offset at the anchor, percent of forearm length
 * (0 = wrist stacked directly over the elbow). */
export function wristOverElbowPct(rep: RepContext): number | null {
  const { anchor } = rep;
  const forearm = segLen(anchor.wrist, anchor.elbow);
  if (!anchor.wrist || !anchor.elbow || forearm === null || forearm < 1e-9) {
    return null;
  }
  return (Math.abs(anchor.wrist.x - anchor.elbow.x) / forearm) * 100;
}

/**
 * The 2D back-rounding PROXY: when the back rounds, the shoulder curls
 * toward the hip and the straight-line hip-to-shoulder distance SHORTENS
 * relative to its braced setup length. Max shortening across the rep,
 * percent of the setup length. It cannot see the spine itself; the copy
 * layer says so plainly.
 */
export function backRoundingPct(rep: RepContext): number | null {
  const ref = segLen(rep.anchor.hip, rep.anchor.shoulder);
  if (ref === null || ref < 1e-9) return null;
  let worst: number | null = null;
  for (const s of rep.window) {
    const d = segLen(s.metrics.hip, s.metrics.shoulder);
    if (d === null) continue;
    const shortening = (1 - d / ref) * 100;
    if (worst === null || shortening > worst) worst = shortening;
  }
  return worst;
}

/** Hip height at the anchor between knee (0) and shoulder (100), percent. */
export function setupHipHeightPct(rep: RepContext): number | null {
  const { anchor } = rep;
  if (!anchor.hip || !anchor.knee || !anchor.shoulder) return null;
  const span = anchor.knee.y - anchor.shoulder.y;
  if (Math.abs(span) < 1e-9) return null;
  return ((anchor.knee.y - anchor.hip.y) / span) * 100;
}

/** Max horizontal wrist drift from its anchor position across the rep,
 * percent of the setup hip-to-shoulder (torso) length. */
export function barPathDriftPct(rep: RepContext): number | null {
  const torso = segLen(rep.anchor.hip, rep.anchor.shoulder);
  if (!rep.anchor.wrist || torso === null || torso < 1e-9) return null;
  let worst: number | null = null;
  for (const s of rep.window) {
    const w = s.metrics.wrist;
    if (!w) continue;
    const drift = (Math.abs(w.x - rep.anchor.wrist.x) / torso) * 100;
    if (worst === null || drift > worst) worst = drift;
  }
  return worst;
}

/** Hip opening at the lockout (shoulder-hip-knee interior angle), degrees. */
export function lockoutHipDeg(rep: RepContext): number | null {
  return rep.extreme?.hipAngleDeg ?? null;
}

/** Torso lean from vertical at the anchor, degrees. */
export function torsoAtAnchorDeg(rep: RepContext): number | null {
  return rep.anchor.torsoFromVerticalDeg;
}

/** Across-rep touch-point consistency: the standard deviation of the anchor
 * wrist x across reps, percent of forearm length. */
export function touchSpreadPct(reps: readonly RepContext[]): number | null {
  const xs: number[] = [];
  let forearm: number | null = null;
  for (const rep of reps) {
    if (!rep.anchor.wrist) continue;
    xs.push(rep.anchor.wrist.x);
    forearm ??= segLen(rep.anchor.wrist, rep.anchor.elbow);
  }
  if (xs.length < 2 || forearm === null || forearm < 1e-9) return null;
  const stats = computeStats(xs);
  if (!stats) return null;
  return (stats.stdDev / forearm) * 100;
}

// --- Report --------------------------------------------------------------------

export type LiftMetricValue = {
  id: string;
  /** The judged value: across-rep mean (or the across-set value). */
  value: number | null;
  /** Per-rep spread, when the metric is per rep. */
  stats: MetricStats | null;
};

export type LiftReport = {
  liftId: string;
  side: Side;
  sideConfidence: number;
  sampleCount: number;
  analyzedMs: number;
  repCount: number;
  /** Key-frame timestamps for marking on the timeline. */
  anchorTMs: number[];
  lockoutTMs: number[];
  repDurationStats: MetricStats | null;
  /** One entry per config metric, in config order. */
  metrics: LiftMetricValue[];
  /** Data-quality flag: rep durations drifting (a fatigue signal). */
  fatigueDrift: boolean;
};

export type LiftAnalysis =
  | { ok: true; report: LiftReport }
  | { ok: false; reason: string };

/** The subset of a lift config the report builder needs (the full config
 * with rules and copy lives in lib/sports/lifting/lifts.ts). */
export type LiftReportConfig = {
  id: string;
  tracker: LiftTracker;
  metrics: readonly LiftMetricSpec[];
};

/**
 * The whole LiftFit pipeline over a recorded set: pick the facing side,
 * compute per-frame metrics (aspect-corrected), segment reps from the
 * tracker's vertical cycle, then run the lift's own metric extractors over
 * each rep and aggregate. The lift is DATA here: this function never
 * mentions a specific lift.
 */
export function buildLiftReport(
  timedFrames: readonly TimedFrame[],
  aspectRatio: number,
  config: LiftReportConfig,
  options: CycleOptions = REP_SEGMENTATION,
): LiftAnalysis {
  const vote = detectFacingSide(timedFrames.map((t) => t.frame));
  const samples: LiftTimedMetrics[] = timedFrames.map((t) => ({
    tMs: t.tMs,
    metrics: computeLiftFrameMetrics(t.frame, vote.side, aspectRatio),
  }));

  const trackerFrames = samples.filter(
    (s) => trackerPos(s.metrics, config.tracker) !== null,
  ).length;
  if (trackerFrames < 10) {
    return {
      ok: false,
      reason:
        "We couldn't see enough of your body to follow the movement. Whole body in frame, side on, good light.",
    };
  }

  const { anchorIndices, reps } = segmentReps(samples, config.tracker, options);
  if (reps.length < MIN_REPS_FOR_REPORT) {
    return {
      ok: false,
      reason: `We need at least ${MIN_REPS_FOR_REPORT} full reps to measure anything honestly. Film the whole set, from setup to racking.`,
    };
  }

  const forwardSign = detectLiftForwardSign(samples);

  // Every detected anchor gets a timeline marker, including the set's last.
  const anchorTMs: number[] = [];
  for (const i of anchorIndices) {
    const s = samples[i];
    if (s) anchorTMs.push(s.tMs);
  }

  const contexts: RepContext[] = [];
  const lockoutTMs: number[] = [];
  const durations: number[] = [];
  for (const rep of reps) {
    const anchor = samples[rep.anchorIndex];
    const next = samples[rep.nextAnchorIndex];
    if (!anchor || !next) continue;
    const extreme =
      rep.extremeIndex === null ? null : samples[rep.extremeIndex] ?? null;
    if (extreme) lockoutTMs.push(extreme.tMs);
    durations.push(next.tMs - anchor.tMs);
    contexts.push({
      anchor: anchor.metrics,
      extreme: extreme ? extreme.metrics : null,
      window: samples.slice(rep.anchorIndex, rep.nextAnchorIndex + 1),
      forwardSign,
    });
  }

  const metrics: LiftMetricValue[] = config.metrics.map((spec) => {
    if (spec.across) {
      return { id: spec.id, value: spec.across(contexts), stats: null };
    }
    const values = contexts
      .map((c) => spec.extract(c))
      .filter((v): v is number => v !== null);
    const stats = computeStats(values);
    return { id: spec.id, value: stats?.mean ?? null, stats };
  });

  const repDurationStats = computeStats(durations);
  const lastSample = samples[samples.length - 1];

  return {
    ok: true,
    report: {
      liftId: config.id,
      side: vote.side,
      sideConfidence: vote.confidence,
      sampleCount: samples.length,
      analyzedMs: lastSample ? lastSample.tMs : 0,
      repCount: contexts.length,
      anchorTMs,
      lockoutTMs,
      repDurationStats,
      metrics,
      fatigueDrift:
        repDurationStats !== null &&
        repDurationStats.mean > 0 &&
        repDurationStats.stdDev / repDurationStats.mean >
          FATIGUE_DRIFT_FRACTION,
    },
  };
}
