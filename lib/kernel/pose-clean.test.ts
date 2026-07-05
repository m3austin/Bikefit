import { describe, expect, it } from "vitest";

import { cleanPoseFrames } from "@/lib/kernel/pose-clean";
import { LANDMARK, type PoseFrame } from "@/lib/pose-model";
import type { TimedFrame } from "@/lib/kernel/tracking";

/*
 * The robust-track cleaning pass: repair what poor video costs before any
 * sport reads a frame. A brief occlusion (a few low-visibility frames) is
 * bridged by interpolation so segmentation doesn't break; a single teleported
 * landmark (MediaPipe re-acquisition) is pulled back onto its path; a long
 * blackout is left alone (we can't invent what the camera never saw), and a
 * clean clip is returned untouched (golden safety).
 */

const N = 33;

function frame(points: Record<number, { x: number; y: number; v?: number }>): PoseFrame {
  return Array.from({ length: N }, (_, i) => {
    const p = points[i];
    return p
      ? { x: p.x, y: p.y, z: 0, visibility: p.v ?? 1 }
      : { x: 0, y: 0, z: 0, visibility: 0 };
  });
}

/** A landmark tracing a smooth diagonal path; `mutate` corrupts chosen frames. */
function track(
  count: number,
  mutate: (i: number) => { x: number; y: number; v?: number },
): TimedFrame[] {
  return Array.from({ length: count }, (_, i) => ({
    tMs: i * 33,
    frame: frame({ [LANDMARK.LEFT_WRIST]: mutate(i) }),
  }));
}

const wristOf = (f: TimedFrame) => f.frame[LANDMARK.LEFT_WRIST];

describe("cleanPoseFrames", () => {
  it("bridges a short occlusion by interpolating the gap", () => {
    // Smooth path x = i/30; frames 10-12 drop out (visibility 0, garbage x).
    const frames = track(30, (i) =>
      i >= 10 && i <= 12
        ? { x: 0.99, y: 0.99, v: 0 }
        : { x: i / 30, y: i / 30, v: 1 },
    );
    const cleaned = cleanPoseFrames(frames);
    for (let i = 10; i <= 12; i++) {
      const w = wristOf(cleaned[i]!);
      expect(w!.x).toBeCloseTo(i / 30, 2); // interpolated back onto the path
      expect(w!.visibility).toBeGreaterThanOrEqual(0.5); // now usable
    }
  });

  it("leaves a long blackout untouched (cannot invent lost frames)", () => {
    // 12 consecutive dropped frames exceed the max bridgeable gap.
    const frames = track(40, (i) =>
      i >= 12 && i < 24
        ? { x: 0.0, y: 0.0, v: 0 }
        : { x: i / 40, y: i / 40, v: 1 },
    );
    const cleaned = cleanPoseFrames(frames);
    const mid = wristOf(cleaned[18]!);
    expect(mid!.visibility).toBeLessThan(0.5); // still untrusted
  });

  it("pulls a single teleported landmark back onto its path", () => {
    // All frames fully visible, but frame 15 teleports across the image.
    const frames = track(30, (i) =>
      i === 15 ? { x: 0.98, y: 0.02, v: 1 } : { x: i / 30, y: 0.5, v: 1 },
    );
    const cleaned = cleanPoseFrames(frames);
    const w = wristOf(cleaned[15]!);
    expect(w!.x).toBeCloseTo(15 / 30, 2);
    expect(w!.y).toBeCloseTo(0.5, 2);
  });

  it("returns a clean, fully-visible clip unchanged", () => {
    const frames = track(30, (i) => ({
      x: 0.4 + 0.1 * Math.sin(i / 3),
      y: 0.5,
      v: 1,
    }));
    const cleaned = cleanPoseFrames(frames);
    for (let i = 0; i < frames.length; i++) {
      const before = wristOf(frames[i]!);
      const after = wristOf(cleaned[i]!);
      expect(after!.x).toBeCloseTo(before!.x, 9);
      expect(after!.y).toBeCloseTo(before!.y, 9);
      expect(after!.visibility).toBe(before!.visibility);
    }
  });

  it("leaves an unbounded edge gap untouched", () => {
    // First three frames never had a reliable left neighbour to bridge from.
    const frames = track(20, (i) =>
      i < 3 ? { x: 0, y: 0, v: 0 } : { x: i / 20, y: 0.5, v: 1 },
    );
    const cleaned = cleanPoseFrames(frames);
    expect(wristOf(cleaned[0]!)!.visibility).toBeLessThan(0.5);
  });
});
