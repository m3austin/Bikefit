import { describe, expect, it } from "vitest";

import {
  averageFrameVisibility,
  averageSideVisibility,
  buildFrontalStrokeReport,
  buildStrokeReport,
  computeFrameMetrics,
  computeFrontalFrameMetrics,
  computeStats,
  detectBottomDeadCenters,
  detectFacingSide,
  detectForwardSign,
  frontalKneeDeviation,
  interiorAngleDeg,
  isSustainedLowConfidence,
  movingAverage,
  segmentStrokes,
  strokeTimingOffsetDeg,
  torsoAngleDeg,
  type TimedFrame,
  type TimedMetrics,
} from "@/lib/biomechanics";
import { LANDMARK, type PoseFrame } from "@/lib/pose-model";

/** A 33-landmark frame with every joint at a fixed visibility, unless overridden. */
function makeFrame(
  defaultVisibility: number,
  overrides: Partial<Record<number, number>> = {},
): PoseFrame {
  return Array.from({ length: 33 }, (_, i) => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: overrides[i] ?? defaultVisibility,
  }));
}

const LEFT_SIDE_INDICES = [
  LANDMARK.LEFT_SHOULDER,
  LANDMARK.LEFT_ELBOW,
  LANDMARK.LEFT_WRIST,
  LANDMARK.LEFT_HIP,
  LANDMARK.LEFT_KNEE,
  LANDMARK.LEFT_ANKLE,
];
const RIGHT_SIDE_INDICES = [
  LANDMARK.RIGHT_SHOULDER,
  LANDMARK.RIGHT_ELBOW,
  LANDMARK.RIGHT_WRIST,
  LANDMARK.RIGHT_HIP,
  LANDMARK.RIGHT_KNEE,
  LANDMARK.RIGHT_ANKLE,
];

function withSideVisibility(indices: number[], visibility: number) {
  return Object.fromEntries(indices.map((i) => [i, visibility]));
}

describe("averageSideVisibility / averageFrameVisibility", () => {
  it("averages only the requested side's joints", () => {
    const frame = makeFrame(0, {
      ...withSideVisibility(LEFT_SIDE_INDICES, 0.9),
      ...withSideVisibility(RIGHT_SIDE_INDICES, 0.1),
    });
    expect(averageSideVisibility(frame, "left")).toBeCloseTo(0.9);
    expect(averageSideVisibility(frame, "right")).toBeCloseTo(0.1);
  });

  it("treats a missing landmark as zero visibility", () => {
    const frame: PoseFrame = [];
    expect(averageSideVisibility(frame, "left")).toBe(0);
  });

  it("averages both sides for the frame-wide figure", () => {
    const frame = makeFrame(0, {
      ...withSideVisibility(LEFT_SIDE_INDICES, 1),
      ...withSideVisibility(RIGHT_SIDE_INDICES, 0),
    });
    expect(averageFrameVisibility(frame)).toBeCloseTo(0.5);
  });
});

describe("detectFacingSide", () => {
  it("picks the side with higher average visibility (right camera-side rider)", () => {
    // Filmed from the rider's right: their right side is unoccluded (high
    // visibility), their left side is behind the frame (low visibility).
    const frames = Array.from({ length: 10 }, () =>
      makeFrame(0, {
        ...withSideVisibility(RIGHT_SIDE_INDICES, 0.95),
        ...withSideVisibility(LEFT_SIDE_INDICES, 0.15),
      }),
    );
    const vote = detectFacingSide(frames);
    expect(vote.side).toBe("right");
    expect(vote.framesConsidered).toBe(10);
    expect(vote.confidence).toBeGreaterThan(0.7);
  });

  it("picks left when the left side is consistently more visible", () => {
    const frames = Array.from({ length: 6 }, () =>
      makeFrame(0, {
        ...withSideVisibility(LEFT_SIDE_INDICES, 0.9),
        ...withSideVisibility(RIGHT_SIDE_INDICES, 0.2),
      }),
    );
    expect(detectFacingSide(frames).side).toBe("left");
  });

  it("returns zero confidence with no frames", () => {
    expect(detectFacingSide([])).toEqual({
      side: "right",
      confidence: 0,
      framesConsidered: 0,
    });
  });

  it("ignores empty frames when averaging", () => {
    const good = makeFrame(0, withSideVisibility(RIGHT_SIDE_INDICES, 1));
    const frames: PoseFrame[] = [[], good, good];
    expect(detectFacingSide(frames).framesConsidered).toBe(2);
  });
});

