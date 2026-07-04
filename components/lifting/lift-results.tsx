import { ScoreDashboard } from "@/components/kernel/score-dashboard";
import type { MetricInput } from "@/lib/kernel/dashboard";
import { poseAt, type KeyFrameSpec } from "@/lib/kernel/keyframes";
import { toneForVerdict } from "@/lib/kernel/scoring";
import type { TimedFrame } from "@/lib/kernel/tracking";
import { SIDE_LANDMARKS } from "@/lib/pose-model";
import type { LiftReport } from "@/lib/sports/lifting/biomechanics";
import { evaluateLift, type LiftConfig } from "@/lib/sports/lifting/lifts";

/*
 * LiftFit results, on the shared score dashboard: an overall technique score,
 * per-lift sub-scores, the key-frame stick-figure filmstrip, and the app's
 * most serious disclaimer. The rep summary and fatigue flag stay as dashboard
 * children; the lift is data throughout.
 */

function toMetrics(
  verdicts: ReturnType<typeof evaluateLift>["verdicts"],
): MetricInput[] {
  return verdicts.map((v) => ({
    key: v.id,
    label: v.label,
    hint: v.hint,
    value: v.value,
    target: v.target,
    verdict: v.verdict,
  }));
}

/** The rep anchor (bottom / setup) and lockout, with the torso traced. Every
 * lift shares this pair, so one builder serves all of them. */
function buildLiftKeyFrames(
  config: LiftConfig,
  report: LiftReport,
  frames: readonly TimedFrame[],
  verdicts: ReturnType<typeof evaluateLift>["verdicts"],
): KeyFrameSpec[] {
  const ids = SIDE_LANDMARKS[report.side];
  // Prefer the safety-critical reading if present (deadlift back rounding),
  // else the first out-of-range metric, else neutral.
  const worst =
    verdicts.find((v) => v.verdict === "out_of_range") ?? verdicts[0];
  const tone = toneForVerdict(worst?.verdict ?? "in_range");
  const torso = [ids.shoulder, ids.hip];
  const specs: KeyFrameSpec[] = [];
  const anchorT = report.anchorTMs[0];
  const lockoutT = report.lockoutTMs[0];
  if (anchorT !== undefined) {
    const landmarks = poseAt(frames, anchorT);
    if (landmarks) {
      specs.push({
        tMs: anchorT,
        label: config.anchorLabel.replace(/^\w/, (c) => c.toUpperCase()),
        caption: "The hardest position of the rep, where form is tested most.",
        landmarks,
        highlights: [
          { label: "Torso line", valueText: "check", points: torso, tone },
        ],
      });
    }
  }
  if (lockoutT !== undefined) {
    const landmarks = poseAt(frames, lockoutT);
    if (landmarks) {
      specs.push({
        tMs: lockoutT,
        label: config.lockoutLabel.replace(/^\w/, (c) => c.toUpperCase()),
        caption: "The finish: standing tall with the rep fully locked out.",
        landmarks,
        highlights: [
          {
            label: "Hip open",
            valueText: "check",
            points: [ids.shoulder, ids.hip, ids.knee],
            tone: "great",
          },
        ],
      });
    }
  }
  return specs;
}

function RepSummary({
  report,
  config,
}: {
  report: LiftReport;
  config: LiftConfig;
}) {
  const dur = report.repDurationStats;
  const rows: Array<{ label: string; value: string }> = [
    { label: "Reps read", value: String(report.repCount) },
    { label: "Footage", value: `${(report.analyzedMs / 1000).toFixed(1)} s` },
    {
      label: "Tempo",
      value: dur ? `${(dur.mean / 1000).toFixed(1)} s / rep` : "n/a",
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-ink">
        Your {config.name.toLowerCase()} set
      </h3>
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
    </div>
  );
}

export function LiftResultsSection({
  config,
  report,
  frames,
  videoUrl,
  aspect,
}: {
  config: LiftConfig;
  report: LiftReport | null;
  frames?: TimedFrame[];
  videoUrl?: string;
  aspect?: number;
}) {
  if (!report) return null;

  const { primary, secondary, verdicts } = evaluateLift(config, report);
  const keyFrames = frames
    ? buildLiftKeyFrames(config, report, frames, verdicts)
    : undefined;

  return (
    <ScoreDashboard
      title="Form analysis"
      intro={`Your ${config.name.toLowerCase()} set, scored against sensible ranges. The key moments below trace your body line so each number has a picture. This is a measuring tool, not a spotter or a coach.`}
      metrics={toMetrics(verdicts)}
      primary={primary}
      secondary={secondary}
      drillsBase="/lifting/drills"
      rabbitHoleHref="/method#lifting"
      allClearNote="No change to make from these numbers. Keep the weight honest and the reps clean."
      keyFrames={keyFrames}
      videoUrl={videoUrl}
      aspect={aspect}
      banners={
        report.fatigueDrift ? (
          <div
            role="note"
            aria-label="Fatigue signal"
            className="rounded-md border border-warn/50 bg-warn/10 p-4"
          >
            <p className="max-w-prose text-sm leading-relaxed text-ink">
              Your reps drifted in pace across the set, often a sign of fatigue.
              Later reps in a tiring set are where form breaks down, so weigh
              the average below against how the last rep looked, and end sets
              before form goes.
            </p>
          </div>
        ) : null
      }
    >
      <RepSummary report={report} config={config} />

      <div
        role="note"
        aria-label="About these numbers"
        className="flex flex-col gap-1 rounded-md border border-line bg-surface p-4"
      >
        <p className="text-sm font-medium text-ink">
          What one camera can and cannot see
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          A single side-on camera reads one plane. The back-rounding reading
          especially is a 2D proxy: it watches your torso outline, not your
          spine, and errs toward caution on purpose. Treat these as honest
          hints, take the one change, and never let a number talk you into a
          rep that feels wrong.
        </p>
      </div>

      <p className="max-w-prose border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
        This is guidance from measurements and published conventions, not a
        coach, a spotter, or medical advice. It cannot catch a failed rep.
        Change one thing at a time, keep the weight within your control, and if
        anything hurts, stop and see a coach or a physician. For heavy or
        contest lifting, work with a qualified coach.
      </p>
    </ScoreDashboard>
  );
}
