import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiftVideoAnalysis } from "@/components/lifting/lift-video-analysis";
import { LIFTS, getLift } from "@/lib/sports/lifting/lifts";

/*
 * A single lift's form analysis (LiftFit only): /lifting/squat, /bench,
 * /deadlift. A lift is a config entry, so this page reads the registry and
 * never names a lift itself. The dynamic [lift] segment sits alongside the
 * static clubs/video/drills/fit segments, which take priority, so it only
 * ever resolves lift ids under the lifting slug.
 */

export function generateStaticParams() {
  return LIFTS.map((lift) => ({ sport: "lifting", lift: lift.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string; lift: string }>;
}): Promise<Metadata> {
  const { sport, lift } = await params;
  if (sport !== "lifting") return {};
  const config = getLift(lift);
  return { title: config ? `${config.name} analysis` : "LiftFit" };
}

export default async function LiftPage({
  params,
}: {
  params: Promise<{ sport: string; lift: string }>;
}) {
  const { sport, lift } = await params;
  if (sport !== "lifting") notFound();
  const config = getLift(lift);
  if (!config) notFound();
  return <LiftVideoAnalysis liftId={config.id} />;
}