describe("isSustainedLowConfidence", () => {
  const window = { windowSize: 5, threshold: 0.4 };

  it("is false until enough samples exist", () => {
    const samples = Array.from({ length: 3 }, (_, i) => ({
      timestampMs: i,
      visibility: 0.1,
    }));
    expect(isSustainedLowConfidence(samples, window)).toBe(false);
  });

  it("is true once the whole recent window is below threshold", () => {
    const samples = Array.from({ length: 5 }, (_, i) => ({
      timestampMs: i,
      visibility: 0.2,
    }));
    expect(isSustainedLowConfidence(samples, window)).toBe(true);
  });

  it("clears once a recent sample recovers above threshold", () => {
    const samples = [
      { timestampMs: 0, visibility: 0.1 },
      { timestampMs: 1, visibility: 0.1 },
      { timestampMs: 2, visibility: 0.1 },
      { timestampMs: 3, visibility: 0.1 },
      { timestampMs: 4, visibility: 0.9 },
    ];
    expect(isSustainedLowConfidence(samples, window)).toBe(false);
  });

  it("only looks at the most recent window, not the whole history", () => {
    const low = Array.from({ length: 20 }, (_, i) => ({
      timestampMs: i,
      visibility: 0.1,
    }));
    const recovered = [
      ...low,
      { timestampMs: 20, visibility: 0.9 },
      { timestampMs: 21, visibility: 0.9 },
      { timestampMs: 22, visibility: 0.9 },
      { timestampMs: 23, visibility: 0.9 },
      { timestampMs: 24, visibility: 0.9 },
    ];
    expect(isSustainedLowConfidence(recovered, window)).toBe(false);
  });
});

// --- Stage 2 -----------------------------------------------------------------

