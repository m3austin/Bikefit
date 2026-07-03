/*
 * The body-measurement catalog: the single source for each measurement's label,
 * plausible range (PRD §5, stored in mm), how-to guidance, and the copy shown
 * when a value is unusual. Ranges are challenged, never hard-blocked (Flow 2).
 * Reused by MeasurementInput, MeasureGuide, and the wizard.
 */

export type MeasurementKey =
  | "height"
  | "inseam"
  | "torso"
  | "arm"
  | "shoulder"
  | "foot";

export type MeasurementDef = {
  key: MeasurementKey;
  label: string;
  /** Plausible range in mm (PRD §5). Outside this range triggers a challenge. */
  minMm: number;
  maxMm: number;
  optional?: boolean;
  /** One-line summary of how it is measured. */
  howMeasured: string;
  /** Numbered how-to steps for MeasureGuide. */
  steps: string[];
  /** The common mistake to avoid. */
  mistake: string;
  /** Shown in the challenge state to help the rider re-check an unusual value. */
  recheckHint: string;
  /** A typical value in mm, used to build a worked example hint. */
  exampleMm: number;
};

export const MEASUREMENTS: Record<MeasurementKey, MeasurementDef> = {
  height: {
    key: "height",
    label: "Height",
    minMm: 1400,
    maxMm: 2100,
    howMeasured: "Standing tall and barefoot, floor to the top of your head.",
    steps: [
      "Stand barefoot with your back to a wall, heels together.",
      "Keep your head level, looking straight ahead.",
      "Mark the wall at the top of your head and measure to the floor.",
    ],
    mistake: "Looking up or down tilts the head and adds or loses a centimetre.",
    recheckHint: "Measure to the crown of your head with your eyes level.",
    exampleMm: 1750,
  },
  inseam: {
    key: "inseam",
    label: "Inseam",
    minMm: 600,
    maxMm: 1000,
    howMeasured: "Barefoot, a book snug against your crotch, floor to the spine.",
    steps: [
      "Stand barefoot with your back against a wall.",
      "Pull a hardback book up snug against your crotch, spine level.",
      "Measure from the floor to the top of the book spine.",
    ],
    mistake: "A book held loosely reads short. Snug against the saddle area.",
    recheckHint: "The book should be snug against your saddle area.",
    exampleMm: 820,
  },
  torso: {
    key: "torso",
    label: "Torso length",
    minMm: 450,
    maxMm: 750,
    howMeasured: "From the sternal notch down to a pubic-bone reference point.",
    steps: [
      "Find the sternal notch, the dip at the base of your throat.",
      "Find the pubic-bone reference point at the front of your hips.",
      "Measure the straight-line distance between the two.",
    ],
    mistake: "Following the curve of the belly overstates the length.",
    recheckHint: "Measure a straight line, not along the curve of the body.",
    exampleMm: 600,
  },
  arm: {
    key: "arm",
    label: "Arm length",
    minMm: 500,
    maxMm: 800,
    howMeasured: "From the shoulder bone tip (acromion) to the wrist crease.",
    steps: [
      "Let your arm hang relaxed at your side.",
      "Find the acromion, the bony tip at the top of your shoulder.",
      "Measure down the outside of the arm to the wrist crease.",
    ],
    mistake: "A bent elbow shortens the reading. Keep the arm relaxed and straight.",
    recheckHint: "Measure with the arm relaxed and straight, not bent.",
    exampleMm: 640,
  },
  shoulder: {
    key: "shoulder",
    label: "Shoulder width",
    minMm: 320,
    maxMm: 500,
    howMeasured: "Across the back, from one shoulder bone tip to the other.",
    steps: [
      "Find the bony tip (acromion) on each shoulder.",
      "Measure across your back in a straight line between them.",
      "Ask someone to help so the tape stays level.",
    ],
    mistake: "Measuring across the front rounds the shoulders and reads narrow.",
    recheckHint: "Measure across the back between the shoulder bone tips.",
    exampleMm: 420,
  },
  foot: {
    key: "foot",
    label: "Foot length",
    minMm: 220,
    maxMm: 330,
    optional: true,
    howMeasured: "Barefoot, heel against a wall, to the tip of the longest toe.",
    steps: [
      "Stand barefoot with your heel against a wall.",
      "Mark the floor at the tip of your longest toe.",
      "Measure from the wall to the mark.",
    ],
    mistake: "The longest toe is not always the big toe. Use whichever is longest.",
    recheckHint: "Measure to your longest toe, which may not be the big toe.",
    exampleMm: 275,
  },
};

/** Whether a stored mm value sits inside a measurement's plausible range. */
export function isPlausible(mm: number, def: MeasurementDef): boolean {
  return mm >= def.minMm && mm <= def.maxMm;
}
