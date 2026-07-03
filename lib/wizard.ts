/*
 * Pure wizard configuration and helpers (no React). The step order is the
 * canonical Flow 1 / UX-UI-Design §4.2 order: bike type, priority, then the
 * body measurements, flexibility, the optional foot length, and review. Crank
 * length is not asked (the engine recommends it, PRD §6.7).
 */

import type {
  BikeType,
  FitInput,
  Flexibility,
  MeasurementKey,
  Priority,
} from "@/lib/engine";
import { MEASUREMENTS } from "@/lib/measurements";
import type { Option } from "@/components/fit/option-cards";

export type ChoiceField = "bikeType" | "priority" | "flexibility";

export type WizardStep =
  | { kind: "choice"; field: ChoiceField; title: string; intro: string }
  | { kind: "measurement"; key: MeasurementKey; title: string; optional?: boolean }
  | { kind: "review"; title: string };

export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    kind: "choice",
    field: "bikeType",
    title: "Bike type",
    intro:
      "Your bike type shifts the recommended saddle height and which guidance applies. Drop-bar bikes also get a handlebar-drop range.",
  },
  {
    kind: "choice",
    field: "priority",
    title: "Riding priority",
    intro:
      "This nudges the ranges toward comfort or performance. You can change it later by re-running your fit.",
  },
  { kind: "measurement", key: "height", title: "Height" },
  { kind: "measurement", key: "inseam", title: "Inseam" },
  { kind: "measurement", key: "torso", title: "Torso length" },
  { kind: "measurement", key: "arm", title: "Arm length" },
  { kind: "measurement", key: "shoulder", title: "Shoulder width" },
  {
    kind: "choice",
    field: "flexibility",
    title: "Flexibility",
    intro:
      "Flexibility sets your handlebar-drop range. Try the toe-touch test with straight legs and pick the closest match.",
  },
  { kind: "measurement", key: "foot", title: "Foot length", optional: true },
  { kind: "review", title: "Review" },
] as const;

export const STEP_TITLES: readonly string[] = WIZARD_STEPS.map((s) => s.title);

export const REVIEW_INDEX = WIZARD_STEPS.length - 1;

export const BIKE_OPTIONS: ReadonlyArray<Option<BikeType>> = [
  { value: "road", label: "Road", description: "Drop bars, paved riding." },
  { value: "gravel", label: "Gravel", description: "Drop bars, mixed surfaces." },
  { value: "mtb", label: "Mountain", description: "Flat bars, off-road (XC and trail)." },
  { value: "hybrid", label: "Hybrid or commuter", description: "Flat bars, fitness and getting around." },
];

export const PRIORITY_OPTIONS: ReadonlyArray<Option<Priority>> = [
  { value: "comfort", label: "Comfort", description: "A more upright, relaxed position." },
  { value: "balanced", label: "Balanced", description: "A versatile position for most riding." },
  { value: "performance", label: "Performance", description: "A lower, more aggressive position." },
];

export const FLEX_OPTIONS: ReadonlyArray<Option<Flexibility>> = [
  { value: "high", label: "Palms flat on the floor", description: "With straight legs, your palms rest flat on the floor." },
  { value: "medium", label: "Fingertips reach your toes", description: "You can touch your toes but not much further." },
  { value: "low", label: "You cannot reach your toes", description: "Your hands stop above your toes." },
];

export const OPTIONS_BY_FIELD = {
  bikeType: BIKE_OPTIONS,
  priority: PRIORITY_OPTIONS,
  flexibility: FLEX_OPTIONS,
} as const;

/** The working shape the wizard holds while the rider answers questions. */
export type WizardData = {
  bikeType?: BikeType;
  priority?: Priority;
  flexibility?: Flexibility;
  values: Partial<Record<MeasurementKey, number>>;
  cautions: MeasurementKey[];
  footSkipped: boolean;
};

export function emptyWizardData(): WizardData {
  return {
    priority: "balanced", // sensible default (PRD §5)
    values: {},
    cautions: [],
    footSkipped: false,
  };
}

function measurementComplete(data: WizardData, key: MeasurementKey): boolean {
  const value = data.values[key];
  if (value === undefined) return false;
  const def = MEASUREMENTS[key];
  const inRange = value >= def.minMm && value <= def.maxMm;
  return inRange || data.cautions.includes(key);
}

/** Whether the given step has enough input to continue. */
export function isStepComplete(data: WizardData, index: number): boolean {
  const step = WIZARD_STEPS[index];
  if (!step) return false;
  switch (step.kind) {
    case "choice":
      return data[step.field] !== undefined;
    case "measurement":
      if (step.optional) {
        return data.footSkipped || measurementComplete(data, step.key);
      }
      return measurementComplete(data, step.key);
    case "review":
      return true;
  }
}

/** Every required step answered, so the fit can be computed. */
export function canCalculate(data: WizardData): boolean {
  return WIZARD_STEPS.every((_, i) => isStepComplete(data, i));
}

/** Build the engine input once all required steps are complete. */
export function buildFitInput(data: WizardData): FitInput {
  const m = data.values;
  const measurements: FitInput["measurements"] = {
    heightMm: m.height!,
    inseamMm: m.inseam!,
    torsoMm: m.torso!,
    armMm: m.arm!,
    shoulderMm: m.shoulder!,
  };
  if (!data.footSkipped && m.foot !== undefined) {
    measurements.footMm = m.foot;
  }
  return {
    bikeType: data.bikeType!,
    priority: data.priority!,
    flexibility: data.flexibility!,
    measurements,
  };
}

/** Default name for a freshly computed fit (Flow 3 name dialog prefills this). */
export function defaultFitName(bikeType: BikeType): string {
  const label = BIKE_OPTIONS.find((o) => o.value === bikeType)?.label ?? "Bike";
  return `${label} fit`;
}