describe("interiorAngleDeg", () => {
  it("computes a right angle", () => {
    const angle = interiorAngleDeg({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle).toBeCloseTo(90);
  });

  it("computes a straight line as 180", () => {
    const angle = interiorAngleDeg(
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    );
    expect(angle).toBeCloseTo(180);
  });

  it("computes 45 degrees", () => {
    const angle = interiorAngleDeg({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(angle).toBeCloseTo(45);
  });

  it("is null when a segment has zero length", () => {
    expect(
      interiorAngleDeg({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    ).toBeNull();
  });
});

describe("torsoAngleDeg", () => {
  it("is 45 for an even forward lean", () => {
    expect(torsoAngleDeg({ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.4 })).toBeCloseTo(45);
  });

  it("is independent of which way the rider faces", () => {
    expect(torsoAngleDeg({ x: 0.5, y: 0.5 }, { x: 0.4, y: 0.4 })).toBeCloseTo(45);
  });

  it("is 90 upright and 0 flat", () => {
    expect(torsoAngleDeg({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.3 })).toBeCloseTo(90);
    expect(torsoAngleDeg({ x: 0.5, y: 0.5 }, { x: 0.7, y: 0.5 })).toBeCloseTo(0);
  });
});

/** A 33-landmark frame from a sparse map; unspecified joints are invisible. */
function frameWithPoints(
  points: Partial<Record<number, { x: number; y: number; visibility?: number }>>,
): PoseFrame {
  return Array.from({ length: 33 }, (_, i) => {
    const p = points[i];
    return p
      ? { x: p.x, y: p.y, z: 0, visibility: p.visibility ?? 1 }
      : { x: 0, y: 0, z: 0, visibility: 0 };
  });
}

describe("computeFrameMetrics", () => {
  it("corrects x by the video aspect ratio before measuring angles", () => {
    const frame = frameWithPoints({
      [LANDMARK.RIGHT_HIP]: { x: 0.25, y: 0.5 },
      [LANDMARK.RIGHT_KNEE]: { x: 0.25, y: 0.7 },
      [LANDMARK.RIGHT_ANKLE]: { x: 0.35, y: 0.8 },
    });
    // Square pixels: knee-to-ankle runs at 45 degrees, so the knee reads 135.
    const square = computeFrameMetrics(frame, "right", 1);
    expect(square.kneeDeg).toBeCloseTo(135, 1);
    // A 2:1 landscape frame doubles the true horizontal distances.
    const wide = computeFrameMetrics(frame, "right", 2);
    expect(wide.kneeDeg).toBeCloseTo(116.57, 1);
  });

  it("nulls only the metrics that depend on an occluded joint", () => {
    const frame = frameWithPoints({
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.35 },
      [LANDMARK.RIGHT_ELBOW]: { x: 0.7, y: 0.42 },
      [LANDMARK.RIGHT_WRIST]: { x: 0.8, y: 0.5, visibility: 0.2 },
      [LANDMARK.RIGHT_HIP]: { x: 0.5, y: 0.5 },
      [LANDMARK.RIGHT_KNEE]: { x: 0.55, y: 0.7 },
      [LANDMARK.RIGHT_ANKLE]: { x: 0.5, y: 0.85 },
    });
    const metrics = computeFrameMetrics(frame, "right", 1);
    expect(metrics.elbowDeg).toBeNull();
    expect(metrics.kneeDeg).not.toBeNull();
    expect(metrics.hipDeg).not.toBeNull();
    expect(metrics.torsoDeg).not.toBeNull();
  });
});

describe("movingAverage", () => {
  it("averages a centered window with edge shrink", () => {
    expect(movingAverage([1, 2, 3], 3)).toEqual([1.5, 2, 2.5]);
  });

  it("is the identity at window 1", () => {
    expect(movingAverage([3, 1, 4], 1)).toEqual([3, 1, 4]);
  });
});

/** TimedMetrics with only an ankle track, for peak-detection tests. */
function ankleSeries(times: number[], ys: number[]): TimedMetrics[] {
  return times.map((tMs, i) => ({
    tMs,
    metrics: {
      kneeDeg: null,
      hipDeg: null,
      elbowDeg: null,
      torsoDeg: null,
      anklePos: { x: 0.5, y: ys[i] ?? 0 },
      hipPos: null,
      shoulderPos: null,
    },
  }));
}

describe("detectBottomDeadCenters", () => {
  it("finds one peak per revolution of a sinusoidal ankle", () => {
    // 5 revolutions at 1000 ms each, sampled at 30 fps. Peaks (lowest pedal
    // point; image y grows downward) sit at t = 250 + k*1000.
    const times: number[] = [];
    const ys: number[] = [];
    for (let t = 0; t <= 5000; t += 1000 / 30) {
      times.push(t);
      ys.push(0.8 + 0.1 * Math.sin((2 * Math.PI * t) / 1000));
    }
    const peaks = detectBottomDeadCenters(ankleSeries(times, ys));
    expect(peaks).toHaveLength(5);
    peaks.forEach((index, k) => {
      const t = times[index];
      expect(t).toBeDefined();
      expect(Math.abs((t ?? 0) - (250 + k * 1000))).toBeLessThan(80);
    });
  });

  it("merges double-peaks closer than the minimum separation", () => {
    const times = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450];
    const ys = [0, 0.2, 0.4, 0.8, 1.0, 0.8, 0.95, 0.6, 0.2, 0];
    const peaks = detectBottomDeadCenters(ankleSeries(times, ys), {
      minSeparationMs: 350,
      minRelativeHeight: 0.5,
      smoothWindow: 1,
    });
    expect(peaks).toEqual([4]);
  });

  it("returns nothing for flat or too-short series", () => {
    expect(detectBottomDeadCenters(ankleSeries([0, 33], [0.5, 0.5]))).toEqual([]);
    const times = Array.from({ length: 50 }, (_, i) => i * 33);
    const flat = times.map(() => 0.5);
    expect(detectBottomDeadCenters(ankleSeries(times, flat))).toEqual([]);
  });
});

describe("detectForwardSign", () => {
  function postureSample(shoulderX: number, hipX: number): TimedMetrics {
    return {
      tMs: 0,
      metrics: {
        kneeDeg: null,
        hipDeg: null,
        elbowDeg: null,
        torsoDeg: null,
        anklePos: null,
        hipPos: { x: hipX, y: 0.5 },
        shoulderPos: { x: shoulderX, y: 0.35 },
      },
    };
  }

  it("is +1 when the shoulder leads the hip in +x", () => {
    expect(detectForwardSign([postureSample(0.6, 0.5)])).toBe(1);
  });

  it("is -1 when the rider faces -x", () => {
    expect(detectForwardSign([postureSample(0.4, 0.5)])).toBe(-1);
  });

  it("is 0 without usable posture frames", () => {
    expect(detectForwardSign([])).toBe(0);
  });
});

describe("computeStats", () => {
  it("computes min, max, mean, and sample standard deviation", () => {
    const stats = computeStats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stats).not.toBeNull();
    expect(stats?.min).toBe(2);
    expect(stats?.max).toBe(9);
    expect(stats?.mean).toBe(5);
    expect(stats?.stdDev).toBeCloseTo(Math.sqrt(32 / 7), 6);
    expect(stats?.count).toBe(8);
  });

  it("is 0 spread for a single value and null when empty", () => {
    expect(computeStats([7])?.stdDev).toBe(0);
    expect(computeStats([])).toBeNull();
  });
});

/**
 * A synthetic rider filmed from their right, pedaling 1000 ms revolutions:
 * fixed hip and shoulder, the ankle circling a bottom bracket, the knee
 * tracking between hip and ankle. Every geometric relationship below is
 * hand-derivable: BDC at t = 250 + k*1000 (ankle y max), 3 o'clock (max
 * forward ankle x; forward is +x since the shoulder leads the hip) at
 * t = k*1000.
 */
function syntheticRide(durationMs: number, fps = 30, hipY = 0.5): TimedFrame[] {
  const frames: TimedFrame[] = [];
  for (let t = 0; t <= durationMs; t += 1000 / fps) {
    const theta = (2 * Math.PI * t) / 1000;
    const ankle = {
      x: 0.5 + 0.1 * Math.cos(theta),
      y: 0.8 + 0.1 * Math.sin(theta),
    };
    const knee = {
      x: (0.5 + ankle.x) / 2 + 0.06,
      y: (hipY + ankle.y) / 2,
    };
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.RIGHT_SHOULDER]: { x: 0.65, y: hipY - 0.15 },
        [LANDMARK.RIGHT_ELBOW]: { x: 0.75, y: hipY - 0.08 },
        [LANDMARK.RIGHT_WRIST]: { x: 0.85, y: hipY },
        [LANDMARK.RIGHT_HIP]: { x: 0.5, y: hipY },
        [LANDMARK.RIGHT_KNEE]: knee,
        [LANDMARK.RIGHT_ANKLE]: ankle,
      }),
    });
  }
  return frames;
}

