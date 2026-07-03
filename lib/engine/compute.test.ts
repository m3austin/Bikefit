import { describe, expect, it } from "vitest";

import { computeFit, recommendCrankMm } from "@/lib/engine";
import type { FitInput, FitResult } from "@/lib/engine";

/*
 * GOLDEN SUITE (PRD §9). These values are hand-computed from the PRD §6
 * formulas; the comment above each case shows the arithmetic. Once blessed,
 * any change to an expected value must be justified in the PR description
 * (CLAUDE.md). Do not "fix" a failing golden by editing the expected number.
 *
 * Rounding is half-up (ties away from zero). computedAt is fixed to "" here
 * since the engine leaves it to the caller.
 *
 * See docs/engine-verification.md for the human-readable table.
 */

const GOLDENS: Array<{ name: string; input: FitInput; expected: FitResult }> = [
  {
    // P1 - M / road / balanced / medium / foot given / crank recommended
    // crank: inseam 820 in [810,859] -> 172.5
    // lemond 0.883*820 = 724.06 -> 724 ; hamley 1.09*820-172.5 = 721.3 -> 721
    // mean (724.06+721.3)/2 = 722.68 -> 723 ; +road 0 +balanced -1 = 722
    // setback 0.245*820-100 = 100.9 -> 101
    // frame road 0.665*820 = 545.3 -> 545 -> 54.5 cm
    // reach (600+640)/2+40 = 660 ; +balanced 0 = 660
    // barDrop medium balanced -> mid(30,60) = 45 ; barWidth round(420/20)*20 = 420
    name: "P1 road balanced medium",
    input: {
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
    },
    expected: {
      meta: { engineVersion: "1.0.0", computedAt: "", cautionFlags: [] },
      saddleHeight: {
        low: 716,
        high: 728,
        start: 722,
        methods: { lemond: 724, hamley: 721 },
      },
      saddleSetback: { low: 91, high: 111, start: 101 },
      frameSize: { roadCm: 54.5 },
      reachBand: { low: 645, high: 675, start: 660 },
      barDrop: { low: 30, high: 60, start: 45 },
      barWidthMm: 420,
      crankLengthMm: 172.5,
      cleat: { note: true },
    },
  },
  {
    // P2 - S / gravel / comfort / low / no foot / crank provided 170
    // lemond 0.883*700 = 618.1 -> 618 ; hamley 1.09*700-170 = 593 -> 593
    // mean (618.1+593)/2 = 605.55 -> 606 ; +gravel -2 +comfort -3 = 601
    // setback 0.245*700-100 = 71.5 -> 72 (half-up)
    // frame road(gravel) 0.665*700 = 465.5 -> 466 -> 46.6 cm
    // reach (520+560)/2+40 = 580 ; +comfort -10 = 570
    // barDrop low comfort -> band low 0 ; barWidth round(380/20)*20 = 380
    name: "P2 gravel comfort low (crank provided)",
    input: {
      bikeType: "gravel",
      priority: "comfort",
      flexibility: "low",
      measurements: {
        heightMm: 1600,
        inseamMm: 700,
        torsoMm: 520,
        armMm: 560,
        shoulderMm: 380,
      },
      crankLengthMm: 170,
    },
    expected: {
      meta: { engineVersion: "1.0.0", computedAt: "", cautionFlags: [] },
      saddleHeight: {
        low: 595,
        high: 607,
        start: 601,
        methods: { lemond: 618, hamley: 593 },
      },
      saddleSetback: { low: 62, high: 82, start: 72 },
      frameSize: { roadCm: 46.6 },
      reachBand: { low: 555, high: 585, start: 570 },
      barDrop: { low: 0, high: 30, start: 0 },
      barWidthMm: 380,
      crankLengthMm: 170,
    },
  },
  {
    // P3 - L / mtb / performance / high / foot given / crank recommended
    // crank: inseam 860 >= 860 -> 175
    // lemond 0.883*860 = 759.38 -> 759 ; hamley 1.09*860-175 = 762.4 -> 762
    // mean (759.38+762.4)/2 = 760.89 -> 761 ; +mtb -5 +performance 0 = 756
    // setback 0.245*860-100 = 110.7 -> 111
    // frame mtb 0.225*860 = 193.5 -> 194 -> 19.4 in
    // reach (640+680)/2+40 = 700 ; +performance +10 = 710
    // barDrop undefined (mtb) ; barWidth undefined (mtb)
    name: "P3 mtb performance high",
    input: {
      bikeType: "mtb",
      priority: "performance",
      flexibility: "high",
      measurements: {
        heightMm: 1850,
        inseamMm: 860,
        torsoMm: 640,
        armMm: 680,
        shoulderMm: 450,
        footMm: 290,
      },
    },
    expected: {
      meta: { engineVersion: "1.0.0", computedAt: "", cautionFlags: [] },
      saddleHeight: {
        low: 750,
        high: 762,
        start: 756,
        methods: { lemond: 759, hamley: 762 },
      },
      saddleSetback: { low: 101, high: 121, start: 111 },
      frameSize: { mtbInches: 19.4 },
      reachBand: { low: 695, high: 725, start: 710 },
      barDrop: undefined,
      barWidthMm: undefined,
      crankLengthMm: 175,
      cleat: { note: true },
    },
  },
  {
    // P4 - XL / hybrid / balanced / medium / no foot / crank recommended
    // crank: inseam 900 >= 860 -> 175
    // lemond 0.883*900 = 794.7 -> 795 ; hamley 1.09*900-175 = 806 -> 806
    // mean (794.7+806)/2 = 800.35 -> 800 ; +hybrid -5 +balanced -1 = 794
    // setback 0.245*900-100 = 120.5 -> 121 (half-up)
    // frame road(hybrid) 0.665*900 = 598.5 -> 599 -> 59.9 cm
    // reach (700+720)/2+40 = 750 ; +balanced 0 = 750
    // barDrop undefined (hybrid) ; barWidth undefined (hybrid)
    name: "P4 hybrid balanced medium",
    input: {
      bikeType: "hybrid",
      priority: "balanced",
      flexibility: "medium",
      measurements: {
        heightMm: 1950,
        inseamMm: 900,
        torsoMm: 700,
        armMm: 720,
        shoulderMm: 480,
      },
    },
    expected: {
      meta: { engineVersion: "1.0.0", computedAt: "", cautionFlags: [] },
      saddleHeight: {
        low: 788,
        high: 800,
        start: 794,
        methods: { lemond: 795, hamley: 806 },
      },
      saddleSetback: { low: 111, high: 131, start: 121 },
      frameSize: { roadCm: 59.9 },
      reachBand: { low: 735, high: 765, start: 750 },
      barDrop: undefined,
      barWidthMm: undefined,
      crankLengthMm: 175,
    },
  },
  {
    // P5 - S / road / performance / high / foot given / crank recommended
    // crank: inseam 740 < 750 -> 165
    // lemond 0.883*740 = 653.42 -> 653 ; hamley 1.09*740-165 = 641.6 -> 642
    // mean (653.42+641.6)/2 = 647.51 -> 648 ; +road 0 +performance 0 = 648
    // setback 0.245*740-100 = 81.3 -> 81
    // frame road 0.665*740 = 492.1 -> 492 -> 49.2 cm
    // reach (560+600)/2+40 = 620 ; +performance +10 = 630
    // barDrop high performance -> band high 100 ; barWidth round(400/20)*20 = 400
    name: "P5 road performance high",
    input: {
      bikeType: "road",
      priority: "performance",
      flexibility: "high",
      measurements: {
        heightMm: 1680,
        inseamMm: 740,
        torsoMm: 560,
        armMm: 600,
        shoulderMm: 400,
        footMm: 260,
      },
    },
    expected: {
      meta: { engineVersion: "1.0.0", computedAt: "", cautionFlags: [] },
      saddleHeight: {
        low: 642,
        high: 654,
        start: 648,
        methods: { lemond: 653, hamley: 642 },
      },
      saddleSetback: { low: 71, high: 91, start: 81 },
      frameSize: { roadCm: 49.2 },
      reachBand: { low: 615, high: 645, start: 630 },
      barDrop: { low: 60, high: 100, start: 100 },
      barWidthMm: 400,
      crankLengthMm: 165,
      cleat: { note: true },
    },
  },
  {
    // P6 - M / gravel / balanced / medium / no foot / crank recommended
    // crank: inseam 780 in [750,809] -> 170
    // lemond 0.883*780 = 688.74 -> 689 ; hamley 1.09*780-170 = 680.2 -> 680
    // mean (688.74+680.2)/2 = 684.47 -> 684 ; +gravel -2 +balanced -1 = 681
    // setback 0.245*780-100 = 91.1 -> 91
    // frame road(gravel) 0.665*780 = 518.7 -> 519 -> 51.9 cm
    // reach (580+620)/2+40 = 640 ; +balanced 0 = 640
    // barDrop medium balanced -> 45 ; barWidth round(410/20)*20 = round(20.5)=21 -> 420
    name: "P6 gravel balanced medium",
    input: {
      bikeType: "gravel",
      priority: "balanced",
      flexibility: "medium",
      measurements: {
        heightMm: 1720,
        inseamMm: 780,
        torsoMm: 580,
        armMm: 620,
        shoulderMm: 410,
      },
    },
    expected: {
      meta: { engineVersion: "1.0.0", computedAt: "", cautionFlags: [] },
      saddleHeight: {
        low: 675,
        high: 687,
        start: 681,
        methods: { lemond: 689, hamley: 680 },
      },
      saddleSetback: { low: 81, high: 101, start: 91 },
      frameSize: { roadCm: 51.9 },
      reachBand: { low: 625, high: 655, start: 640 },
      barDrop: { low: 30, high: 60, start: 45 },
      barWidthMm: 420,
      crankLengthMm: 170,
    },
  },
  {
    // P7 - CAUTION (above) / road / balanced / medium / foot given / crank rec
    // inseam 1050 > 1000 max -> caution { inseam, above }; crank 1050 >= 860 -> 175
    // lemond 0.883*1050 = 927.15 -> 927 ; hamley 1.09*1050-175 = 969.5 -> 970
    // mean (927.15+969.5)/2 = 948.325 -> 948 ; +road 0 +balanced -1 = 947
    // setback 0.245*1050-100 = 157.25 -> 157
    // frame road 0.665*1050 = 698.25 -> 698 -> 69.8 cm
    // reach (620+660)/2+40 = 680 ; +balanced 0 = 680
    // barDrop medium balanced -> 45 ; barWidth round(430/20)*20 = round(21.5)=22 -> 440
    name: "P7 caution above (inseam)",
    input: {
      bikeType: "road",
      priority: "balanced",
      flexibility: "medium",
      measurements: {
        heightMm: 1900,
        inseamMm: 1050,
        torsoMm: 620,
        armMm: 660,
        shoulderMm: 430,
        footMm: 280,
      },
    },
    expected: {
      meta: {
        engineVersion: "1.0.0",
        computedAt: "",
        cautionFlags: [{ input: "inseam", direction: "above" }],
      },
      saddleHeight: {
        low: 941,
        high: 953,
        start: 947,
        methods: { lemond: 927, hamley: 970 },
      },
      saddleSetback: { low: 147, high: 167, start: 157 },
      frameSize: { roadCm: 69.8 },
      reachBand: { low: 665, high: 695, start: 680 },
      barDrop: { low: 30, high: 60, start: 45 },
      barWidthMm: 440,
      crankLengthMm: 175,
      cleat: { note: true },
    },
  },
  {
    // P8 - CAUTION (below) / mtb / comfort / low / no foot / crank provided 165
    // inseam 580 < 600 min -> caution { inseam, below }
    // lemond 0.883*580 = 512.14 -> 512 ; hamley 1.09*580-165 = 467.2 -> 467
    // mean (512.14+467.2)/2 = 489.67 -> 490 ; +mtb -5 +comfort -3 = 482
    // setback 0.245*580-100 = 42.1 -> 42
    // frame mtb 0.225*580 = 130.5 -> 131 -> 13.1 in
    // reach (480+540)/2+40 = 550 ; +comfort -10 = 540
    // barDrop undefined (mtb) ; barWidth undefined (mtb)
    name: "P8 caution below (inseam), crank provided",
    input: {
      bikeType: "mtb",
      priority: "comfort",
      flexibility: "low",
      measurements: {
        heightMm: 1550,
        inseamMm: 580,
        torsoMm: 480,
        armMm: 540,
        shoulderMm: 350,
      },
      crankLengthMm: 165,
    },
    expected: {
      meta: {
        engineVersion: "1.0.0",
        computedAt: "",
        cautionFlags: [{ input: "inseam", direction: "below" }],
      },
      saddleHeight: {
        low: 476,
        high: 488,
        start: 482,
        methods: { lemond: 512, hamley: 467 },
      },
      saddleSetback: { low: 32, high: 52, start: 42 },
      frameSize: { mtbInches: 13.1 },
      reachBand: { low: 525, high: 555, start: 540 },
      barDrop: undefined,
      barWidthMm: undefined,
      crankLengthMm: 165,
    },
  },
];

