"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import { FitRecommendations } from "@/components/fit/fit-recommendations";
import { KeyFrameFilmstrip } from "@/components/kernel/key-frame-filmstrip";
import { ScoreRing } from "@/components/kernel/score-ring";
import { formatByUnit } from "@/lib/format";
import { buildScoreBoard, type MetricInput } from "@/lib/kernel/dashboard";
import type { KeyFrameSpec } from "@/lib/kernel/keyframes";
import type { Finding } from "@/lib/kernel/rules";
import type { ScoreTone } from "@/lib/kernel/scoring";
import { cn } from "@/lib/utils";

/*
 * The scored results dashboard (SportFits flagship): an overall technique
 * score, a sub-score per category shown as a fun gauge, plain-language reads,
 * the key-frame stick-figure filmstrip, what is looking good, and the one
 * change to try. Sport-agnostic: every sport feeds it the same MetricInput
 * list and findings the verdict cards already use. Honest by construction:
 * the header says a score is a range readout, not a grade, and the numbers
 * stay PLACEHOLDER until an expert confirms them.
 */

const TONE_CHIP: Record<ScoreTone, string> = {
  great: "bg-accent/15 text-ink",
  good: "bg-accent/15 text-ink",
  watch: "bg-warn/15 text-ink",
  work: "bg-danger/15 text-ink",
};

export type ScoreDashboardProps = {
  /** Section title, e.g. "Swing analysis". */
  title: string;
  /** Plain intro under the title. */
  intro: string;
  /** The metrics to score (same shape as the verdict cards). */
  metrics: MetricInput[];
  /** The one-change-at-a-time findings for the considerations block. */
  primary: Finding | null;
  secondary: Finding[];
  drillsBase: string;
  allClearNote?: string;
  /** Optional key frames with the video to pull stills from. */
  keyFrames?: KeyFrameSpec[];
  videoUrl?: string;
  aspect?: number;
  /** Banners rendered above the score (confidence, data-quality warnings). */
  banners?: React.ReactNode;
  /** Sport-specific extras and the disclaimer, rendered at the end. */
  children?: React.ReactNode;
};

function CategoryCard({
  label,
  hint,
  plain,
  score,
  tone,
  valueText,
  rangeText,
}: {
  label: string;
  hint: string;
  plain: string;
  score: number;
  tone: ScoreTone;
  valueText: string;
  rangeText: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
      <ScoreRing score={score} tone={tone} size={64} stroke={6} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{label}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              TONE_CHIP[tone],
            )}
          >
            {plain}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-ink-muted">{hint}</p>
        <p className="text-xs text-ink-muted">
          You{" "}
          <span className="measurement text-ink">{valueText}</span>
          {"  "}vs range{" "}
          <span className="measurement text-ink">{rangeText}</span>
        </p>
      </div>
    </div>
  );
}

export function ScoreDashboard({
  title,
  intro,
  metrics,
  primary,
  secondary,
  drillsBase,
  allClearNote,
  keyFrames,
  videoUrl,
  aspect,
  banners,
  children,
}: ScoreDashboardProps) {
  const board = React.useMemo(() => buildScoreBoard(metrics), [metrics]);

  return (
    <section className="flex flex-col gap-8 border-t border-line pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          {intro}
        </p>
      </div>

      {banners}

      {/* Overall score hero. */}
      {board.overall !== null && board.grade ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:gap-6">
          <ScoreRing
            score={board.overall}
            tone={board.grade.tone}
            size={132}
            stroke={11}
          />
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <p className="measurement text-xs font-medium uppercase tracking-wide text-accent">
              Technique score
            </p>
            <p className="text-2xl font-semibold text-ink">
              {board.grade.label}
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
              Your categories, averaged. A score is a plain read of how close
              each measured angle sits to a sensible range, not an expert
              grade, and 10 means dialed in. The ranges are sensible starting
              points, not the last word.
            </p>
          </div>
        </div>
      ) : null}

      {/* Sub-scores. */}
      {board.categories.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-ink">Category scores</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {board.categories.map((c) => (
              <CategoryCard
                key={c.key}
                label={c.label}
                hint={c.hint}
                plain={c.plain}
                score={c.score}
                tone={c.tone}
                valueText={formatByUnit(c.value, c.target.unit)}
                rangeText={`${formatByUnit(c.target.low, c.target.unit)} to ${formatByUnit(c.target.high, c.target.unit)}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* What is looking good. */}
      {board.highlights.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Sparkles className="size-4 text-accent" aria-hidden="true" />
            Looking good
          </h3>
          <ul className="flex flex-wrap gap-2">
            {board.highlights.map((h) => (
              <li
                key={h.key}
                className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-ink"
              >
                <span className="font-medium">{h.label}</span>
                <span className="measurement text-xs text-ink-muted">
                  {formatByUnit(h.value, h.target.unit)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Key frames with stick-figure overlay. Renders from pose data alone;
          the video still is an enhancement when a local URL is present. */}
      {keyFrames && keyFrames.length > 0 ? (
        <KeyFrameFilmstrip
          videoUrl={videoUrl}
          frames={keyFrames}
          aspect={aspect}
        />
      ) : null}

      {/* Considerations: the one change to try. */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-ink">
          Considerations
        </h3>
        <FitRecommendations
          primary={primary}
          secondary={secondary}
          drillsBase={drillsBase}
          allClearNote={allClearNote}
        />
      </div>

      {children}
    </section>
  );
}