describe("segmentStrokes / buildStrokeReport", () => {
  it("segments revolutions and finds the 3 o'clock frame in each", () => {
    const frames = syntheticRide(5000);
    const samples: TimedMetrics[] = frames.map((f) => ({
      tMs: f.tMs,
      metrics: computeFrameMetrics(f.frame, "right", 1),
    }));
    const seg = segmentStrokes(samples);
    expect(seg.forwardSign).toBe(1);
    expect(seg.bdcIndices).toHaveLength(5);
    expect(seg.strokes).toHaveLength(4);
    seg.strokes.forEach((stroke, k) => {
      expect(stroke.threeOClockIndex).not.toBeNull();
      const t = samples[stroke.threeOClockIndex ?? -1]?.tMs ?? NaN;
      // Expected max-forward-ankle instants: t = 1000, 2000, 3000, 4000.
      expect(Math.abs(t - (k + 1) * 1000)).toBeLessThan(80);
    });
  });

  it("builds a full report from raw landmark frames", () => {
    const report = buildStrokeReport(syntheticRide(5000), 1);
    expect(report.side).toBe("right");
    expect(report.strokeCount).toBe(4);
    expect(report.cadenceRpm).not.toBeNull();
    expect(report.cadenceRpm ?? 0).toBeGreaterThan(55);
    expect(report.cadenceRpm ?? 0).toBeLessThan(65);
    expect(report.bdcTMs).toHaveLength(5);
    expect(report.threeOClockTMs).toHaveLength(4);
    // The same geometry recurs at every BDC, so knee spread is tiny and the
    // data-quality flag stays off.
    expect(report.stats.kneeAtBdc?.count).toBe(5);
    expect(report.stats.kneeAtBdc?.stdDev ?? 99).toBeLessThan(2);
    expect(report.highVariance).toBe(false);
    // Fixed hip and shoulder: torso angle is constant at
    // atan2(0.15, 0.15) = 45 degrees.
    expect(report.stats.torso?.mean).toBeCloseTo(45, 0);
    expect(report.stats.hip?.count ?? 0).toBeGreaterThan(0);
    expect(report.stats.elbow?.count ?? 0).toBeGreaterThan(0);
  });

  it("flags high knee variance as a data-quality problem", () => {
    // Two rides spliced with a large saddle-height change mid-way: knee
    // extension at BDC jumps by roughly 12 degrees between the halves.
    const a = syntheticRide(3000);
    const b = syntheticRide(3000, 30, 0.25).map((f) => ({
      tMs: f.tMs + 3100,
      frame: f.frame,
    }));
    const report = buildStrokeReport([...a, ...b], 1);
    expect(report.strokeCount).toBeGreaterThanOrEqual(4);
    expect(report.highVariance).toBe(true);
  });
});

