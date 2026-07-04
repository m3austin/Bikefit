import { ScoreDashboard } from "@/components/kernel/score-dashboard";
import { formatPct } from "@/lib/format";
import type { MetricInput } from "@/lib/kernel/dashboard";
import { poseAt, type KeyFrameSpec } from "@/lib/kernel/keyframes";
import { toneForVerdict } from "@/lib/kernel/scoring";
import type { TimedFrame } from "@/lib/kernel/tracking";
import { SIDE_LANDMARKS } from "@/lib/pose-model";
import type { SwimReport } from "@/lib/sports/swimming/biomechanics";
import {
  evaluateSwimRules,
  extractMeasuredSwim,
  type SwimMetricVerdict,
} from "@/lib/sports/swimming/rules";

/*
 * SwimFit results: leads with the confidence read (this is the whole point
 * of the beta), then one change at a time, verdict cards, and the heaviest
 * data-quality caveats in the app. Pure presentation over the swim rules.
 */

const VERDICT_LABELS: Record<
  SwimMetricVerdict["id"],
  { label: string; hint: string }
> = {
  strokeRate: { label: "Stroke rate", hint: "Total strokes per minute, both arms" },
  headLift: {
    label: "Head position",
    hint: "Head lift at the catch, % of torso (higher = looking forward)",
  },
  elbowRecovery: {
    label: "Recovery elbow",
    hint: "Elbow height above the shoulder at recovery, % of torso",
  },
  bodyRoll: {
    label: "Body roll (rough proxy)",
    hint: "Near-shoulder bob per stroke, % of torso; the weakest reading here",
  },
};

function toMetrics(verdicts: SwimMetricVerdict[]): MetricInput[] {
  return verdicts.map((v) => ({
    key: v.id,
    label: VERDICT_LABELS[v.id].label,
    hint: VERDICT_LABELS[v.id].hint,
    value: v.value,
    target: v.target,
    verdict: v.verdict,
  }));
}

/** The catch and the recovery apex, with the near arm traced. */
function buildSwimKeyFrames(
  report: SwimReport,
  frames: readonly TimedFrame[],
  verdicts: SwimMetricVerdict[],
): KeyFrameSpec[] {
  const ids = SIDE_LANDMARKS[report.side];
  const arm = [ids.shoulder, ids.elbow, ids.wrist];
  const elbowTone = toneForVerdict(
    verdicts.find((v) => v.id === "elbowRecovery")?.verdict ?? "in_range",
  );
  const elbowText =
    report.elbowRecoveryPct === null
      ? "n/a"
      : formatPct(report.elbowRecoveryPct.mean);
  const catchT = report.catchTMs[0];
  const recoveryT = report.recoveryTMs[0];
  const specs: KeyFrameSpec[] = [];
  if (catchT !== undefined) {
    const landmarks = poseAt(frames, catchT);
    if (landmarks) {
      specs.push({
        tMs: catchT,
        label: "Catch",
        caption: "The hand enters and starts to grab water out front.",
        landmarks,
        highlights: [
          { label: "Arm", valueText: "catch", points: arm, tone: "great" },
        ],
      });
    }
  }
  if (recoveryT !== undefined) {
    const landmarks = poseAt(frames, recoveryT);
    if (landmarks) {
      specs.push({
        tMs: recoveryT,
        label: "Recovery",
        caption: "The arm swings forward over the water; a high elbow leads.",
        landmarks,
        highlights: [
          { label: "Elbow", valueText: elbowText, points: arm, tone: elbowTone },
        ],
      });
    }
  }
  return specs;
}

function ConfidenceLead({ report }: { report: SwimReport }) {
  const pct = Math.round(report.meanVisibility * 100);
  return (
    <div
      className={`flex flex-col gap-2 rounded-md border p-5 ${
        report.lowConfidence
          ? "border-warn/50 bg-warn/10"
          : "border-line bg-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Tracking confidence</p>
        <span className="measurement text-sm font-medium text-ink">{pct}%</span>
      </div>
      {report.lowConfidence ? (
        <p className="max-w-prose text-sm leading-relaxed text-ink">
          The water beat the camera on this clip. We could follow your arm
          just enough to segment strokes, but splash and low visibility make
          the numbers below unreliable. Try clearer water, a slower lane, or a
          camera closer to the surface, and read the results as rough at best.
        </p>
      ) : (
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          We could follow your near arm through most of the clip. That is a
          good sign for a swim video; the readings below are still 2D proxies
          from one side, so weigh them against how the stroke feels.
        </p>
      )}
    </div>
  );
}

export function SwimResultsSection({
  report,
  frames,
  videoUrl,
  aspect,
}: {
  report: SwimReport | null;
  frames?: TimedFrame[];
  videoUrl?: string;
  aspect?: number;
}) {
  if (!report) return null;

  const values = extractMeasuredSwim(report);
  const { primary, secondary, verdicts } = evaluateSwimRules(values);
  const keyFrames = frames
    ? buildSwimKeyFrames(report, frames, verdicts)
    : undefined;

  return (
    <ScoreDashboard
      title="Stroke analysis"
      intro="Your front crawl, scored against sensible ranges. Read the confidence first: on a swim clip it decides how much the rest is worth. The key moments below trace your near arm."
      metrics={toMetrics(verdicts)}
      primary={primary}
      secondary={secondary}
      drillsBase="/swimming/drills"
      rabbitHoleHref="/method#swimming"
      allClearNote="No change to make from these numbers. Swim, and remember these readings are rough by nature."
      keyFrames={keyFrames}
      videoUrl={videoUrl}
      aspect={aspect}
      banners={<ConfidenceLead report={report} />}
    >
      <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
        Guidance from rough measurements, not a lesson or medical advice.
        Never swim alone where you cannot safely stop, and if a change causes
        shoulder pain, stop and see a coach or a physiotherapist.
      </p>
    </ScoreDashboard>
  );
}
