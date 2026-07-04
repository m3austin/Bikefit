import { describe, expect, it } from "vitest";

import { ANIMS, type AnimationKey } from "@/lib/loading/marshmallow-animations";
import {
  RARE_MIN_DURATION_MS,
  RARE_PROBABILITY_EACH,
  forcedAnimationFromQuery,
  isAnimationKey,
  pickAnimationKey,
} from "@/lib/loading/pick-animation";

const RARE = ANIMS.filter((a) => a.group === "rare").map((a) => a.key);
const COMMON = ANIMS.filter((a) => a.group !== "rare").map((a) => a.key);
const groupOf = (key: AnimationKey) =>
  ANIMS.find((a) => a.key === key)?.group ?? "science";

describe("pickAnimationKey", () => {
  it("force wins outright, even below the rare threshold", () => {
    expect(pickAnimationKey({ force: "golden", expectedDurationMs: 0 })).toBe(
      "golden",
    );
  });

  it("never rolls a rare when the load is too short", () => {
    // Even with rng at the very bottom (where rares live), a short load stays common.
    for (const r of [0, 0.001, 0.05, 0.11, 0.5, 0.99]) {
      const key = pickAnimationKey({
        expectedDurationMs: RARE_MIN_DURATION_MS - 1,
        rng: () => r,
      });
      expect(groupOf(key)).not.toBe("rare");
    }
  });

  it("maps the bottom of the range to the rares when eligible", () => {
    // r in [0, 0.12) hits the three rares at 0.04 each.
    expect(pickAnimationKey({ expectedDurationMs: 8000, rng: () => 0.0 })).toBe(
      RARE[0],
    );
    expect(pickAnimationKey({ expectedDurationMs: 8000, rng: () => 0.05 })).toBe(
      RARE[1],
    );
    expect(pickAnimationKey({ expectedDurationMs: 8000, rng: () => 0.09 })).toBe(
      RARE[2],
    );
  });

  it("maps the rest of the range to the common pool", () => {
    const key = pickAnimationKey({ expectedDurationMs: 8000, rng: () => 0.5 });
    expect(groupOf(key)).not.toBe("rare");
    expect(COMMON).toContain(key);
  });

  it("gives rares roughly RARE_PROBABILITY_EACH and commons the rest", () => {
    const N = 60000;
    const counts = new Map<AnimationKey, number>();
    // A uniform sweep of rng across [0,1) approximates the distribution.
    for (let i = 0; i < N; i++) {
      const key = pickAnimationKey({
        expectedDurationMs: 8000,
        rng: () => (i + 0.5) / N,
      });
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // Each rare sits near 4%.
    for (const k of RARE) {
      expect((counts.get(k) ?? 0) / N).toBeCloseTo(RARE_PROBABILITY_EACH, 2);
    }
    // Total rare share near 12%, so common share near 88%.
    const rareShare = RARE.reduce((s, k) => s + (counts.get(k) ?? 0), 0) / N;
    expect(rareShare).toBeCloseTo(RARE_PROBABILITY_EACH * RARE.length, 2);
    // Each common is far more likely than any single rare.
    for (const k of COMMON) {
      expect(counts.get(k) ?? 0).toBeGreaterThan((counts.get(RARE[0]!) ?? 0));
    }
  });

  it("covers every common key across the range when short", () => {
    const seen = new Set<AnimationKey>();
    for (let i = 0; i < COMMON.length * 4; i++) {
      seen.add(
        pickAnimationKey({ expectedDurationMs: 0, rng: () => i / (COMMON.length * 4) }),
      );
    }
    expect(seen.size).toBe(COMMON.length);
  });
});

describe("isAnimationKey", () => {
  it("accepts real keys and rejects the rest", () => {
    expect(isAnimationKey("rainbow")).toBe(true);
    expect(isAnimationKey("nope")).toBe(false);
    expect(isAnimationKey(null)).toBe(false);
    expect(isAnimationKey(undefined)).toBe(false);
  });
});

describe("forcedAnimationFromQuery", () => {
  it("reads ?anim= and ?loading=", () => {
    expect(forcedAnimationFromQuery("?anim=golden")).toBe("golden");
    expect(forcedAnimationFromQuery("?loading=rainbow")).toBe("rainbow");
  });
  it("ignores missing or unknown values", () => {
    expect(forcedAnimationFromQuery("")).toBeUndefined();
    expect(forcedAnimationFromQuery("?anim=banana")).toBeUndefined();
    expect(forcedAnimationFromQuery(undefined)).toBeUndefined();
  });
});
