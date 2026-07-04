"use client";

import * as React from "react";

import { GlossaryTerm } from "@/components/fit/glossary-term";
import {
  MeasurementInput,
  type MeasurementResult,
} from "@/components/fit/measurement-input";
import { useUnit } from "@/components/unit-provider";
import {
  CLUBFIT_RANGES,
  clubLengthAdjustment,
} from "@/lib/sports/golf/clubfit";

/*
 * GolfFit Tool A: static club-fitting starting points. Two measurements in,
 * a starting length suggestion out, with plain-language primers and the
 * honest limit (a real fitting uses a lie board and a launch monitor) up
 * front. All numbers PLACEHOLDER until a fitter confirms the chart.
 */

const PRIMERS = [
  {
    title: "Lie angle",
    id: "lie-angle" as const,
    body: "If the lie angle is wrong for you, a good swing still starts the ball offline: toe-down pushes it away, heel-down pulls it. Length and lie interact, which is exactly why the real answer comes from a lie board at a fitting, not from a chart.",
  },
  {
    title: "Grip size",
    id: "grip-size" as const,
    body: "Grips come in sizes the way gloves do, and most people never check. Too thin invites flippy hands; too thick can mute them. If your glove size is L or larger, ask a shop to measure your hand before your next regrip.",
  },
  {
    title: "Shaft flex",
    id: "shaft-flex" as const,
    body: "Flex should match how fast you actually swing, not how fast you would like to. Slower swings usually launch higher and straighter with softer flex. A launch monitor session settles this in ten minutes.",
  },
];

export function ClubfitCalculator() {
  const { unit } = useUnit();
  const [heightMm, setHeightMm] = React.useState<number | null>(null);
  const [wtfMm, setWtfMm] = React.useState<number | null>(null);

  const onHeight = React.useCallback((r: MeasurementResult) => {
    setHeightMm(r.mm);
  }, []);
  const onWtf = React.useCallback((r: MeasurementResult) => {
    setWtfMm(r.mm);
  }, []);

  const result =
    heightMm !== null && wtfMm !== null
      ? clubLengthAdjustment(heightMm, wtfMm)
      : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          GolfFit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Club fitting starting points
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Two measurements give a sensible starting club length. It is a
          starting point for trying clubs, not a fitting: a real fitting uses
          a lie board and a launch monitor, and it is worth every penny when
          you are ready.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Your measurements</h2>
        <div className="grid max-w-xl gap-6 sm:grid-cols-2">
          <MeasurementInput
            id="clubfit-height"
            label="Height"
            unit={unit}
            minMm={CLUBFIT_RANGES.height.minMm}
            maxMm={CLUBFIT_RANGES.height.maxMm}
            exampleMm={1750}
            recheckHint="Standing tall, barefoot, floor to the top of your head."
            onChange={onHeight}
          />
          <MeasurementInput
            id="clubfit-wtf"
            label="Wrist to floor"
            unit={unit}
            minMm={CLUBFIT_RANGES.wristToFloor.minMm}
            maxMm={CLUBFIT_RANGES.wristToFloor.maxMm}
            exampleMm={840}
            recheckHint="Stand relaxed in flat shoes, arms hanging; measure from the wrist crease straight down."
            onChange={onWtf}
          />
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted print:hidden">
          <span>Jargon here, tap for plain English:</span>
          <GlossaryTerm id="wrist-to-floor" />
          <GlossaryTerm id="lie-angle" />
          <GlossaryTerm id="shaft-flex" />
          <GlossaryTerm id="grip-size" />
        </p>
      </section>

      <section
        aria-label="Suggested starting length"
        className="flex flex-col gap-2 rounded-md border border-line bg-surface p-6"
      >
        <p className="text-sm text-ink-muted">Suggested starting length</p>
        {result ? (
          <>
            <p className="measurement text-3xl font-semibold text-ink">
              {result.label}
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
              Try clubs at this length first. If a shop can bend lie on a
              board while you are there, even better: length and lie are best
              set together.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            Enter both measurements above and the suggestion appears here.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">
          The other three things a fitter checks
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PRIMERS.map((p) => (
            <div
              key={p.title}
              className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4"
            >
              <h3 className="text-sm font-medium text-ink">
                <GlossaryTerm id={p.id}>{p.title}</GlossaryTerm>
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="max-w-prose border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
        These are educational starting points based on common static-fit
        charts, not a fitting and not a substitute for one. When you are
        buying, hit the actual clubs first.
      </p>
    </div>
  );
}
