/*
 * Robust-track cleaning pass (SportFits, poor-video hardening). Runs once, up
 * front, before any sport reads the frames, so every downstream metric works
 * from repaired landmark trajectories:
 *
 *  - a brief occlusion (a run of low-visibility frames) is BRIDGED by linear
 *    interpolation from the reliable frames on either side, so a flicker of
 *    lost tracking no longer breaks segmentation;
 *  - a single TELEPORTED landmark (MediaPipe losing then re-acquiring a joint)
 *    is pulled back onto its path by the same interpolation;
 *  - a LONG blackout is left alone — interpolating across it would invent
 *    motion the camera never saw, so those frames stay low-visibility and the
 *    confidence gate can see them for what they are;
 *  - a clean, fully-visible clip is returned unchanged.
 *
 * Pure; operates per landmark on normalized (0..1) coordinates.
 */

import type { PoseFrame } from "@/lib/pose-model";
import type { TimedFrame } from "@/lib/kernel/tracking";

export type PoseCleanOptions = {
  /** A landmark at/above this visibility is trusted as-is. */
  reliableVisibility: number;
  /** Bridge occlusions up to this many consecutive frames; longer gaps are
   * left untouched. */
  maxGapFrames: number;
  /** Visibility stamped on interpolated samples (>= the metric floor so they
   * are used, but below 1 to mark them as repaired). */
  repairedVisibility: number;
  /** A frame is a teleport if the landmark sits this far (normalized units)
   * from the MEDIAN of a small window around it: a jump no real motion makes
   * in one frame. A median (not a neighbour midpoint) is used so the teleport
   * can't poison the test for its own neighbours. */
  outlierJump: number;
};

/** Median of a numeric list; 0 for empty. */
function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export const DEFAULT_POSE_CLEAN: PoseCleanOptions = {
  reliableVisibility: 0.5,
  maxGapFrames: 6,
  repairedVisibility: 0.6,
  outlierJump: 0.15,
};

const LANDMARK_COUNT = 33;

export function cleanPoseFrames(
  frames: readonly TimedFrame[],
  options: PoseCleanOptions = DEFAULT_POSE_CLEAN,
): TimedFrame[] {
  const n = frames.length;
  if (n === 0) return [];

  // Copy every landmark of every frame up front; we repair in place on copies.
  const out: PoseFrame[] = frames.map((f) =>
    Array.from({ length: LANDMARK_COUNT }, (_, l) => {
      const lm = f.frame[l];
      return lm
        ? { x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility }
        : { x: 0, y: 0, z: 0, visibility: 0 };
    }),
  );

  const R = 2; // outlier-window radius
  for (let l = 0; l < LANDMARK_COUNT; l++) {
    const visOk: boolean[] = out.map(
      (f) => (f[l]?.visibility ?? 0) >= options.reliableVisibility,
    );
    // Reliable = visible enough AND not a teleport. Teleports are judged
    // against the window median of the OTHER reliable samples, computed from
    // the original positions, so one bad frame can't drag its neighbours out.
    const reliable = visOk.slice();
    for (let i = 0; i < n; i++) {
      if (!visOk[i]) continue;
      const xs: number[] = [];
      const ys: number[] = [];
      for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) {
        if (visOk[j]) {
          xs.push(out[j]![l]!.x);
          ys.push(out[j]![l]!.y);
        }
      }
      if (xs.length < 3) continue; // too little context to call an outlier
      const here = out[i]![l]!;
      if (
        Math.hypot(here.x - median(xs), here.y - median(ys)) >
        options.outlierJump
      ) {
        reliable[i] = false; // teleport: treat as a gap to bridge
      }
    }

    // Bridge each unreliable run that has reliable anchors within the budget.
    let i = 0;
    while (i < n) {
      if (reliable[i]) {
        i++;
        continue;
      }
      const start = i;
      while (i < n && !reliable[i]) i++;
      const end = i - 1; // last unreliable index in this run
      const left = start - 1;
      const right = i; // first reliable index after the run
      const bridgeable =
        left >= 0 && right < n && end - start + 1 <= options.maxGapFrames;
      if (bridgeable) {
        const a = out[left]![l]!;
        const b = out[right]![l]!;
        const span = right - left;
        for (let k = start; k <= end; k++) {
          const t = (k - left) / span;
          const lm = out[k]![l]!;
          lm.x = a.x + (b.x - a.x) * t;
          lm.y = a.y + (b.y - a.y) * t;
          lm.z = a.z + (b.z - a.z) * t;
          lm.visibility = options.repairedVisibility;
        }
      }
    }
  }

  return out.map((frame, i) => ({ tMs: frames[i]!.tMs, frame }));
}
