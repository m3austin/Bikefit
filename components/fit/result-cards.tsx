"use client";

import * as React from "react";

import { FitCard } from "@/components/fit/fit-card";
import { FitRange } from "@/components/fit/fit-range";
import { GlossaryTerm } from "@/components/fit/glossary-term";
import { cn } from "@/lib/utils";
import type { FitInput, FitResult } from "@/lib/engine";
import type { Unit } from "@/lib/units";
import { buildResultsCopy } from "@/lib/results-copy";

/** A single card that fades and slides in, staggered, during the reveal. */
function RevealItem({
  index,
  animate,
  children,
}: {
  index: number;
  animate: boolean;
  children: React.ReactNode;
}) {
  const [shown, setShown] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return;
    const id = setTimeout(() => setShown(true), 90 * index);
    return () => clearTimeout(id);
  }, [animate, index]);
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-[var(--ease-instrument)]",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

function ValueHeadline({
  caption,
  value,
  unit,
}: {
  caption: string;
  value: string | number;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-ink-muted">{caption}</span>
      <span className="measurement text-3xl font-semibold text-ink">
        {value}
        <span className="ml-1 text-base font-normal text-ink-muted">{unit}</span>
      </span>
    </div>
  );
}

export function ResultCards({
  result,
  input,
  unit,
  animate,
}: {
  result: FitResult;
  input: FitInput;
  unit: Unit;
  animate: boolean;
}) {
  const copy = buildResultsCopy({ result, input, unit });
  const isDropBar = input.bikeType === "road" || input.bikeType === "gravel";
  let index = 0;
  const next = () => index++;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Saddle height (hero) */}
      <RevealItem index={next()} animate={animate}>
        <FitCard
          title="Saddle height"
          emphasis
          adjustHref="/adjust#saddle-height"
          applySteps={copy.saddleHeight.applySteps}
          troubleshooting={copy.saddleHeight.troubleshooting}
          method={copy.saddleHeight.method}
        >
          <FitRange
            caption="Recommended start"
            low={result.saddleHeight.low}
            high={result.saddleHeight.high}
            start={result.saddleHeight.start}
            unit={unit}
            animate={animate}
          />
        </FitCard>
      </RevealItem>

      {/* 2. Saddle setback */}
      <RevealItem index={next()} animate={animate}>
        <FitCard
          title={
            <>
              Saddle <GlossaryTerm id="setback" />
            </>
          }
          adjustHref="/adjust#saddle-setback"
          applySteps={copy.setback.applySteps}
          troubleshooting={copy.setback.troubleshooting}
          method={copy.setback.method}
        >
          <FitRange
            caption="Estimated setback from the bottom bracket"
            low={result.saddleSetback.low}
            high={result.saddleSetback.high}
            start={result.saddleSetback.start}
            unit={unit}
            animate={animate}
          />
        </FitCard>
      </RevealItem>

      {/* 3. Bar drop (drop-bar bikes only) */}
      {result.barDrop && copy.barDrop ? (
        <RevealItem index={next()} animate={animate}>
          <FitCard
            title={
              <>
                Handlebar <GlossaryTerm id="bar-drop">drop</GlossaryTerm>
              </>
            }
            adjustHref="/adjust#bar-height"
            applySteps={copy.barDrop.applySteps}
            troubleshooting={copy.barDrop.troubleshooting}
            method={copy.barDrop.method}
          >
            <FitRange
              caption="Drop below the saddle"
              low={result.barDrop.low}
              high={result.barDrop.high}
              start={result.barDrop.start}
              unit={unit}
              animate={animate}
            />
          </FitCard>
        </RevealItem>
      ) : null}

      {/* 4. Bar width */}
      <RevealItem index={next()} animate={animate}>
        <FitCard
          title="Handlebar width"
          applySteps={copy.barWidth.applySteps}
          troubleshooting={copy.barWidth.troubleshooting}
          method={copy.barWidth.method}
        >
          {isDropBar && result.barWidthMm !== undefined ? (
            <ValueHeadline
              caption="Recommended width (center to center)"
              value={result.barWidthMm}
              unit="mm"
            />
          ) : (
            <p className="text-sm text-ink-muted">
              Flat bars are informational here, not a single number. See the
              guidance below.
            </p>
          )}
        </FitCard>
      </RevealItem>

      {/* 5. Reach */}
      <RevealItem index={next()} animate={animate}>
        <FitCard
          title="Reach"
          adjustHref="/adjust#reach"
          applySteps={copy.reach.applySteps}
          troubleshooting={copy.reach.troubleshooting}
          method={copy.reach.method}
        >
          <FitRange
            caption="Estimated reach (top tube plus stem)"
            low={result.reachBand.low}
            high={result.reachBand.high}
            start={result.reachBand.start}
            unit={unit}
            animate={animate}
          />
        </FitCard>
      </RevealItem>

      {/* 6. Crank length */}
      <RevealItem index={next()} animate={animate}>
        <FitCard
          title="Crank length"
          applySteps={copy.crank.applySteps}
          troubleshooting={copy.crank.troubleshooting}
          method={copy.crank.method}
        >
          <ValueHeadline
            caption="Recommended crank length"
            value={result.crankLengthMm}
            unit="mm"
          />
        </FitCard>
      </RevealItem>

      {/* 7. Cleats (only when foot length was provided) */}
      {result.cleat && copy.cleat ? (
        <RevealItem index={next()} animate={animate}>
          <FitCard
            title="Cleat position"
            adjustHref="/adjust#cleats"
            applySteps={copy.cleat.applySteps}
            troubleshooting={copy.cleat.troubleshooting}
          >
            <p className="text-sm text-ink-muted">
              There is no single number here. Set the cleat by feel using the
              steps below.
            </p>
          </FitCard>
        </RevealItem>
      ) : null}

      {/* 8. Frame size (for shoppers, visually separated) */}
      <RevealItem index={next()} animate={animate}>
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-6">
          <p className="measurement text-xs uppercase tracking-wide text-ink-muted">
            If you are shopping for a bike
          </p>
          <FitCard
            title="Frame size"
            applySteps={copy.frame.applySteps}
            troubleshooting={copy.frame.troubleshooting}
            method={copy.frame.method}
          >
            <ValueHeadline
              caption="Starting frame size"
              value={
                result.frameSize.roadCm ?? result.frameSize.mtbInches ?? "-"
              }
              unit={result.frameSize.roadCm !== undefined ? "cm" : "in"}
            />
          </FitCard>
        </div>
      </RevealItem>
    </div>
  );
}
