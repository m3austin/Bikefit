import { ScoreDashboard } from "@/components/kernel/score-dashboard";
import { formatDeg, formatSpm } from "@/lib/format";
import type { MetricInput } from "@/lib/kernel/dashboard";
import { poseAt, type KeyFrameSpec } from "@/lib/kernel/keyframes";
import { toneForVerdict } from "@/lib/kernel/scoring";
import type { TimedFrame } from "@/lib/kernel/tracking";
import { SIDE_LANDMARKS } from "@/lib/pose-model";
import type { FootStrike, GaitReport, RearGaitReport } from "@/lib/sports/running/biomechanics";
import {
  evaluateRunRules,
  extractMeasuredGait,
  type RunMetricVerdict,
} from "@/lib/sports/running/rules";

/*
 * RunFit results: cadence as the hero metric, one change at a time (kernel
 * recommendations), verdict cards, the reported-not-judged foot strike, the
 * 2D honesty note, and the strengthened physio disclaimer. Pure presentation
 * over the running rules engine.
 */

const VERDICT_LABELS: Record<
  RunMetricVerdict["id"],
  { label: string; hint: string }
> = {
  cadence: { label: "Cadence", hint: "Steps per minute, both feet" },
  overstride: {
    label: "Overstride",
    hint: "Foot ahead of hip at landing, % of leg length",
  },
  kneeFlexAtContact: {
    label: "Knee bend at landing",
    hint: "Flexion from a straight leg at contact",
  },
  verticalOscillation: {
    label: "Bounce",
    hint: "Hip rise and fall per stride, % of leg length",
  },
  trunkLean: {
    label: "Trunk lean",
    hint: "Lean from vertical, averaged over the run",
  },
  pelvicDrop: {
    label: "Pelvic drop",
    hint: "Free-hip dip during stance, % of hip width (rear view)",
  },
};

const STRIKE_LABELS: Record<FootStrike, string> = {
  heel: "Heel first",
  mid: "Midfoot",
  fore: "Forefoot",
};

function toMetrics(verdicts: RunMetricVerdict[]): MetricInput[] {
  return verdicts.map((v) => ({
    key: v.id,
    label: VERDICT_LABELS[v.id].label,
    hint: VERDICT_LABELS[v.id].hint,
    value: v.value,
    target: v.target,
    verdict: v.verdict,
  }));
}

/** Up to three footstrikes from the side view, with the landing knee traced. */
function buildRunKeyFrames(
  report: GaitReport,
  frames: readonly TimedFrame[],
  verdicts: RunMetricVerdict[],
): KeyFrameSpec[] {
  const ids = SIDE_LANDMARKS[report.side];
  const kneeTone = toneForVerdict(
    verdicts.find((v) => v.id === "kneeFlexAtContact")?.verdict ?? "in_range",
  );
  const kneeText =
    report.kneeFlexAtContactDeg === null
      ? "n/a"
      : formatDeg(report.kneeFlexAtContactDeg.mean);
  const pick = report.contactTMs.slice(0, 3);
  const specs: KeyFrameSpec[] = [];
  pick.forEach((tMs, i) => {
    const landmarks = poseAt(frames, tMs);
    if (!landmarks) return;
    specs.push({
      tMs,
      label: `Footstrike ${i + 1}`,
      caption: "The moment your foot meets the ground, where landing load lives.",
      landmarks,
      highlights: [
        {
          label: "Knee bend",
          valueText: kneeText,
          points: [ids.hip, ids.knee, ids.ankle],
          tone: kneeTone,
        },
      ],
    });
  });
  return specs;
}

function CadenceHero({ cadenceSpm }: { cadenceSpm: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-6">
      <p className="text-sm text-ink-muted">Your cadence</p>
      <p className="measurement text-4xl font-semibold text-ink">
        {formatSpm(cadenceSpm)}
      </p>
      <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
        Steps per minute, counting both feet. This is the one gait number
        worth knowing by heart: it is the easiest to measure, the easiest to
        change, and nudging it moves several other numbers with it.
      </p>
    </div>
  );
}

