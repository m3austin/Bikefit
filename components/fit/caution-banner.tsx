import { TriangleAlert } from "lucide-react";

/*
 * CautionBanner: shown on the fit sheet when one or more inputs carried a
 * confirmed-unusual flag (Flow 2 -> Flow 3). Informational, not an error: the
 * fit still stands, the rider just confirmed an out-of-range value. Uses the
 * warn token. Copy is non-blaming (PRD §8, §12): no exclamation marks.
 */
export function CautionBanner({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;

  return (
    <div
      role="note"
      aria-label="Caution about unusual measurements"
      className="flex gap-3 rounded-md border border-warn/40 bg-warn/10 p-4 text-ink"
    >
      <TriangleAlert
        className="mt-0.5 shrink-0 text-warn"
        aria-hidden="true"
      />
      <div className="space-y-1 text-sm">
        <p className="font-medium">Some measurements are unusual</p>
        <p className="text-ink-muted">
          You confirmed{" "}
          <span className="font-medium text-ink">{flags.join(", ")}</span> as
          entered. Your fit uses these values, so double-check them if something
          feels off.
        </p>
      </div>
    </div>
  );
}
