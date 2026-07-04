/*
 * The SportModule descriptor (SportFits, docs/sportfit/01-Architecture.md).
 * Phase 0 keeps it deliberately small: identity, branding, and routing. It
 * grows per phase as modules gain tools (video views, analyzers, drills);
 * pure math stays in each module's own biomechanics/rules files, never here.
 */

export type SportSlug =
  | "cycling"
  | "golf"
  | "running"
  | "lifting"
  | "swimming";

export type SportModule = {
  slug: SportSlug;
  /** The module sub-brand, e.g. "BikeFit", "GolfFit" (doc 04). */
  brand: string;
  /** The plain sport word for copy, e.g. "cycling". */
  sport: string;
  /** Per-sport accent (doc 04); cycling keeps the shipped green. */
  accent: string;
  /** One-line hub card copy, playful register. */
  tagline: string;
  /** True until the module ships; hub shows a coming-soon card, no routes. */
  comingSoon?: boolean;
};
