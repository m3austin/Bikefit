import { FitRecommendations } from "@/components/fit/fit-recommendations";
import { FrontalReportView } from "@/components/fit/frontal-report";
import { StrokeReportView } from "@/components/fit/stroke-report";
import { VerdictCards, type VerdictItem } from "@/components/fit/verdict-cards";
import type { FrontalStrokeReport, StrokeReport } from "@/lib/sports/cycling/biomechanics";
import {
  evaluateFitRules,
  extractMeasuredValues,
  type MetricVerdict,
} from "@/lib/sports/cycling/rules";

/** Cycling's display names for its verdict metrics. */
const VERDICT_LABELS: Record<MetricVerdict["id"], { label: string; hint: string }> = {
  kneeAtBdc: { label: "Knee at stroke bottom", hint: "Mean across strokes" },
  elbow: { label: "Elbow angle", hint: "Mean across the recording" },
  torso: { label: "Torso angle", hint: "Lean from horizontal" },
  hipMin: { label: "Hip at its most closed", hint: "Tightest point per stroke" },
  leftPeakDev: {
    label: "Left knee tracking",
    hint: "Peak inward offset, % of hip width",
  },
  rightPeakDev: {
    label: "Right knee tracking",
    hint: "Peak inward offset, % of hip width",
  },
  kneeDevAsymmetry: {
    label: "Left-right difference",
    hint: "Knee tracking gap between legs",
  },
  hipDropAbs: { label: "Hip tilt", hint: "Sideways pelvic lean" },
  timingOffset: {
    label: "Stroke timing",
    hint: "180 degrees is evenly alternating",
  },
};

function toItems(verdicts: MetricVerdict[]): VerdictItem[] {
  return verdicts.map((v) => ({
    key: v.id,
    label: VERDICT_LABELS[v.id].label,
    hint: VERDICT_LABELS[v.id].hint,
    value: v.value,
    target: v.target,
    verdict: v.verdict,
  }));
}

/*
 * The Stage 3 results section: recommendations (one change at a time),
 * verdict cards, the detailed measurement tables, a retest checklist, and
 * the disclaimer. Rendered by VideoAnalysis whenever at least one analysis
 * exists; pure presentation over the fit-rules engine's output.
 */

const RETEST_STEPS = [
  "Make only the one change above. Leave everything else alone.",
  "Ride for a few minutes so the change settles in.",
  "Re-record the same view: same camera spot, same lighting, another 15 to 20 seconds of steady pedaling.",
  "Upload the new video here and compare the numbers with these.",
];

export function VideoResultsSection({
  sideReport,
  frontalReport,
}: {
  sideReport: StrokeReport | null;
  frontalReport: FrontalStrokeReport | null;
}) {
  if (!sideReport && !frontalReport) return null;

  const values = extractMeasuredValues(sideReport, frontalReport);
  const { primary, secondary, verdicts } = evaluateFitRules(values);

  return (
    <section className="flex flex-col gap-8 border-t border-line pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">
          {sideReport && frontalReport
            ? "Complete Fit Analysis"
            : "Fit analysis"}
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          {sideReport && frontalReport
            ? "Measurements from both camera views, checked against target ranges."
            : "Measurements from your video, checked against target ranges."}
        </p>
      </div>

      <FitRecommendations
        primary={primary}
        secondary={secondary}
        drillsBase="/cycling/drills"
      />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-ink">Against the targets</h3>
        <VerdictCards items={toItems(verdicts)} />
      </div>

      {sideReport ? (
        <StrokeReportView report={sideReport} />
      ) : (
        <p className="text-sm text-ink-muted">
          Run Analyze pedal strokes on the side video to add joint angles
          here.
        </p>
      )}
      {frontalReport ? <FrontalReportView report={frontalReport} /> : null}

      {primary ? (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5">
          <h3 className="text-sm font-medium text-ink">
            How to retest after the change
          </h3>
          <ol className="flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">
            {RETEST_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span
                  className="measurement shrink-0 font-medium text-accent"
                  aria-hidden="true"
                >
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <p className="max-w-prose border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
        This is guidance from measurements and published conventions, not a
        professional bike fit or medical advice. Change one thing at a time,
        in small steps, and give each change a real ride before judging it.
        If pain persists or gets worse, stop and see a professional bike
        fitter or a physician.
      </p>
    </section>
  );
}
