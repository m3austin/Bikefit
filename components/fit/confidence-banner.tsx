import { TriangleAlert } from "lucide-react";

/*
 * Shown once tracking confidence stays low across many frames (Stage 1).
 * Reuses CautionBanner's warn-token look and non-blaming tone (PRD §8, §12)
 * but with different copy and trigger, so it stays its own component.
 */
export function ConfidenceBanner() {
  return (
    <div
      role="note"
      aria-label="Low tracking confidence"
      className="flex gap-3 rounded-md border border-warn/40 bg-warn/10 p-4 text-ink"
    >
      <TriangleAlert className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
      <div className="space-y-1 text-sm">
        <p className="font-medium">Tracking is having trouble seeing you</p>
        <p className="text-ink-muted">
          Try brighter, even lighting, a camera placed directly to the side and
          level with the bike, and clothing that isn&apos;t loose around the
          hip and knee.
        </p>
      </div>
    </div>
  );
}
