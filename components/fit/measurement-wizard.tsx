"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CautionBanner } from "@/components/fit/caution-banner";
import { MeasureGuide } from "@/components/fit/measure-guide";
import {
  MeasurementInput,
  type MeasurementResult,
} from "@/components/fit/measurement-input";
import { OptionCards } from "@/components/fit/option-cards";
import { StepProgress } from "@/components/fit/step-progress";
import { MEASUREMENT_ILLUSTRATIONS } from "@/components/fit/illustrations";
import { useUnit } from "@/components/unit-provider";
import { computeFit, type MeasurementKey } from "@/lib/engine";
import { MEASUREMENTS } from "@/lib/measurements";
import { formatMeasurementText } from "@/lib/format";
import {
  clearActiveDraft,
  createFit,
  getActiveDraft,
  saveActiveDraft,
} from "@/lib/db";
import {
  buildFitInput,
  canCalculate,
  defaultFitName,
  emptyWizardData,
  isStepComplete,
  OPTIONS_BY_FIELD,
  REVIEW_INDEX,
  STEP_TITLES,
  WIZARD_STEPS,
  type ChoiceField,
  type WizardData,
} from "@/lib/wizard";

function StepIntro({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="text-sm leading-relaxed text-ink-muted">{intro}</p>
    </div>
  );
}

