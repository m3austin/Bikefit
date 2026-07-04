import { describe, expect, it } from "vitest";

import { landmarkPoint, nearestFrameIndex, poseAt } from "@/lib/kernel/keyframes";
import type { TimedFrame } from "@/lib/kernel/tracking";
import type { PoseFrame } from "@/lib/pose-model";

function frameOf(x: number): PoseFrame {
  return Array.from({ length: 33 }, () => ({ x, y: x, z: 0, visibility: 1 }));
}

const frames: TimedFrame[] = [
  { tMs: 0, frame: frameOf(0) },
  { tMs: 100, frame: frameOf(0.1) },
  { tMs: 250, frame: frameOf(0.25) },
];

describe("nearestFrameIndex", () => {
  it("finds the closest frame in time", () => {
    expect(nearestFrameIndex(frames, 0)).toBe(0);
    expect(nearestFrameIndex(frames, 120)).toBe(1);
    expect(nearestFrameIndex(frames, 240)).toBe(2);
  });

  it("returns -1 for an empty list", () => {
    expect(nearestFrameIndex([], 100)).toBe(-1);
  });
});

describe("poseAt", () => {
  it("returns the pose at the nearest frame", () => {
    expect(poseAt(frames, 90)?.[0]?.x).toBeCloseTo(0.1, 5);
  });
  it("returns null when there are no frames", () => {
    expect(poseAt([], 0)).toBeNull();
  });
});

describe("landmarkPoint", () => {
  it("returns a point for a visible landmark", () => {
    const frame = frameOf(0.4);
    expect(landmarkPoint(frame, 0)).toEqual({ x: 0.4, y: 0.4 });
  });

  it("returns null below the visibility floor", () => {
    const frame: PoseFrame = [{ x: 0.5, y: 0.5, z: 0, visibility: 0.2 }];
    expect(landmarkPoint(frame, 0)).toBeNull();
  });

  it("returns null for a missing landmark", () => {
    expect(landmarkPoint([], 5)).toBeNull();
  });
});
