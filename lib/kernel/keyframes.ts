/*
 * Kernel key-frame model (SportFits): the shape a sport hands the dashboard
 * so it can show the moments the analysis keyed on, with a stick-figure
 * overlay illustrating the exact angles measured. Pure; no React or DOM.
 *
 * The skeleton is drawn from the pose landmarks alone, so a key frame renders
 * even if the video pixels cannot be recaptured; the real frame, when it can
 * be grabbed, sits behind the figure as an enhancement.
 */

import type { Point2 } from "@/lib/kernel/geometry";
import type { ScoreTone } from "@/lib/kernel/scoring";
import type { TimedFrame } from "@/lib/kernel/tracking";
import type { PoseFrame } from "@/lib/pose-model";

/** One measured angle to draw over a key frame. Three landmark indices mark
 * an interior angle at the middle joint; two mark a segment (a lean). */
export type AngleHighlight = {
  /** Human label, e.g. "Knee bend" or "Spine angle". */
  label: string;
  /** The measured value already formatted, e.g. "18°". */
  valueText: string;
  /** Landmark indices: [a, b, c] interior angle at b, or [a, b] a segment. */
  points: number[];
  tone: ScoreTone;
};

export type KeyFrameSpec = {
  tMs: number;
  /** Phase or moment name, e.g. "Impact", "Footstrike", "Bottom". */
  label: string;
  /** Plain one-liner: what this moment is. */
  caption?: string;
  /** The pose at this moment (drives the skeleton). */
  landmarks: PoseFrame;
  highlights: AngleHighlight[];
};

/** The index of the timed frame nearest a target time, or -1 when empty. */
export function nearestFrameIndex(
  frames: readonly TimedFrame[],
  tMs: number,
): number {
  let best = -1;
  let bestGap = Infinity;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (!f) continue;
    const gap = Math.abs(f.tMs - tMs);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

/** The pose at the frame nearest a time, or null when there is none. */
export function poseAt(
  frames: readonly TimedFrame[],
  tMs: number,
): PoseFrame | null {
  const i = nearestFrameIndex(frames, tMs);
  return i < 0 ? null : (frames[i]?.frame ?? null);
}

/** A visible landmark as a point, or null if missing/low-confidence-nulled
 * upstream. Coordinates stay normalized (0-1); the renderer scales them. */
export function landmarkPoint(
  frame: PoseFrame,
  index: number,
  floor = 0.5,
): Point2 | null {
  const lm = frame[index];
  if (!lm || (lm.visibility ?? 0) < floor) return null;
  return { x: lm.x, y: lm.y };
}
