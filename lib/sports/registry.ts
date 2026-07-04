/*
 * The sport registry (SportFits, docs/sportfit/01-Architecture.md): the one
 * list every hub card, route guard, and future directory filter reads.
 * Adding a sport is adding a module folder and one entry here; the kernel
 * never changes for it.
 */

import type { SportModule, SportSlug } from "@/lib/sports/types";

export const SPORTS: readonly SportModule[] = [
  {
    slug: "cycling",
    brand: "BikeFit",
    sport: "cycling",
    accent: "#3DDC97",
    tagline: "Dial in your bike so the miles feel easy.",
  },
  {
    slug: "golf",
    brand: "GolfFit",
    sport: "golf",
    accent: "#2AB8B8",
    tagline: "Your swing, measured. Your excuses, filmed.",
    comingSoon: true,
  },
  {
    slug: "running",
    brand: "RunFit",
    sport: "running",
    accent: "#FF8A5C",
    tagline: "Check your stride before your knees do.",
    comingSoon: true,
  },
  {
    slug: "lifting",
    brand: "LiftFit",
    sport: "lifting",
    accent: "#E8B34B",
    tagline: "Bench, squat, deadlift, with a second pair of eyes.",
    comingSoon: true,
  },
  {
    slug: "swimming",
    brand: "SwimFit",
    sport: "swimming",
    accent: "#4BA3E8",
    tagline: "Front crawl feedback, no coach on the deck required.",
    comingSoon: true,
  },
];

/** Modules with routes (not coming-soon). */
export const LIVE_SPORTS: readonly SportModule[] = SPORTS.filter(
  (s) => !s.comingSoon,
);

export function getSport(slug: string): SportModule | undefined {
  return SPORTS.find((s) => s.slug === slug);
}

export function getLiveSport(slug: string): SportModule | undefined {
  return LIVE_SPORTS.find((s) => s.slug === slug);
}

export function isSportSlug(slug: string): slug is SportSlug {
  return SPORTS.some((s) => s.slug === slug);
}