// --- Stage B: frontal plane ----------------------------------------------------

describe("frontalKneeDeviation", () => {
  const midline = 0.5;

  it("is positive when a left-of-midline knee collapses toward the midline", () => {
    // Vertical hip-ankle line at x = 0.44; knee pushed to 0.47 (toward 0.5).
    const dev = frontalKneeDeviation(
      { x: 0.44, y: 0.5 },
      { x: 0.47, y: 0.7 },
      { x: 0.44, y: 0.9 },
      midline,
    );
    expect(dev).toBeCloseTo(0.03);
  });

  it("is negative when that knee bows away from the midline", () => {
    const dev = frontalKneeDeviation(
      { x: 0.44, y: 0.5 },
      { x: 0.41, y: 0.7 },
      { x: 0.44, y: 0.9 },
      midline,
    );
    expect(dev).toBeCloseTo(-0.03);
  });

  it("mirrors the sign convention for the right-of-midline leg", () => {
    // Toward the midline is now the -x direction; still reads positive.
    const medial = frontalKneeDeviation(
      { x: 0.56, y: 0.5 },
      { x: 0.53, y: 0.7 },
      { x: 0.56, y: 0.9 },
      midline,
    );
    expect(medial).toBeCloseTo(0.03);
    const lateral = frontalKneeDeviation(
      { x: 0.56, y: 0.5 },
      { x: 0.59, y: 0.7 },
      { x: 0.56, y: 0.9 },
      midline,
    );
    expect(lateral).toBeCloseTo(-0.03);
  });

  it("measures against the slanted hip-ankle line, not the vertical", () => {
    // Line from (0.4, 0.5) to (0.5, 0.9): at y = 0.7 the line is at x = 0.45.
    const onLine = frontalKneeDeviation(
      { x: 0.4, y: 0.5 },
      { x: 0.45, y: 0.7 },
      { x: 0.5, y: 0.9 },
      0.55,
    );
    expect(onLine).toBeCloseTo(0);
    const offLine = frontalKneeDeviation(
      { x: 0.4, y: 0.5 },
      { x: 0.48, y: 0.7 },
      { x: 0.5, y: 0.9 },
      0.55,
    );
    expect(offLine).toBeCloseTo(0.03);
  });

  it("is null when hip and ankle share a height", () => {
    expect(
      frontalKneeDeviation(
        { x: 0.4, y: 0.5 },
        { x: 0.45, y: 0.5 },
        { x: 0.5, y: 0.5 },
        0.5,
      ),
    ).toBeNull();
  });
});

