/*
 * Weighted selection of which loading animation shows on each load.
 *
 * The 15 common animations (science, comedy, cozy, playful) share the bulk of
 * the probability roughly evenly; each of the 3 rare easter eggs is a rare
 * treat at RARE_PROBABILITY_EACH. Rares are only eligible when the load is
 * expected to run long enough to actually see one; for short loads we always
 * pick from the common pool so a rare never flashes by unseen.
 *
 * Pure and rng-injectable, so the weighting is unit-testable.
 */

import { ANIMATION_KEYS, ANIMS, type AnimationKey } from "./marshmallow-animations";

/** Below this expected duration, never roll a rare (it would flash by). */
export const RARE_MIN_DURATION_MS = 2000;

/** Each rare animation's individual probability when rares are eligible. */
export const RARE_PROBABILITY_EACH = 0.04;

/** A safe default if the pools were ever empty (they are not). */
const FALLBACK: AnimationKey = "stir";

const COMMON_KEYS: AnimationKey[] = ANIMS.filter((a) => a.group !== "rare").map(
  (a) => a.key,
);
const RARE_KEYS: AnimationKey[] = ANIMS.filter((a) => a.group === "rare").map(
  (a) => a.key,
);

export type PickOptions = {
  /** How long the load is expected to run. Rares need this >= the threshold. */
  expectedDurationMs?: number;
  /** Injectable randomness in [0, 1); defaults to Math.random. */
  rng?: () => number;
  /** Force a specific animation (testing / explicit override). Wins outright. */
  force?: AnimationKey;
};

/**
 * Pick an animation key. Rares are eligible only when the expected duration
 * clears RARE_MIN_DURATION_MS; then each rare has RARE_PROBABILITY_EACH odds
 * and the commons split the rest evenly. Otherwise a common is chosen
 * uniformly.
 */
export function pickAnimationKey(opts: PickOptions = {}): AnimationKey {
  if (opts.force) return opts.force;

  const rng = opts.rng ?? Math.random;
  const expected = opts.expectedDurationMs ?? Infinity;
  const rareEligible =
    RARE_KEYS.length > 0 && expected >= RARE_MIN_DURATION_MS;

  const r = Math.min(0.999999999, Math.max(0, rng()));

  // r is clamped below 1, so each floor(index) is provably in range; the
  // ?? FALLBACK only guards the empty-pool impossibility.
  if (rareEligible) {
    const rareTotal = RARE_PROBABILITY_EACH * RARE_KEYS.length;
    if (r < rareTotal) {
      return RARE_KEYS[Math.floor(r / RARE_PROBABILITY_EACH)] ?? FALLBACK;
    }
    // Remaining mass is the common pool, split evenly.
    const commonR = (r - rareTotal) / (1 - rareTotal);
    return COMMON_KEYS[Math.floor(commonR * COMMON_KEYS.length)] ?? FALLBACK;
  }

  return COMMON_KEYS[Math.floor(r * COMMON_KEYS.length)] ?? FALLBACK;
}

/** True when `value` is a real animation key (validating a forced choice). */
export function isAnimationKey(value: string | null | undefined): value is AnimationKey {
  return value != null && (ANIMATION_KEYS as readonly string[]).includes(value);
}

/**
 * A forced animation from a URL query string, for testing (e.g. `?anim=golden`
 * or `?loading=rainbow`). Returns undefined when absent or unrecognized.
 */
export function forcedAnimationFromQuery(
  search: string | undefined,
): AnimationKey | undefined {
  if (!search) return undefined;
  const params = new URLSearchParams(search);
  const raw = params.get("anim") ?? params.get("loading");
  return isAnimationKey(raw) ? raw : undefined;
}
