/*
 * Static data describing the BlazePose 33-point topology that
 * @mediapipe/tasks-vision's PoseLandmarker returns. This is data, not math: the
 * math that consumes it lives in lib/biomechanics.ts (CLAUDE.md).
 */

/** Index into the 33-point landmark array returned per detected pose. */
export const LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Bone connections for skeleton drawing, as [fromIndex, toIndex] pairs. This is
 * the standard BlazePose topology used across MediaPipe's own sample apps.
 */
export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];

/** One rider side's landmark set, used once the facing side is known (PRD-adjacent). */
export const SIDE_LANDMARKS = {
  left: {
    shoulder: LANDMARK.LEFT_SHOULDER,
    elbow: LANDMARK.LEFT_ELBOW,
    wrist: LANDMARK.LEFT_WRIST,
    hip: LANDMARK.LEFT_HIP,
    knee: LANDMARK.LEFT_KNEE,
    ankle: LANDMARK.LEFT_ANKLE,
  },
  right: {
    shoulder: LANDMARK.RIGHT_SHOULDER,
    elbow: LANDMARK.RIGHT_ELBOW,
    wrist: LANDMARK.RIGHT_WRIST,
    hip: LANDMARK.RIGHT_HIP,
    knee: LANDMARK.RIGHT_KNEE,
    ankle: LANDMARK.RIGHT_ANKLE,
  },
} as const;

export type Side = keyof typeof SIDE_LANDMARKS;

/** The subset of a MediaPipe NormalizedLandmark this module reasons about. */
export type PoseLandmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

/** One frame's worth of landmarks (the array PoseLandmarker returns per pose). */
export type PoseFrame = PoseLandmark[];
