import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FitModeChoice } from "@/components/fit/mode-choice";
import { getLiveSport } from "@/lib/sports/registry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport } = await params;
  return { title: getLiveSport(sport)?.brand ?? "SportFits" };
}

// Each live module's home. Phase 0 has one module; future sports dispatch on
// the slug here (docs/sportfit/05-Build-Plan.md).
export default async function SportHomePage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (sport !== "cycling") notFound();
  return <FitModeChoice />;
}
