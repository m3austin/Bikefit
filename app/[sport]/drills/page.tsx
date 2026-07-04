import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdjustmentGuide } from "@/components/fit/adjustment-guide";

export const metadata: Metadata = {
  title: "Adjustment guide",
  description:
    "Plain-language, step-by-step instructions for adjusting saddle height, setback, tilt, reach, bar height, and cleats. No experience needed.",
};

// The adjustment guide is cycling's drill guide (docs/sportfit/01-Architecture).
export default async function DrillsPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (sport !== "cycling") notFound();
  return <AdjustmentGuide />;
}