function FootStrikeCard({
  footStrike,
}: {
  footStrike: GaitReport["footStrike"];
}) {
  if (footStrike.label === null) return null;
  const total = footStrike.heel + footStrike.mid + footStrike.fore;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-ink">Foot strike</span>
          <span className="text-xs text-ink-muted">
            Reported, not judged: good runners do all three
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted">
          {STRIKE_LABELS[footStrike.label]}
        </span>
      </div>
      <p className="text-sm text-ink-muted">
        Across {total} landings:{" "}
        <span className="measurement text-ink">{footStrike.heel}</span> heel,{" "}
        <span className="measurement text-ink">{footStrike.mid}</span> midfoot,{" "}
        <span className="measurement text-ink">{footStrike.fore}</span>{" "}
        forefoot. Where your foot lands relative to your body matters more
        than which part touches first.
      </p>
    </div>
  );
}

function StrideSummary({
  side,
  rear,
}: {
  side: GaitReport | null;
  rear: RearGaitReport | null;
}) {
  const rows: Array<{ label: string; value: string }> = [];
  if (side) {
    rows.push(
      { label: "Strides read", value: String(side.strideCount) },
      { label: "Footage", value: `${(side.analyzedMs / 1000).toFixed(1)} s` },
    );
  }
  if (rear) {
    rows.push({
      label: "Rear strides",
      value: String(Math.max(rear.strideCountLeft, rear.strideCountRight)),
    });
  }
  if (rows.length === 0) return null;
  return (
    <dl className="grid grid-cols-3 gap-3">
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
  );
}

export function RunResultsSection({
  sideReport,
  rearReport,
  sideFrames,
  sideUrl,
  aspect,
}: {
  sideReport: GaitReport | null;
  rearReport: RearGaitReport | null;
  sideFrames?: TimedFrame[];
  sideUrl?: string;
  aspect?: number;
}) {
  if (!sideReport && !rearReport) return null;

  const values = extractMeasuredGait(sideReport, rearReport);
  const { primary, secondary, verdicts } = evaluateRunRules(values);
  const highVariance = sideReport?.highVariance ?? false;

  const keyFrames =
    sideReport && sideFrames
      ? buildRunKeyFrames(sideReport, sideFrames, verdicts)
      : undefined;

  return (
    <ScoreDashboard
      title="Gait analysis"
      intro="Your stride, scored against sensible ranges, with cadence up front because it is the one number worth knowing by heart. The key moments below trace your landing knee so each number has a picture."
      metrics={toMetrics(verdicts)}
      primary={primary}
      secondary={secondary}
      drillsBase="/running/drills"
      rabbitHoleHref="/method#running"
      allClearNote="No change to make from these numbers. Run, and let how you feel over the next weeks have the final say."
      keyFrames={keyFrames}
      videoUrl={sideUrl}
      aspect={aspect}
      banners={
        <>
          {highVariance ? (
            <div
              role="note"
              aria-label="Data quality"
              className="rounded-md border border-warn/40 bg-warn/10 p-4"
            >
              <p className="max-w-prose text-sm leading-relaxed text-ink">
                Your strides varied more than usual between landings, which
                makes these averages less trustworthy. A steadier camera,
                better light, or a steadier pace usually cleans it up.
              </p>
            </div>
          ) : null}
          {values.cadenceSpm !== undefined ? (
            <CadenceHero cadenceSpm={values.cadenceSpm} />
          ) : null}
        </>
      }
    >
      {sideReport ? <FootStrikeCard footStrike={sideReport.footStrike} /> : null}

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-ink">What was read</h3>
        <StrideSummary side={sideReport} rear={rearReport} />
      </div>

      <div
        role="note"
        aria-label="About these numbers"
        className="flex flex-col gap-1 rounded-md border border-line bg-surface p-4"
      >
        <p className="text-sm font-medium text-ink">
          What one camera can and cannot see
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          A side-on phone camera reads one plane of a three-dimensional
          movement, and treadmill running differs a little from the road.
          Treat these as honest hints ranked by usefulness, take the one
          change, and judge it by how running feels over the next two weeks.
        </p>
      </div>

      <p className="max-w-prose border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
        This is guidance from measurements and published conventions, not a
        lesson, a rehab plan, or medical advice. Change one thing at a time,
        gently. If you are running with pain, or a change creates pain, stop
        and see a physiotherapist; that is their job, not this app&apos;s.
      </p>
    </ScoreDashboard>
  );
}
