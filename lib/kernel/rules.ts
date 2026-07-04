/*
 * Kernel rules engine (SportFits, docs/sportfit/01-Architecture.md): the
 * sport-agnostic shape of "measurements in, one-change-at-a-time findings
 * out." Each sport supplies its own measured-values type, PLACEHOLDER target
 * ranges, and rule list; this engine only knows how to verdict a value
 * against a band and how to pick the single primary finding deterministically
 * (priority, then rule order). Extracted from the original lib/fit-rules.ts;
 * behavior is identical.
 */

export type Verdict = "in_range" | "marginal" | "out_of_range";
export type Confidence = "high" | "medium" | "low";

export type TargetRange = {
  low: number;
  high: number;
  /** Marginal band width beyond [low, high] on both sides. */
  margin: number;
  unit: "deg" | "pct";
};

/** Band verdict: inside [low, high], inside the margin, or beyond it. */
export function verdictFor(value: number, target: TargetRange): Verdict {
  if (value >= target.low && value <= target.high) return "in_range";
  if (
    value >= target.low - target.margin &&
    value <= target.high + target.margin
  ) {
    return "marginal";
  }
  return "out_of_range";
}

export type Rule<V> = {
  id: string;
  /** Why this rule fired, in athlete-facing language. */
  description: string;
  condition: (v: V) => boolean;
  recommendation: {
    /** The full athlete-facing instruction. */
    action: string;
    direction: string;
    magnitude: string;
  };
  /** 1 is highest. Ties resolve by array order (deterministic). */
  priority: number;
  confidence: Confidence;
  /** Deep link target in the sport's drill guide, when a procedure exists. */
  adjust?: string;
};

/** A triggered rule, flattened for display. */
export type Finding = {
  ruleId: string;
  description: string;
  action: string;
  direction: string;
  magnitude: string;
  priority: number;
  confidence: Confidence;
  adjust?: string;
};

/**
 * Run every rule over the measurements. "One change at a time": the single
 * highest-priority finding is the primary; the rest are secondary.
 */
export function evaluateRules<V>(
  rules: readonly Rule<V>[],
  v: V,
): { primary: Finding | null; secondary: Finding[] } {
  const triggered: Finding[] = rules
    .filter((r) => r.condition(v))
    .map((r) => ({
      ruleId: r.id,
      description: r.description,
      action: r.recommendation.action,
      direction: r.recommendation.direction,
      magnitude: r.recommendation.magnitude,
      priority: r.priority,
      confidence: r.confidence,
      adjust: r.adjust,
    }));
  // Array#sort is stable, so equal priorities keep their rule-array order.
  triggered.sort((a, b) => a.priority - b.priority);
  const primary = triggered[0] ?? null;
  return { primary, secondary: triggered.slice(1) };
}
