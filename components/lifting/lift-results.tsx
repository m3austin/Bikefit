import { FitRecommendations } from "@/components/fit/fit-recommendations";
import { VerdictCards, type VerdictItem } from "@/components/fit/verdict-cards";
import type { LiftReport } from "@/lib/sports/lifting/biomechanics";
import { evaluateLift, type LiftConfig } from "@/lib/sports/lifting/lifts";

/*
 * LiftFit results: one change at a time (kernel recommendations), verdict
 * cards from the lift's own config, a rep summary, the fatigue-drift flag,
 * the 2D honesty note, and the app's most serious disclaimer. Pure
 * presentation over the lift rules engine; the lift is data.
 */

function toItems(
  verdicts: ReturnType<typeof evaluateLift>["verdicts"],
): VerdictItem[] {
  return verdicts.map((v) => ({
    key: v.id,
    label: v.label,
    hint: v.hint,
    value: v.value,
    target: v.target,
    verdict: v.verdict,
  }));
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
}: {
  config: LiftConfig;
  report: LiftReport | null;
}) {
  if (!report) return null;

  const { primary, secondary, verdicts } = evaluateLift(config, report);

  return (
    <section className="flex flex-col gap-8 border-t border-line pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">Form analysis</h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Measurements from your set, checked against target ranges. Each rep&apos;s{" "}
          {config.anchorLabel} and {config.lockoutLabel} are marked on the
          timeline above, so you can scrub to any rep and watch it yourself.
        </p>
      </div>

      {report.fatigueDrift ? (
        <div
          role="note"
          aria-label="Fatigue signal"
          className="rounded-md border border-warn/50 bg-warn/10 p-4"
        >
          <p className="max-w-prose text-sm leading-relaxed text-ink">
            Your reps drifted in pace across the set, often a sign of fatigue.
            Later reps in a tiring set are where form breaks down, so weigh the
            average below against how the last rep looked, and end sets before
            form goes.
          </p>
        </div>
      ) : null}

      <FitRecommendations
        primary={primary}
        secondary={secondary}
        drillsBase="/lifting/drills"
        allClearNote="No change to make from these numbers. Keep the weight honest and the reps clean."
      />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-ink">Against the targets</h3>
        <VerdictCards items={toItems(verdicts)} />
      </div>

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
    </section>
  );
}
