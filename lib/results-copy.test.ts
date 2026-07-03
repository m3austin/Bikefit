import { describe, expect, it } from "vitest";

import { buildResultsCopy, DISCLAIMER, type CardCopy } from "@/lib/results-copy";
import { computeFit, type FitInput } from "@/lib/engine";

// Two representative fits: a drop-bar road fit with foot length, and an MTB fit
// without it, so the copy check covers every conditional card.
const ROAD: FitInput = {
  bikeType: "road",
  priority: "performance",
  flexibility: "high",
  measurements: {
    heightMm: 1780,
    inseamMm: 820,
    torsoMm: 600,
    armMm: 640,
    shoulderMm: 420,
    footMm: 275,
  },
};

const MTB: FitInput = {
  bikeType: "mtb",
  priority: "comfort",
  flexibility: "low",
  measurements: {
    heightMm: 1600,
    inseamMm: 700,
    torsoMm: 520,
    armMm: 560,
    shoulderMm: 380,
  },
};

function collectStrings(input: FitInput, unit: "cm" | "in"): string[] {
  const copy = buildResultsCopy({ result: computeFit(input), input, unit });
  const strings: string[] = [];
  const push = (card?: CardCopy) => {
    if (!card) return;
    strings.push(...card.applySteps, card.troubleshooting);
    if (card.method) strings.push(card.method);
  };
  push(copy.saddleHeight);
  push(copy.setback);
  push(copy.barDrop);
  push(copy.barWidth);
  push(copy.reach);
  push(copy.crank);
  push(copy.cleat);
  push(copy.frame);
  strings.push(...copy.keyInstructions);
  return strings;
}

const ALL_COPY = [
  ...collectStrings(ROAD, "cm"),
  ...collectStrings(ROAD, "in"),
  ...collectStrings(MTB, "cm"),
  DISCLAIMER,
];

// PRD §12 banned words (used to describe our own output).
const BANNED = [
  "prescription",
  "diagnosis",
  "guaranteed",
  "perfect",
  "professional-grade",
];

describe("results copy obeys PRD §12", () => {
  it("uses none of the banned words", () => {
    for (const text of ALL_COPY) {
      for (const word of BANNED) {
        expect(text.toLowerCase()).not.toContain(word);
      }
    }
  });

  it("contains no em dashes", () => {
    for (const text of ALL_COPY) {
      expect(text).not.toContain("—");
    }
  });

  it("has no exclamation marks in instructional copy", () => {
    for (const text of ALL_COPY) {
      expect(text).not.toContain("!");
    }
  });

  it("is the exact required disclaimer", () => {
    expect(DISCLAIMER).toContain("educated starting point");
    expect(DISCLAIMER).toContain("not medical advice");
    expect(DISCLAIMER).toContain("consult a professional");
  });
});

describe("results copy reflects the fit", () => {
  it("omits bar drop for mountain bikes and includes it for road", () => {
    const road = buildResultsCopy({
      result: computeFit(ROAD),
      input: ROAD,
      unit: "cm",
    });
    const mtb = buildResultsCopy({
      result: computeFit(MTB),
      input: MTB,
      unit: "cm",
    });
    expect(road.barDrop).toBeDefined();
    expect(mtb.barDrop).toBeUndefined();
    expect(road.cleat).toBeDefined(); // foot provided
    expect(mtb.cleat).toBeUndefined(); // foot omitted
  });
});
