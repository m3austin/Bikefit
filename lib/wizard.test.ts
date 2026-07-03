import { describe, expect, it } from "vitest";

import {
  buildFitInput,
  canCalculate,
  defaultFitName,
  emptyWizardData,
  isStepComplete,
  REVIEW_INDEX,
  type WizardData,
} from "@/lib/wizard";

// Step indices (canonical order): 0 bike, 1 priority, 2 height, 3 inseam,
// 4 torso, 5 arm, 6 shoulder, 7 flexibility, 8 foot, 9 review.

function fullData(): WizardData {
  return {
    bikeType: "road",
    priority: "balanced",
    flexibility: "medium",
    values: {
      height: 1780,
      inseam: 820,
      torso: 600,
      arm: 640,
      shoulder: 420,
      foot: 275,
    },
    cautions: [],
    footSkipped: false,
  };
}

describe("emptyWizardData", () => {
  it("defaults priority to balanced and foot not skipped", () => {
    const d = emptyWizardData();
    expect(d.priority).toBe("balanced");
    expect(d.footSkipped).toBe(false);
    expect(d.values).toEqual({});
  });
});

describe("isStepComplete", () => {
  it("gates the bike-type step on a selection", () => {
    expect(isStepComplete(emptyWizardData(), 0)).toBe(false);
    expect(isStepComplete({ ...emptyWizardData(), bikeType: "gravel" }, 0)).toBe(true);
  });

  it("treats an in-range measurement as complete", () => {
    const d = { ...emptyWizardData(), values: { height: 1780 } };
    expect(isStepComplete(d, 2)).toBe(true);
  });

  it("treats an out-of-range measurement as incomplete until confirmed", () => {
    const challenged = { ...emptyWizardData(), values: { height: 1300 } };
    expect(isStepComplete(challenged, 2)).toBe(false);
    const confirmed = { ...challenged, cautions: ["height" as const] };
    expect(isStepComplete(confirmed, 2)).toBe(true);
  });

  it("lets the optional foot step complete by skipping or by a value", () => {
    expect(isStepComplete(emptyWizardData(), 8)).toBe(false);
    expect(isStepComplete({ ...emptyWizardData(), footSkipped: true }, 8)).toBe(true);
    expect(
      isStepComplete({ ...emptyWizardData(), values: { foot: 275 } }, 8),
    ).toBe(true);
  });

  it("always allows the review step", () => {
    expect(isStepComplete(emptyWizardData(), REVIEW_INDEX)).toBe(true);
  });
});

describe("canCalculate", () => {
  it("is false until every required step is answered", () => {
    expect(canCalculate(emptyWizardData())).toBe(false);
  });
  it("is true for a fully answered wizard", () => {
    expect(canCalculate(fullData())).toBe(true);
  });
  it("is true when foot is skipped", () => {
    const d = { ...fullData(), values: { ...fullData().values } };
    delete d.values.foot;
    d.footSkipped = true;
    expect(canCalculate(d)).toBe(true);
  });
});

describe("buildFitInput", () => {
  it("maps values to the engine input, including foot", () => {
    expect(buildFitInput(fullData())).toEqual({
      bikeType: "road",
      priority: "balanced",
      flexibility: "medium",
      measurements: {
        heightMm: 1780,
        inseamMm: 820,
        torsoMm: 600,
        armMm: 640,
        shoulderMm: 420,
        footMm: 275,
      },
    });
  });

  it("omits foot when skipped", () => {
    const d = fullData();
    delete d.values.foot;
    d.footSkipped = true;
    const input = buildFitInput(d);
    expect(input.measurements.footMm).toBeUndefined();
    expect("footMm" in input.measurements).toBe(false);
  });
});

describe("defaultFitName", () => {
  it("names a fit from its bike type", () => {
    expect(defaultFitName("road")).toBe("Road fit");
    expect(defaultFitName("mtb")).toBe("Mountain fit");
  });
});
