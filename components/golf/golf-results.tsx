import { DetailsDisclosure } from "@/components/kernel/details-disclosure";
import { ScoreDashboard } from "@/components/kernel/score-dashboard";
import { formatDeg, formatRatio } from "@/lib/format";
import type { MetricInput } from "@/lib/kernel/dashboard";
import { poseAt, type KeyFrameSpec } from "@/lib/kernel/keyframes";
import { toneForVerdict } from "@/lib/kernel/scoring";
import type { TimedFrame } from "@/lib/kernel/tracking";
import { LANDMARK } from "@/lib/pose-model";
import type { SwingReport } from "@/lib/sports/golf/biomechanics";
import {
  evaluateGolfRules,
  extractMeasuredSwing,
  type GolfMetricVerdict,
} from "@/lib/sports/golf/rules";

/*
 * GolfFit results, on the shared score dashboard: an overall technique score,
 * per-category sub-scores, the key-frame stick-figure filmstrip, what is
 * looking good, and the one change to try. The swing-timeline table and the
 * 2D-proxy honesty note stay as dashboard children.
 */

const VERDICT_LABELS: Record<
  GolfMetricVerdict["id"],
  { label: string; hint: string }
> = {
  tempo: { label: "Tempo", hint: "Backswing time over downswing time" },
  spineChange: {
    label: "Spine angle change",
    hint: "Biggest change from address, down the line",
  },
  headDrift: {
    label: "Head drift",
    hint: "Biggest move from address, % of torso length",
  },
  shoulderTurn: {
    label: "Shoulder turn (proxy)",
    hint: "Apparent-width shrink at the top, face on",
  },
  hipTurn: {
    label: "Hip turn (proxy)",
    hint: "Apparent-width shrink at the top, face on",
  },
  hipSlide: {
    label: "Hip slide",
    hint: "Biggest lateral move, % of hip width",
  },
  leadArmAtTop: {
    label: "Lead arm at the top",
    hint: "Shoulder-elbow-wrist angle",
  },
};

function toMetrics(verdicts: GolfMetricVerdict[]): MetricInput[] {
  return verdicts.map((v) => ({
    key: v.id,
    label: VERDICT_LABELS[v.id].label,
    hint: VERDICT_LABELS[v.id].hint,
    value: v.value,
    target: v.target,
    verdict: v.verdict,
  }));
}

function PhaseSummary({ report, title }: { report: SwingReport; title: string }) {
  const p = report.phases;
  const s = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
  const rows = [
    { label: "Address", value: s(p.addressTMs) },
    { label: "Takeaway", value: s(p.takeawayTMs) },
    { label: "Top", value: s(p.topTMs) },
    { label: "Impact", value: s(p.impactTMs) },
    { label: "Finish", value: s(p.followTMs) },
    {
      label: "Tempo",
      value: report.tempoRatio === null ? "n/a" : formatRatio(report.tempoRatio),
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium text-ink">{title}</h4>
      <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 rounded-md border border-line bg-surface p-3"
          >
            <dt className="text-xs uppercase tracking-wide text-ink-muted">
              {row.label}
            </dt>
            <dd className="measurement text-sm font-medium text-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Address, top, and impact from the down-the-line view, with the spine
 * segment traced. DTL is where posture reads best; the face view drives the
 * turn numbers but is a weaker still. */
function buildGolfKeyFrames(
  report: SwingReport,
  frames: readonly TimedFrame[],
  spineTone: ReturnType<typeof toneForVerdict>,
): KeyFrameSpec[] {
  const p = report.phases;
  const spine = [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP];
  const moments: Array<{ tMs: number; label: string; caption: string; value: string }> = [
    {
      tMs: p.addressTMs,
      label: "Address",
      caption: "Your setup posture, the angle everything else is measured against.",
      value:
        report.spineAtAddressDeg === null
          ? "n/a"
          : formatDeg(report.spineAtAddressDeg),
    },
    {
      tMs: p.topTMs,
      label: "Top of backswing",
      caption: "The turn is loaded here; ideally your spine tilt has held.",
      value: "held",
    },
    {
      tMs: p.impactTMs,
      label: "Impact",
      caption: "Where the club meets the ball, and where posture pays off.",
      value:
        report.spineChangeDeg === null
          ? "n/a"
          : `Δ ${formatDeg(report.spineChangeDeg)}`,
    },
  ];
  const specs: KeyFrameSpec[] = [];
  for (const m of moments) {
    const landmarks = poseAt(frames, m.tMs);
    if (!landmarks) continue;
    specs.push({
      tMs: m.tMs,
      label: m.label,
      caption: m.caption,
      landmarks,
      highlights: [
        { label: "Spine", valueText: m.value, points: spine, tone: spineTone },
      ],
    });
  }
  return specs;
}

export function GolfResultsSection({
  dtlReport,
  faceReport,
  dtlFrames,
  faceFrames,
  dtlUrl,
  faceUrl,
  aspect,
}: {
  dtlReport: SwingReport | null;
  faceReport: SwingReport | null;
  dtlFrames?: TimedFrame[];
  faceFrames?: TimedFrame[];
  dtlUrl?: string;
  faceUrl?: string;
  aspect?: number;
}) {
  if (!dtlReport && !faceReport) return null;

  const values = extractMeasuredSwing(dtlReport, faceReport);
  const { primary, secondary, verdicts } = evaluateGolfRules(values);

  // Key frames come from the down-the-line view when present (best for
  // posture), else the face-on view.
  const spineTone = toneForVerdict(
    verdicts.find((v) => v.id === "spineChange")?.verdict ?? "in_range",
  );
  let keyFrames: KeyFrameSpec[] | undefined;
  let videoUrl: string | undefined;
  if (dtlReport && dtlFrames && dtlUrl) {
    keyFrames = buildGolfKeyFrames(dtlReport, dtlFrames, spineTone);
    videoUrl = dtlUrl;
  } else if (faceReport && faceFrames && faceUrl) {
    keyFrames = buildGolfKeyFrames(faceReport, faceFrames, spineTone);
    videoUrl = faceUrl;
  }

  return (
    <ScoreDashboard
      title="Swing analysis"
      intro="Your swing, scored against sensible ranges. The key moments below are pulled from your video with the measured angles drawn on, so every number has a picture."
      metrics={toMetrics(verdicts)}
      primary={primary}
      secondary={secondary}
      drillsBase="/golf/drills"
      rabbitHoleHref="/method#golf"
      allClearNote="No change to make from these numbers. Go play, and let your strikes have the final say."
      keyFrames={keyFrames}
      videoUrl={videoUrl}
      aspect={aspect}
    >
      <DetailsDisclosure label="See the swing timeline">
        {dtlReport ? (
          <PhaseSummary report={dtlReport} title="Down the line" />
        ) : null}
        {faceReport ? <PhaseSummary report={faceReport} title="Face on" /> : null}
      </DetailsDisclosure>

      <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
        Guidance from measurements, not a lesson or medical advice. Change one
        thing at a time, and if anything hurts, stop and see a coach or a
        physician.
      </p>
    </ScoreDashboard>
  );
}