describe("computeFit golden suite", () => {
  for (const golden of GOLDENS) {
    it(golden.name, () => {
      expect(computeFit(golden.input)).toEqual(golden.expected);
    });
  }
});

describe("engine details", () => {
  it("recommends crank length by inseam band (PRD §6.7)", () => {
    expect(recommendCrankMm(749)).toBe(165);
    expect(recommendCrankMm(750)).toBe(170);
    expect(recommendCrankMm(809)).toBe(170);
    expect(recommendCrankMm(810)).toBe(172.5);
    expect(recommendCrankMm(859)).toBe(172.5);
    expect(recommendCrankMm(860)).toBe(175);
    expect(recommendCrankMm(1050)).toBe(175);
  });

  it("passes the caller's computedAt through unchanged", () => {
    const result = computeFit(GOLDENS[0]!.input, "2026-07-03T00:00:00.000Z");
    expect(result.meta.computedAt).toBe("2026-07-03T00:00:00.000Z");
  });

  it("rounds negative intermediates away from zero (roundMm negative branch)", () => {
    // Absurdly small inseam (also flagged caution). Setback 0.245*350-100 = -14.25 -> -14.
    const result = computeFit({
      bikeType: "road",
      priority: "balanced",
      flexibility: "medium",
      measurements: {
        heightMm: 1450,
        inseamMm: 350,
        torsoMm: 520,
        armMm: 560,
        shoulderMm: 380,
      },
    });
    expect(result.saddleSetback.start).toBe(-14);
  });

  it("reports caution flags in measurement order", () => {
    const result = computeFit({
      bikeType: "road",
      priority: "balanced",
      flexibility: "medium",
      measurements: {
        heightMm: 1300, // below 1400
        inseamMm: 820,
        torsoMm: 800, // above 750
        armMm: 640,
        shoulderMm: 420,
        footMm: 400, // above 330
      },
    });
    expect(result.meta.cautionFlags).toEqual([
      { input: "height", direction: "below" },
      { input: "torso", direction: "above" },
      { input: "foot", direction: "above" },
    ]);
  });
});
