/*
 * Kernel tracking utilities (SportFits, docs/sportfit/01-Architecture.md):
 * landmark visibility, camera-facing detection, and sustained-confidence
 * checks shared by every sport module. Pure; no React, DOM, or MediaPipe
 * runtime. Moved verbatim from the original lib/biomechanics.ts.
 */

import { SIDE_LANDMARKS, type PoseFrame, type Side } from "@/lib/pose-model";

/** One captured frame with its media timestamp; the unit every analyzer eats. */
export type TimedFrame = { tMs: number; frame: PoseFrame };

/**
 * PLACEHOLDER: data-quality cutoff (unsourced engineering default). A joint
 * below this landmark visibility is excluded from angle math for that frame.
 */
export const METRIC_VISIBILITY_FLOOR = 0.5;

const MIN_FRAMES_FOR_SIDE_VOTE = 1;

/** Visibility defaults to 0 when a landmark is missing. */
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
 * Which side of the athlete faces the camera, decided by comparing average
 * landmark visibility for the left versus right joint set across all sampled
 * frames (a body filmed side-on occludes its far side, which MediaPipe
 * reports with lower visibility). Ties go to "right" (arbitrary but stable).
 * Only meaningful for side-on views; never run it on a head-on view.
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
 * `threshold` (the "confidence stayed low" banner trigger). Older samples
 * outside the window never count, so recovery clears the warning.
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
