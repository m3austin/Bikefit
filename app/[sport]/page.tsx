import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FitModeChoice } from "@/components/fit/mode-choice";
import { GolfHome } from "@/components/golf/golf-home";
import { getLiveSport } from "@/lib/sports/registry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport } = await params;
  return { title: getLiveSport(sport)?.brand ?? "SportFits" };
}

// Each live module's home, dispatched on the registry slug.
export default async function SportHomePage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (sport === "cycling") return <FitModeChoice />;
  if (sport === "golf") return <GolfHome />;
  notFound();
}
