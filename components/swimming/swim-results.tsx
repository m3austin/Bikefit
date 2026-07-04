import { FitRecommendations } from "@/components/fit/fit-recommendations";
import { VerdictCards, type VerdictItem } from "@/components/fit/verdict-cards";
import { formatSpm } from "@/lib/format";
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

function toItems(verdicts: SwimMetricVerdict[]): VerdictItem[] {
  return verdicts.map((v) => ({
    key: v.id,
    label: VERDICT_LABELS[v.id].label,
    hint: VERDICT_LABELS[v.id].hint,
    value: v.value,
    target: v.target,
    verdict: v.verdict,
  }));
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

export function SwimResultsSection({ report }: { report: SwimReport | null }) {
  if (!report) return null;

  const values = extractMeasuredSwim(report);
  const { primary, secondary, verdicts } = evaluateSwimRules(values);

  return (
    <section className="flex flex-col gap-8 border-t border-line pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">Stroke analysis</h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Measurements from your video, checked against target ranges. Your
          catches are marked on the timeline above. Read the confidence first:
          on a swim clip it decides how much the rest is worth.
        </p>
      </div>

      <ConfidenceLead report={report} />

      {report.strokeRateSpm !== null ? (
        <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-6">
          <p className="text-sm text-ink-muted">Your stroke rate</p>
          <p className="measurement text-4xl font-semibold text-ink">
            {formatSpm(report.strokeRateSpm)}
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            Total strokes per minute, counting both arms, from your near-arm
            cadence. The most reliable number on a swim clip, and a personal,
            pace-dependent one: sprinters turn over faster on purpose.
          </p>
        </div>
      ) : null}

      <FitRecommendations
        primary={primary}
        secondary={secondary}
        drillsBase="/swimming/drills"
        allClearNote="No change to make from these numbers. Swim, and remember these readings are rough by nature."
      />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-ink">Against the targets</h3>
        <VerdictCards items={toItems(verdicts)} />
      </div>

      <div
        role="note"
        aria-label="About these numbers"
        className="flex flex-col gap-1 rounded-md border border-line bg-surface p-4"
      >
        <p className="text-sm font-medium text-ink">Why swimming is beta</p>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          One above-water camera sees one side of a movement that lives half
          underwater. Body roll especially is inferred from a shoulder that
          bobs for several reasons at once. These are the roughest readings in
          the app on purpose; take the one change, and let the feel of the
          water have the final say.
        </p>
      </div>

      <p className="max-w-prose border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
        This is guidance from measurements and published conventions, not a
        lesson or medical advice. Never swim alone where you cannot safely
        stop, and if a change causes shoulder pain, stop and see a coach or a
        physiotherapist.
      </p>
    </section>
  );
}
