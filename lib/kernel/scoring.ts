/*
 * Kernel technique scoring (SportFits): the one source of truth for turning
 * measured values into 0-10 sub-scores and an overall technique score. Pure;
 * no React, DOM, or MediaPipe.
 *
 * HONESTY (docs/sportfit/00 s7, brand rule "calculator, not opinion"): a
 * score is a plain readout of how close a measured angle sits to a sensible
 * range, NOT an expert grade, and the ranges themselves are PLACEHOLDER
 * until a sport expert confirms them. In range scores 10 (we do not pretend
 * to rank within the good zone); outside it the score decays smoothly with
 * distance, measured in the target's own margin units so every metric is on
 * a comparable footing. The UI never says "perfect" (banned word); 10 reads
 * as "dialed in".
 */

import type { TargetRange, Verdict } from "@/lib/kernel/rules";

/** Decay steepness outside the range. Tuned so the marginal edge (one margin
 * out) scores ~5.7 and two margins out ~2.5: a fun, legible gradient that
 * still aligns with the in/marginal/out verdict bands. */
const DECAY = 0.75;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * A single metric's technique score in [0, 10]. In range is 10; beyond the
 * range the score falls off as 10 / (1 + k*u^2) where u is the distance
 * outside expressed in margins. A zero or missing margin is treated as a
 * hair-width margin so a hard boundary still decays rather than dividing by
 * zero.
 */
export function techniqueScore(value: number, target: TargetRange): number {
  const dev = Math.max(0, target.low - value, value - target.high);
  if (dev <= 0) return 10;
  const margin = target.margin > 0 ? target.margin : (target.high - target.low) / 4 || 1;
  const u = dev / margin;
  return round1(clamp(10 / (1 + DECAY * u * u), 0, 10));
}

/** The overall technique score: the plain mean of the sub-scores, to one
 * decimal. Empty input has no score. */
export function overallScore(subScores: readonly number[]): number | null {
  if (subScores.length === 0) return null;
  const sum = subScores.reduce((a, b) => a + b, 0);
  return round1(sum / subScores.length);
}

export type ScoreTone = "great" | "good" | "watch" | "work";

export type Grade = {
  /** Short, encouraging, never "perfect" (copy-lint). */
  label: string;
  /** Maps to the accent/warn/danger token families in the UI. */
  tone: ScoreTone;
};

/**
 * A plain-language grade band for a 0-10 score. Bands are deliberately
 * generous at the top (in-range work should feel good) and honest at the
 * bottom without being harsh.
 */
export function gradeFor(score: number): Grade {
  if (score >= 9) return { label: "Dialed in", tone: "great" };
  if (score >= 7.5) return { label: "Looking strong", tone: "good" };
  if (score >= 6) return { label: "Solid, room to grow", tone: "good" };
  if (score >= 4) return { label: "Worth some work", tone: "watch" };
  return { label: "Lots to gain", tone: "work" };
}

/** The tone for one metric's verdict, so a category chip and its ring agree. */
export function toneForVerdict(verdict: Verdict): ScoreTone {
  if (verdict === "in_range") return "great";
  if (verdict === "marginal") return "watch";
  return "work";
}