describe("computeFrontalFrameMetrics", () => {
  function frontFrame(overrides: {
    leftHip?: { x: number; y: number };
    rightHip?: { x: number; y: number };
    hideHips?: boolean;
  } = {}): PoseFrame {
    const leftHip = overrides.leftHip ?? { x: 0.44, y: 0.5 };
    const rightHip = overrides.rightHip ?? { x: 0.56, y: 0.5 };
    return frameWithPoints({
      ...(overrides.hideHips
        ? {}
        : {
            [LANDMARK.LEFT_HIP]: leftHip,
            [LANDMARK.RIGHT_HIP]: rightHip,
          }),
      // Left knee pushed 0.03 toward the midline from its vertical line.
      [LANDMARK.LEFT_KNEE]: { x: 0.47, y: 0.7 },
      [LANDMARK.RIGHT_KNEE]: { x: 0.56, y: 0.7 },
      [LANDMARK.LEFT_ANKLE]: { x: 0.44, y: 0.9 },
      [LANDMARK.RIGHT_ANKLE]: { x: 0.56, y: 0.9 },
    });
  }

  it("normalizes deviations and hip drop by hip width", () => {
    // Hip width 0.12; left deviation 0.03 -> 0.25 of hip width; right on line.
    const m = computeFrontalFrameMetrics(frontFrame(), 1);
    expect(m.leftKneeDeviation).toBeCloseTo(0.25);
    expect(m.rightKneeDeviation).toBeCloseTo(0);
    expect(m.hipDrop).toBeCloseTo(0);
  });

  it("hip drop is positive when the left hip sits lower", () => {
    const m = computeFrontalFrameMetrics(
      frontFrame({ leftHip: { x: 0.44, y: 0.53 } }),
      1,
    );
    // 0.03 lower over a hip width of 0.12.
    expect(m.hipDrop).toBeCloseTo(0.25);
  });

  it("is aspect-invariant for deviations (both dx and hip width scale)", () => {
    const square = computeFrontalFrameMetrics(frontFrame(), 1);
    const wide = computeFrontalFrameMetrics(frontFrame(), 2);
    expect(wide.leftKneeDeviation).toBeCloseTo(square.leftKneeDeviation ?? NaN);
  });

  it("keeps ankles for segmentation even when hips are hidden", () => {
    const m = computeFrontalFrameMetrics(frontFrame({ hideHips: true }), 1);
    expect(m.leftKneeDeviation).toBeNull();
    expect(m.hipDrop).toBeNull();
    expect(m.leftAnkle).not.toBeNull();
    expect(m.rightAnkle).not.toBeNull();
  });
});

describe("strokeTimingOffsetDeg", () => {
  it("reads 180 for perfectly alternating legs", () => {
    const left = [250, 1250, 2250, 3250];
    const right = [750, 1750, 2750, 3750];
    // Each left BDC is half a 1000 ms period after the preceding right BDC
    // (the first left BDC has no preceding right BDC and is skipped).
    const offsets = strokeTimingOffsetDeg(left, right);
    expect(offsets).toHaveLength(3);
    for (const o of offsets) expect(o).toBeCloseTo(180);
  });

  it("is empty without enough strokes", () => {
    expect(strokeTimingOffsetDeg([250], [750])).toEqual([]);
    expect(strokeTimingOffsetDeg([250, 1250], [])).toEqual([]);
  });
});

/**
 * A synthetic straight-on rider: hips fixed at (0.44/0.56, 0.5), ankles
 * moving vertically in anti-phase with a 1000 ms period, knees riding the
 * hip-ankle midpoint pushed medially by a per-stroke deviation (a fraction
 * of the 0.12 hip width).
 */
