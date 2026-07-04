import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClubfitCalculator } from "@/components/golf/clubfit-calculator";

export const metadata: Metadata = {
  title: "Club fitting starting points",
  description:
    "Two body measurements give a sensible starting club length, plus plain-language primers on lie angle, grip size, and shaft flex.",
};

// Club fitting info is a GolfFit tool (docs/sportfit/02 section 3).
export default async function ClubsPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (sport !== "golf") notFound();
  return <ClubfitCalculator />;
}
