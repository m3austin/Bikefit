/*
 * Kernel score-dashboard model (SportFits): turns a sport's measured metrics
 * into the scored, plain-language shape the results dashboard renders. Pure;
 * no React or DOM. Every sport already produces verdicts (value vs target),
 * so one model and one dashboard serve all five.
 */

import type { TargetRange, Verdict } from "@/lib/kernel/rules";
import {
  gradeFor,
  overallScore,
  techniqueScore,
  toneForVerdict,
  type Grade,
  type ScoreTone,
} from "@/lib/kernel/scoring";

/** One measured metric, the same shape the verdict cards already use. */
export type MetricInput = {
  key: string;
  label: string;
  hint: string;
  value: number;
  target: TargetRange;
  verdict: Verdict;
};

export type ScoredCategory = MetricInput & {
  /** 0-10 technique sub-score. */
  score: number;
  tone: ScoreTone;
  /** A short, plain, directional read of where the value sits. */
  plain: string;
};

export type ScoreBoard = {
  /** 0-10 overall, or null when nothing was measured. */
  overall: number | null;
  grade: Grade | null;
  /** Every scored metric, in the order given. */
  categories: ScoredCategory[];
  /** In-range metrics, the "looking good" list (highest first). */
  highlights: ScoredCategory[];
};

function plainRead(value: number, target: TargetRange, verdict: Verdict): string {
  const under = value < target.low;
  if (verdict === "in_range") return "Right in the range.";
  if (verdict === "marginal") {
    return under ? "Just under the range." : "Just over the range.";
  }
  return under ? "Under the range we look for." : "Over the range we look for.";
}

/** Score every metric, derive the overall and its grade, and split out the
 * highlights (what is already looking good). */
export function buildScoreBoard(metrics: readonly MetricInput[]): ScoreBoard {
  const categories: ScoredCategory[] = metrics.map((m) => ({
    ...m,
    score: techniqueScore(m.value, m.target),
    tone: toneForVerdict(m.verdict),
    plain: plainRead(m.value, m.target, m.verdict),
  }));

  const overall = overallScore(categories.map((c) => c.score));
  const grade: Grade | null = overall === null ? null : gradeFor(overall);

  const highlights = categories
    .filter((c) => c.verdict === "in_range")
    .sort((a, b) => b.score - a.score);

  return { overall, grade, categories, highlights };
}
