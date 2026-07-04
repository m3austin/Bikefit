import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdjustmentGuide } from "@/components/fit/adjustment-guide";
import { GolfDrillsGuide } from "@/components/golf/golf-drills";
import { RunDrillsGuide } from "@/components/running/run-drills";

export const metadata: Metadata = {
  title: "Drill guide",
  description:
    "Plain-language, step-by-step instructions for adjusting saddle height, setback, tilt, reach, bar height, and cleats. No experience needed.",
};

// Each sport's drill guide, dispatched on the registry slug.
export default async function DrillsPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (sport === "cycling") return <AdjustmentGuide />;
  if (sport === "golf") return <GolfDrillsGuide />;
  if (sport === "running") return <RunDrillsGuide />;
  notFound();
}