function syntheticFrontRide(
  durationMs: number,
  opts: {
    /** Medial deviation as a fraction of hip width, given the frame time. */
    leftDev?: (tMs: number) => number;
    rightDev?: (tMs: number) => number;
    hipDropAmp?: number;
  } = {},
  fps = 30,
): TimedFrame[] {
  const hipWidth = 0.12;
  const leftDev = opts.leftDev ?? (() => 0);
  const rightDev = opts.rightDev ?? (() => 0);
  const frames: TimedFrame[] = [];
  for (let t = 0; t <= durationMs; t += 1000 / fps) {
    const theta = (2 * Math.PI * t) / 1000;
    const drop = (opts.hipDropAmp ?? 0) * Math.sin(theta);
    const leftHip = { x: 0.44, y: 0.5 + drop / 2 };
    const rightHip = { x: 0.56, y: 0.5 - drop / 2 };
    const leftAnkle = { x: 0.44, y: 0.8 + 0.08 * Math.sin(theta) };
    const rightAnkle = { x: 0.56, y: 0.8 + 0.08 * Math.sin(theta + Math.PI) };
    const leftKnee = {
      x: 0.44 + leftDev(t) * hipWidth,
      y: (leftHip.y + leftAnkle.y) / 2,
    };
    const rightKnee = {
      x: 0.56 - rightDev(t) * hipWidth,
      y: (rightHip.y + rightAnkle.y) / 2,
    };
    frames.push({
      tMs: t,
      frame: frameWithPoints({
        [LANDMARK.LEFT_HIP]: leftHip,
        [LANDMARK.RIGHT_HIP]: rightHip,
        [LANDMARK.LEFT_KNEE]: leftKnee,
        [LANDMARK.RIGHT_KNEE]: rightKnee,
        [LANDMARK.LEFT_ANKLE]: leftAnkle,
        [LANDMARK.RIGHT_ANKLE]: rightAnkle,
      }),
    });
  }
  return frames;
}

describe("buildFrontalStrokeReport", () => {
  it("segments both legs, reads deviations, symmetry, and timing", () => {
    const report = buildFrontalStrokeReport(
      syntheticFrontRide(5000, {
        leftDev: () => 0.25,
        rightDev: () => 0.05,
        hipDropAmp: 0.012,
      }),
      1,
    );
    expect(report.strokeCountLeft).toBe(4);
    expect(report.strokeCountRight).toBe(4);
    expect(report.cadenceRpm ?? 0).toBeGreaterThan(55);
    expect(report.cadenceRpm ?? 0).toBeLessThan(65);
    // Constant medial deviations, in percent of hip width.
    expect(report.stats.leftKneeDeviationPct?.mean).toBeCloseTo(25, 0);
    expect(report.stats.rightKneeDeviationPct?.mean).toBeCloseTo(5, 0);
    expect(report.stats.leftPeakDeviationPct?.mean).toBeCloseTo(25, 0);
    // Hip drop oscillates around zero with amplitude 0.012 / 0.12 = 10%.
    expect(Math.abs(report.stats.hipDropPct?.mean ?? 99)).toBeLessThan(2);
    expect(report.stats.hipDropPct?.max ?? 0).toBeGreaterThan(8);
    // Anti-phase legs: timing near 180 degrees (30 fps sampling quantizes
    // BDC times by up to ~33 ms, about 12 degrees at this cadence).
    expect(
      Math.abs((report.stats.timingOffsetDeg?.mean ?? 0) - 180),
    ).toBeLessThan(8);
    expect(report.highVariance).toBe(false);
  });

  it("flags stroke-to-stroke peak deviation swings as high variance", () => {
    // Deviation humps mid-stroke (zero at each BDC, so windows don't bleed
    // into each other) with amplitude alternating 5% / 30% per stroke.
    const leftDev = (t: number) => {
      const stroke = Math.max(0, Math.floor((t - 250) / 1000));
      const hump = Math.max(0, -Math.sin((2 * Math.PI * t) / 1000));
      return (stroke % 2 === 0 ? 0.05 : 0.3) * hump;
    };
    const report = buildFrontalStrokeReport(
      syntheticFrontRide(6000, { leftDev }),
      1,
    );
    expect(report.strokeCountLeft).toBeGreaterThanOrEqual(4);
    expect(report.highVariance).toBe(true);
  });
});