export function MeasurementWizard() {
  const router = useRouter();
  const { unit } = useUnit();

  const [data, setData] = React.useState<WizardData>(emptyWizardData);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [hydrated, setHydrated] = React.useState(false);
  const [calculating, setCalculating] = React.useState(false);
  const reviewHeadingRef = React.useRef<HTMLHeadingElement>(null);

  // A synchronous mirror of `data`. Clicking Continue naturally blurs the
  // measurement input first (committing its value via MeasurementInput's
  // synchronous onChange), and this ref lets handleContinue read that freshly
  // committed value within the same click, before React re-renders.
  const dataRef = React.useRef(data);
  const updateData = React.useCallback(
    (updater: (prev: WizardData) => WizardData) => {
      const next = updater(dataRef.current);
      dataRef.current = next;
      setData(next);
    },
    [],
  );

  // Resume from the persisted draft (refresh-safe). Runs once on mount.
  React.useEffect(() => {
    let active = true;
    async function load() {
      const draft = await getActiveDraft();
      if (!active) return;
      if (draft) {
        const loaded: WizardData = {
          bikeType: draft.bikeType,
          priority: draft.priority ?? "balanced",
          flexibility: draft.flexibility,
          values: draft.values ?? {},
          cautions: draft.cautions ?? [],
          footSkipped: draft.footSkipped ?? false,
        };
        dataRef.current = loaded;
        setData(loaded);
        setStepIndex(Math.min(Math.max(draft.stepIndex, 0), REVIEW_INDEX));
      }
      setHydrated(true);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  // Persist the draft on every change (Flow 1: refresh-safe on every step).
  React.useEffect(() => {
    if (!hydrated) return;
    void saveActiveDraft({
      bikeType: data.bikeType,
      priority: data.priority,
      flexibility: data.flexibility,
      values: data.values,
      cautions: data.cautions,
      footSkipped: data.footSkipped,
      stepIndex,
    });
  }, [data, stepIndex, hydrated]);

  // Announce the review step to screen readers by moving focus to its heading.
  React.useEffect(() => {
    if (stepIndex === REVIEW_INDEX) reviewHeadingRef.current?.focus();
  }, [stepIndex]);

  const step = WIZARD_STEPS[stepIndex]!;
  const complete = isStepComplete(data, stepIndex);

  const setChoice = React.useCallback(
    (field: ChoiceField, value: string) => {
      updateData((d) => ({ ...d, [field]: value }));
    },
    [updateData],
  );

  const applyMeasurement = React.useCallback(
    (key: MeasurementKey, r: MeasurementResult) => {
      updateData((d) => {
        if (r.status === "editing") return d;
        const values = { ...d.values };
        const cautions = new Set(d.cautions);
        let footSkipped = d.footSkipped;
        if (r.status === "ok" && r.mm !== null) {
          values[key] = r.mm;
          cautions.delete(key);
          if (key === "foot") footSkipped = false;
        } else if (r.status === "confirmed" && r.mm !== null) {
          values[key] = r.mm;
          cautions.add(key);
          if (key === "foot") footSkipped = false;
        } else if (r.status === "challenge" && r.mm !== null) {
          values[key] = r.mm;
          cautions.delete(key);
        } else {
          // empty or unparseable: no stored value.
          delete values[key];
          cautions.delete(key);
        }
        return { ...d, values, cautions: [...cautions], footSkipped };
      });
    },
    [updateData],
  );

  const goNext = React.useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, REVIEW_INDEX));
  }, []);

  const goBack = React.useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const skipFoot = React.useCallback(() => {
    updateData((d) => {
      const values = { ...d.values };
      delete values.foot;
      return {
        ...d,
        values,
        cautions: d.cautions.filter((k) => k !== "foot"),
        footSkipped: true,
      };
    });
    goNext();
  }, [goNext, updateData]);

  const advanceMeasurement = React.useCallback(
    (key: MeasurementKey, r: MeasurementResult) => {
      applyMeasurement(key, r);
      if (r.status === "ok" || r.status === "confirmed") goNext();
    },
    [applyMeasurement, goNext],
  );

  const handleCalculate = React.useCallback(async () => {
    if (!canCalculate(data) || calculating) return;
    setCalculating(true);
    try {
      const input = buildFitInput(data);
      const id = crypto.randomUUID();
      const result = computeFit(input, new Date().toISOString());
      await createFit({
        id,
        name: defaultFitName(input.bikeType),
        input,
        result,
        saved: false,
      });
      await clearActiveDraft();
      const target = `/cycling/fit/${id}?reveal=1`;
      // Offline, a soft navigation would need an uncached RSC fetch. A hard
      // navigation lets the service worker serve the cached /fit/* shell, which
      // reads the id from the URL and loads the fit from storage (Flow 8).
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        window.location.assign(target);
      } else {
        router.push(target);
      }
    } catch {
      setCalculating(false);
    }
  }, [data, calculating, router]);

  const handleContinue = React.useCallback(() => {
    if (stepIndex === REVIEW_INDEX) {
      void handleCalculate();
      return;
    }
    // dataRef is fresh: clicking Continue blurred and committed any measurement
    // input first via MeasurementInput's synchronous onChange.
    if (isStepComplete(dataRef.current, stepIndex)) goNext();
  }, [stepIndex, goNext, handleCalculate]);

  const isChoiceStep = step.kind === "choice";
  const isFootStep = step.kind === "measurement" && step.key === "foot";
  const continueLabel =
    stepIndex === REVIEW_INDEX ? "Calculate my fit" : "Continue";
  // Choice steps disable Continue until a selection exists (no blur needed).
  // Measurement steps keep it enabled so the click can blur-and-commit first.
  const continueDisabled =
    stepIndex === REVIEW_INDEX
      ? calculating
      : isChoiceStep
        ? !complete
        : false;

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        handleContinue();
      }}
    >
      <StepProgress
        steps={[...STEP_TITLES]}
        currentIndex={stepIndex}
        onStepSelect={setStepIndex}
      />

      {/* Keyed on the step so each screen transitions in (200ms, §2.4);
          motion-safe only, so reduced-motion gets an instant swap. */}
      <div
        key={stepIndex}
        className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      >
      {step.kind === "review" ? (
        <ReviewStep
          data={data}
          unit={unit}
          headingRef={reviewHeadingRef}
          onEdit={setStepIndex}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <div>
            {step.kind === "measurement" ? (
              <StepGuide stepKey={step.key} />
            ) : (
              <StepIntro title={step.title} intro={step.intro} />
            )}
          </div>

          <div className="flex flex-col gap-4">
            {step.kind === "choice" ? (
              <OptionCards
                name={step.title}
                value={data[step.field]}
                onValueChange={(v) => setChoice(step.field, v)}
                options={OPTIONS_BY_FIELD[step.field]}
                autoFocus
              />
            ) : (
              <MeasurementStep
                key={step.key}
                stepKey={step.key}
                unit={unit}
                data={data}
                onChange={(r) => applyMeasurement(step.key, r)}
                onEnter={(r) => advanceMeasurement(step.key, r)}
              />
            )}
          </div>
        </div>
      )}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={stepIndex === 0}
          >
            <ArrowLeft />
            Back
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {isFootStep ? (
              <Button type="button" variant="ghost" onClick={skipFoot}>
                Skip this step
              </Button>
            ) : null}
            <Button type="submit" disabled={continueDisabled}>
              {continueLabel}
              {stepIndex === REVIEW_INDEX ? null : <ArrowRight />}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** The left-pane guide for a measurement step. */
