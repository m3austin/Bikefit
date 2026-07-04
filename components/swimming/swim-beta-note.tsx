import { FlaskConical } from "lucide-react";

/*
 * The SwimFit beta banner. Swimming is the hardest capture in the app
 * (docs/sportfit/02 section 4), so every swim surface leads with an honest
 * beta note: one side-on camera through water, weak proxies, and a plain
 * statement that this needs real-clip validation before losing the label.
 */
export function SwimBetaNote() {
  return (
    <div
      role="note"
      aria-label="Beta"
      className="flex gap-3 rounded-md border border-warn/50 bg-warn/10 p-4"
    >
      <FlaskConical className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ink">SwimFit is in beta</p>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Filming a swim well is genuinely hard: splash, bubbles, and the
          waterline all confuse a pose model trained on dry land. This reads
          only the near arm from a side-on, above-water angle, and its numbers
          are rougher than the other sports, body roll most of all. Treat every
          reading as a hint, and lean on the confidence note in your results.
        </p>
      </div>
    </div>
  );
}
