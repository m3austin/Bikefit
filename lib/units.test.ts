import { describe, expect, it } from "vitest";

import {
  cmToMm,
  fromMm,
  inToMm,
  isUnit,
  mmToCm,
  mmToIn,
  parseMeasurement,
  toMm,
  type Unit,
} from "@/lib/units";

describe("conversions", () => {
  it("converts cm and in to integer mm", () => {
    expect(cmToMm(72.4)).toBe(724);
    expect(cmToMm(0)).toBe(0);
    expect(inToMm(1)).toBe(25);
    expect(inToMm(28.5)).toBe(724);
  });

  it("converts mm back to display units (unrounded)", () => {
    expect(mmToCm(724)).toBeCloseTo(72.4, 10);
    expect(mmToIn(724)).toBeCloseTo(28.5039, 3);
  });

  it("toMm / fromMm respect the unit", () => {
    expect(toMm(72.4, "cm")).toBe(724);
    expect(toMm(28.5, "in")).toBe(724);
    expect(fromMm(724, "cm")).toBeCloseTo(72.4, 10);
  });

  it("isUnit guards values", () => {
    expect(isUnit("cm")).toBe(true);
    expect(isUnit("in")).toBe(true);
    expect(isUnit("mm")).toBe(false);
    expect(isUnit(undefined)).toBe(false);
  });
});

describe("round-trip through mm (exhaustive over the measurement domain)", () => {
  // Storage is integer mm; converting mm -> unit -> mm must recover exactly for
  // every value a body/fit measurement could take (0..3000 mm covers all).
  it("cm round-trips exactly for every mm 0..3000", () => {
    for (let mm = 0; mm <= 3000; mm++) {
      expect(cmToMm(mmToCm(mm))).toBe(mm);
    }
  });

  it("in round-trips exactly for every mm 0..3000", () => {
    for (let mm = 0; mm <= 3000; mm++) {
      expect(inToMm(mmToIn(mm))).toBe(mm);
    }
  });
});

describe("parseMeasurement", () => {
  const cases: Array<[string, Unit, number | null]> = [
    // Plain decimals in cm.
    ["72.5", "cm", 725],
    ["72", "cm", 720],
    ["0", "cm", 0],
    [".5", "cm", 5],
    ["  72.5  ", "cm", 725],
    // Comma decimal.
    ["72,5", "cm", 725],
    ["72,50", "cm", 725],
    // Explicit units override the display unit.
    ["72.5 cm", "in", 725],
    ["72.5cm", "in", 725],
    ["28 in", "cm", 711],
    ["28inch", "cm", 711],
    ["28 inches", "cm", 711],
    // Fractional inches.
    ["28 1/2 in", "cm", 724],
    ["28 1/2", "in", 724],
    ["28-1/2", "in", 724],
    ['28 1/2"', "cm", 724],
    ["1/2", "in", 13],
    // Value interpreted in the given display unit when no unit named.
    ["28.5", "in", 724],
    // Unparseable.
    ["", "cm", null],
    ["   ", "cm", null],
    ["abc", "cm", null],
    ["72.5.5", "cm", null],
    ["1/0", "in", null],
    ["cm", "cm", null],
  ];

  for (const [input, unit, expected] of cases) {
    it(`parses ${JSON.stringify(input)} (${unit}) -> ${expected}`, () => {
      expect(parseMeasurement(input, unit)).toBe(expected);
    });
  }

  it("parses cm input and round-trips back to the same displayed value", () => {
    for (let cm = 60; cm <= 100; cm += 0.5) {
      const mm = parseMeasurement(String(cm), "cm");
      expect(mm).toBe(Math.round(cm * 10));
    }
  });
});
