"use client";

import { ScoreDashboard } from "@/components/kernel/score-dashboard";
import type { MetricInput } from "@/lib/kernel/dashboard";
import type { KeyFrameSpec } from "@/lib/kernel/keyframes";
import type { Finding } from "@/lib/kernel/rules";
import { LANDMARK, type PoseFrame } from "@/lib/pose-model";

/*
 * Dev-only preview of the score dashboard with synthetic data, so the fun UI
 * and the skeleton overlay can be reviewed without a real video (the filmstrip
 * renders skeleton-only when no video URL is supplied). Not linked in nav.
 */

const METRICS: MetricInput[] = [
  {
    key: "tempo",
    label: "Tempo",
    hint: "Backswing time over downswing time",
    value: 2.9,
    target: { low: 2.2, high: 3.6, margin: 0.4, unit: "ratio" },
    verdict: "in_range",
  },
  {
    key: "spineChange",
    label: "Spine angle change",
    hint: "Biggest change from address, down the line",
    value: 12,
    target: { low: 0, high: 8, margin: 4, unit: "deg" },
    verdict: "out_of_range",
  },
  {
    key: "headDrift",
    label: "Head drift",
    hint: "Biggest move from address, % of torso length",
    value: 11,
    target: { low: 0, high: 15, margin: 8, unit: "pct" },
    verdict: "in_range",
  },
  {
    key: "hipTurn",
    label: "Hip turn (proxy)",
    hint: "Apparent-width shrink at the top, face on",
    value: 22,
    target: { low: 10, high: 45, margin: 10, unit: "pct" },
    verdict: "in_range",
  },
  {
    key: "leadArm",
    label: "Lead arm at the top",
    hint: "Shoulder-elbow-wrist angle",
    value: 138,
    target: { low: 150, high: 180, margin: 10, unit: "deg" },
    verdict: "marginal",
  },
];

const PRIMARY: Finding = {
  ruleId: "spine-angle-loss",
  description:
    "Your spine angle changes more than the target between address and impact, the classic stand-up move that costs contact.",
  action:
    "Work on holding your address tilt through the strike. Start with the chair drill.",
  direction: "hold",
  magnitude: "none",
  priority: 1,
  confidence: "medium",
  adjust: "posture",
};

function synthPose(): PoseFrame {
  const frame: PoseFrame = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0,
  }));
  const put = (i: number, x: number, y: number) => {
    frame[i] = { x, y, z: 0, visibility: 1 };
  };
  // A rough address posture, side on: hips back, torso tilted forward.
  put(LANDMARK.NOSE, 0.52, 0.2);
  put(LANDMARK.LEFT_SHOULDER, 0.5, 0.32);
  put(LANDMARK.RIGHT_SHOULDER, 0.54, 0.32);
  put(LANDMARK.LEFT_ELBOW, 0.47, 0.44);
  put(LANDMARK.RIGHT_ELBOW, 0.51, 0.45);
  put(LANDMARK.LEFT_WRIST, 0.5, 0.55);
  put(LANDMARK.RIGHT_WRIST, 0.51, 0.55);
  put(LANDMARK.LEFT_HIP, 0.58, 0.52);
  put(LANDMARK.RIGHT_HIP, 0.61, 0.52);
  put(LANDMARK.LEFT_KNEE, 0.56, 0.7);
  put(LANDMARK.RIGHT_KNEE, 0.6, 0.7);
  put(LANDMARK.LEFT_ANKLE, 0.55, 0.88);
  put(LANDMARK.RIGHT_ANKLE, 0.59, 0.88);
  put(LANDMARK.LEFT_HEEL, 0.53, 0.9);
  put(LANDMARK.RIGHT_HEEL, 0.57, 0.9);
  put(LANDMARK.LEFT_FOOT_INDEX, 0.6, 0.9);
  put(LANDMARK.RIGHT_FOOT_INDEX, 0.64, 0.9);
  return frame;
}

const KEY_FRAMES: KeyFrameSpec[] = [
  {
    tMs: 100,
    label: "Address",
    caption: "Your setup posture, the angle everything else is measured against.",
    landmarks: synthPose(),
    highlights: [
      {
        label: "Spine",
        valueText: "24°",
        points: [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
        tone: "work",
      },
    ],
  },
  {
    tMs: 1400,
    label: "Top of backswing",
    caption: "The turn is loaded here; ideally your spine tilt has held.",
    landmarks: synthPose(),
    highlights: [
      {
        label: "Lead arm",
        valueText: "138°",
        points: [
          LANDMARK.LEFT_SHOULDER,
          LANDMARK.LEFT_ELBOW,
          LANDMARK.LEFT_WRIST,
        ],
        tone: "watch",
      },
    ],
  },
  {
    tMs: 1700,
    label: "Impact",
    caption: "Where the club meets the ball, and where posture pays off.",
    landmarks: synthPose(),
    highlights: [
      {
        label: "Spine",
        valueText: "Δ 12°",
        points: [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
        tone: "work",
      },
    ],
  },
];

export default function DashboardPreviewPage() {
  return (
    <div className="sport-golf flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Dashboard preview</h1>
      <ScoreDashboard
        title="Swing analysis"
        intro="Synthetic data, for reviewing the dashboard without a real clip."
        metrics={METRICS}
        primary={PRIMARY}
        secondary={[]}
        drillsBase="/golf/drills"
        keyFrames={KEY_FRAMES}
      />
    </div>
  );
}
