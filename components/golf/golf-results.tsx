import { FitRecommendations } from "@/components/fit/fit-recommendations";
import { VerdictCards, type VerdictItem } from "@/components/fit/verdict-cards";
import { formatRatio } from "@/lib/format";
import type { SwingReport } from "@/lib/sports/golf/biomechanics";
import {
  evaluateGolfRules,
  extractMeasuredSwing,
  type GolfMetricVerdict,
} from "@/lib/sports/golf/rules";

/*
 * GolfFit results: one change at a time (kernel recommendations), verdict
 * cards, a per-view phase summary, the 2D-proxy honesty note, and the
 * disclaimer. Pure presentation over the golf rules engine.
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

function toItems(verdicts: GolfMetricVerdict[]): VerdictItem[] {
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

export function GolfResultsSection({
  dtlReport,
  faceReport,
}: {
  dtlReport: SwingReport | null;
  faceReport: SwingReport | null;
}) {
  if (!dtlReport && !faceReport) return null;

  const values = extractMeasuredSwing(dtlReport, faceReport);
  const { primary, secondary, verdicts } = evaluateGolfRules(values);

  return (
    <section className="flex flex-col gap-8 border-t border-line pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">Swing analysis</h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Measurements from your video, checked against target ranges. The
          key moments are marked on the timeline above, so you can jump
          straight to your top or impact and see it with your own eyes.
        </p>
      </div>

      <FitRecommendations
        primary={primary}
        secondary={secondary}
        drillsBase="/golf/drills"
      />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-ink">Against the targets</h3>
        <VerdictCards items={toItems(verdicts)} />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-ink">Swing timeline</h3>
        {dtlReport ? (
          <PhaseSummary report={dtlReport} title="Down the line" />
        ) : null}
        {faceReport ? <PhaseSummary report={faceReport} title="Face on" /> : null}
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
          Turn numbers here are 2D proxies: they read how your body&apos;s
          width changes on camera, not true rotation. A launch monitor or an
          in-person coach sees plenty this cannot. Treat these as honest
          hints, take the one change, and judge it by your strikes.
        </p>
      </div>

      <p className="max-w-prose border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
        This is guidance from measurements and published conventions, not a
        lesson or medical advice. Change one thing at a time, and if anything
        hurts, stop and see a coach or a physician.
      </p>
    </section>
  );
}
