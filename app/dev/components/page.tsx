"use client";

import * as React from "react";

import { useUnit } from "@/components/unit-provider";
import { Button } from "@/components/ui/button";
import { MEASUREMENTS } from "@/lib/measurements";
import { CautionBanner } from "@/components/fit/caution-banner";
import { FitCard } from "@/components/fit/fit-card";
import { FitRange } from "@/components/fit/fit-range";
import { InseamIllustration } from "@/components/fit/illustrations/inseam-illustration";
import { MeasureGuide } from "@/components/fit/measure-guide";
import { MeasurementInput } from "@/components/fit/measurement-input";
import { StepProgress } from "@/components/fit/step-progress";
import { UnitToggle } from "@/components/fit/unit-toggle";

/*
 * Hidden component gallery (not linked in nav, noindex). Renders every custom
 * component in every state so the design system can be reviewed in both themes.
 * Toggle the theme (header) and units (below) to verify no layout shift.
 */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {note ? <p className="text-sm text-ink-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function StateLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="measurement text-xs uppercase tracking-wide text-ink-muted">
      {children}
    </p>
  );
}

const WIZARD_STEPS = [
  "Bike type",
  "Priority",
  "Height",
  "Inseam",
  "Torso",
  "Arm",
  "Shoulder",
  "Flexibility",
  "Foot",
  "Review",
];

export default function ComponentsGalleryPage() {
  const { unit } = useUnit();
  const inseam = MEASUREMENTS.inseam;
  const [step, setStep] = React.useState(3);

  return (
    <div className="flex flex-col gap-8 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">Component gallery</h1>
        <p className="max-w-prose text-sm text-ink-muted">
          Every custom component in every state. Switch the theme from the
          header and the units below to check both themes and confirm there is
          no layout shift when the unit changes.
        </p>
      </header>

      <Section
        title="UnitToggle"
        note="Global cm/in toggle. Changing it re-renders every measurement below in place."
      >
        <UnitToggle />
      </Section>

      <Section
        title="MeasurementInput"
        note={`Range for ${inseam.label.toLowerCase()}: ${inseam.minMm / 10}-${inseam.maxMm / 10} cm. Validates on blur, never hard-blocks.`}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <StateLabel>Empty</StateLabel>
            <MeasurementInput
              id="gallery-empty"
              label={inseam.label}
              unit={unit}
              minMm={inseam.minMm}
              maxMm={inseam.maxMm}
              recheckHint={inseam.recheckHint}
              exampleMm={inseam.exampleMm}
            />
          </div>
          <div className="flex flex-col gap-2">
            <StateLabel>Ok (in range)</StateLabel>
            <MeasurementInput
              id="gallery-ok"
              label={inseam.label}
              unit={unit}
              minMm={inseam.minMm}
              maxMm={inseam.maxMm}
              valueMm={820}
              recheckHint={inseam.recheckHint}
              exampleMm={inseam.exampleMm}
            />
          </div>
          <div className="flex flex-col gap-2">
            <StateLabel>Challenge (out of range)</StateLabel>
            <MeasurementInput
              id="gallery-challenge"
              label={inseam.label}
              unit={unit}
              minMm={inseam.minMm}
              maxMm={inseam.maxMm}
              valueMm={1200}
              recheckHint={inseam.recheckHint}
              exampleMm={inseam.exampleMm}
            />
          </div>
          <div className="flex flex-col gap-2">
            <StateLabel>Confirmed unusual</StateLabel>
            <MeasurementInput
              id="gallery-confirmed"
              label={inseam.label}
              unit={unit}
              minMm={inseam.minMm}
              maxMm={inseam.maxMm}
              valueMm={1200}
              defaultConfirmed
              recheckHint={inseam.recheckHint}
              exampleMm={inseam.exampleMm}
            />
          </div>
          <div className="flex flex-col gap-2">
            <StateLabel>Unparseable</StateLabel>
            <MeasurementInput
              id="gallery-unparseable"
              label={inseam.label}
              unit={unit}
              minMm={inseam.minMm}
              maxMm={inseam.maxMm}
              defaultText="abc"
              recheckHint={inseam.recheckHint}
              exampleMm={inseam.exampleMm}
            />
          </div>
        </div>
      </Section>

      <Section
        title="StepProgress"
        note="Completed dots jump back. Use the buttons to move the current step."
      >
        <div className="flex flex-col gap-4">
          <StepProgress
            steps={WIZARD_STEPS}
            currentIndex={step}
            onStepSelect={setStep}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="FitRange"
        note="Accent tick at the recommended start. Second example shows the rider's current setting."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-surface p-5">
            <FitRange low={718} high={730} start={724} unit={unit} />
          </div>
          <div className="rounded-md border border-line bg-surface p-5">
            <FitRange
              low={718}
              high={730}
              start={724}
              current={700}
              unit={unit}
            />
          </div>
        </div>
      </Section>

      <Section
        title="FitCard"
        note="Hero (emphasis) card with an open section, plus a standard card with all sections collapsed."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <FitCard
            title="Saddle height"
            emphasis
            startOpen
            applySteps={[
              "Loosen the seatpost clamp with a hex key.",
              "Set the saddle so the center is 72.4 cm from the bottom bracket, measured along the seat tube.",
              "Tighten to the clamp's torque spec and re-check after a short ride.",
            ]}
            troubleshooting="Numb feet or rocking hips usually mean the saddle is too high. Drop it 3 mm at a time."
            method={
              <p>
                Mean of LeMond (0.883 x inseam) and Hamley (1.09 x inseam minus
                crank length), then bike-type and priority modifiers.
              </p>
            }
          >
            <FitRange
              low={718}
              high={730}
              start={724}
              current={700}
              unit={unit}
            />
          </FitCard>

          <FitCard
            title="Saddle setback"
            applySteps={[
              "Center the saddle rails as a starting point.",
              "With the cranks level, check that your kneecap sits roughly over the pedal axle.",
            ]}
            troubleshooting="Pain at the front of the knee often eases by moving the saddle back a few millimetres."
          >
            <FitRange caption="Estimated setback" low={90} high={110} start={100} unit={unit} />
          </FitCard>
        </div>
      </Section>

      <Section
        title="CautionBanner"
        note="Shown when an input was confirmed as unusual."
      >
        <CautionBanner flags={["Inseam", "Torso length"]} />
      </Section>

      <Section
        title="MeasureGuide"
        note="Illustration panel per wizard step. The line art uses currentColor, so it themes automatically."
      >
        <div className="grid gap-6 sm:grid-cols-[1fr_320px]">
          <MeasureGuide
            title={`How to measure your ${inseam.label.toLowerCase()}`}
            illustration={<InseamIllustration />}
            steps={inseam.steps}
            mistake={inseam.mistake}
          />
          <div className="flex flex-col gap-2">
            <StateLabel>Illustration only</StateLabel>
            <div className="grid place-items-center rounded-md border border-line bg-surface p-6 text-accent [&_svg]:h-48 [&_svg]:w-auto">
              <InseamIllustration />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
