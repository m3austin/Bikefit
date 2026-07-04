/*
 * The SportModule descriptor (SportFits, docs/sportfit/01-Architecture.md).
 * Phase 0 keeps it deliberately small: identity, branding, and routing. It
 * grows per phase as modules gain tools (video views, analyzers, drills);
 * pure math stays in each module's own biomechanics/rules files, never here.
 */

import type { GlossaryId } from "@/lib/glossary";

export type SportSlug =
  | "cycling"
  | "golf"
  | "running"
  | "lifting"
  | "swimming";

/*
 * The shared drill shape (the sport's analogue of cycling's adjustment
 * guide entries). Each sport narrows the id to its own union so rule
 * `adjust` links stay typo-proof; the presentation layer only needs this
 * common shape.
 */
export type DrillDifficulty = "easy" | "moderate";

export type SportDrill<Id extends string = string> = {
  id: Id;
  title: string;
  /** Plain language: what this fixes and why it matters. */
  why: string;
  gear: string[];
  difficulty: DrillDifficulty;
  time: string;
  steps: string[];
  tips: string[];
  /** When self-coaching should hand over to a human. */
  coachNote: string;
  glossaryIds: GlossaryId[];
};

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
  /** Live but not yet validated on real footage; hub shows a Beta chip. */
  beta?: boolean;
  /** CSS class remapping --accent inside this sport's pages (globals.css). */
  accentClass?: string;
  /** The sport's own tools, shown in the header sub-bar while inside it.
   * Absolute hrefs; the sport brand links to the sport home separately. */
  tools?: ReadonlyArray<{ label: string; href: string }>;
};
