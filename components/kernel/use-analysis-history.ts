"use client";

import * as React from "react";

import { latestAnalysis, saveAnalysis, type SavedAnalysis } from "@/lib/db";
import type { ScoreBoard } from "@/lib/kernel/dashboard";

/*
 * Auto-save each completed analysis and hand back the previous one of the
 * same sport+variant, so the dashboard can show a "since last time"
 * comparison. Runs on the client only (IndexedDB), saves exactly once per
 * genuinely new result (deduped by a value signature so re-renders and the
 * ticking status label never re-save), and fetches the prior result BEFORE
 * saving the new one so the comparison is against the real previous.
 */
export function useAnalysisHistory(
  sport: string | undefined,
  variant: string | undefined,
  board: ScoreBoard,
): { previous: SavedAnalysis | null } {
  const [previous, setPrevious] = React.useState<SavedAnalysis | null>(null);
  const savedSig = React.useRef<string | null>(null);

  // A stable fingerprint of this result: same numbers => same analysis.
  const signature =
    sport && variant && board.overall !== null
      ? JSON.stringify({
          sport,
          variant,
          overall: board.overall,
          m: board.categories.map((c) => [c.key, c.value] as const),
        })
      : null;

  React.useEffect(() => {
    if (!signature || !sport || !variant) return;
    if (savedSig.current === signature) return; // already handled this result
    savedSig.current = signature;

    let cancelled = false;
    void (async () => {
      try {
        const prior = await latestAnalysis(sport, variant);
        if (!cancelled) setPrevious(prior ?? null);
        await saveAnalysis({
          sport,
          variant,
          overall: board.overall,
          metrics: board.categories.map((c) => ({
            key: c.key,
            label: c.label,
            value: c.value,
            target: c.target,
            verdict: c.verdict,
            score: c.score,
          })),
        });
      } catch {
        // Persistence unavailable (private mode): comparison just stays empty.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signature, sport, variant, board]);

  return { previous };
}