function StepGuide({ stepKey }: { stepKey: MeasurementKey }) {
  const def = MEASUREMENTS[stepKey];
  const Illustration = MEASUREMENT_ILLUSTRATIONS[stepKey];
  return (
    <MeasureGuide
      title={`How to measure your ${def.label.toLowerCase()}`}
      illustration={<Illustration />}
      steps={def.steps}
      mistake={def.mistake}
    />
  );
}

/** One measurement question, wired to the wizard's stored value. */
function MeasurementStep({
  stepKey,
  unit,
  data,
  onChange,
  onEnter,
}: {
  stepKey: MeasurementKey;
  unit: ReturnType<typeof useUnit>["unit"];
  data: WizardData;
  onChange: (r: MeasurementResult) => void;
  onEnter: (r: MeasurementResult) => void;
}) {
  const def = MEASUREMENTS[stepKey];
  return (
    <>
      <MeasurementInput
        id={`wizard-${stepKey}`}
        label={def.label}
        unit={unit}
        minMm={def.minMm}
        maxMm={def.maxMm}
        valueMm={data.values[stepKey] ?? null}
        defaultConfirmed={data.cautions.includes(stepKey)}
        recheckHint={def.recheckHint}
        exampleMm={def.exampleMm}
        onChange={onChange}
        onEnter={onEnter}
        autoFocus
      />
      <p className="text-sm text-ink-muted">{def.howMeasured}</p>
      {def.optional ? (
        <p className="text-sm text-ink-muted">
          This step is optional. It adds cleat-position guidance.
        </p>
      ) : null}
    </>
  );
}

/** The review screen: every answer, each tappable to jump back and edit. */
function ReviewStep({
  data,
  unit,
  headingRef,
  onEdit,
}: {
  data: WizardData;
  unit: ReturnType<typeof useUnit>["unit"];
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onEdit: (index: number) => void;
}) {
  const rows = WIZARD_STEPS.flatMap((step, index) => {
    if (step.kind === "review") return [];
    if (step.kind === "choice") {
      const option = OPTIONS_BY_FIELD[step.field].find(
        (o) => o.value === data[step.field],
      );
      return [{ index, label: step.title, value: option?.label ?? "Not set" }];
    }
    const value = data.values[step.key];
    const skipped = step.key === "foot" && data.footSkipped;
    return [
      {
        index,
        label: MEASUREMENTS[step.key].label,
        value: skipped
          ? "Skipped"
          : value !== undefined
            ? formatMeasurementText(value, unit)
            : "Not set",
      },
    ];
  });

  const cautionLabels = data.cautions.map((k) => MEASUREMENTS[k].label);

  return (
    <section className="flex flex-col gap-4">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold text-ink outline-none"
      >
        Review your answers
      </h2>
      <p className="text-sm text-ink-muted">
        Tap any value to change it, then calculate your fit.
      </p>

      {cautionLabels.length > 0 ? <CautionBanner flags={cautionLabels} /> : null}

      <ul className="flex flex-col overflow-hidden rounded-md border border-line bg-surface">
        {rows.map((row) => (
          <li key={row.index} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => onEdit(row.index)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <span className="text-sm text-ink-muted">{row.label}</span>
              <span className="measurement text-sm font-medium text-ink">
                {row.value}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
