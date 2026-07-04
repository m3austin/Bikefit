import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GolfVideoAnalysis } from "@/components/golf/golf-video-analysis";
import { RunVideoAnalysis } from "@/components/running/run-video-analysis";
import { VideoAnalysis } from "@/components/fit/video-analysis";

export const metadata: Metadata = { title: "Video analysis" };

export default async function VideoFitPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (sport === "cycling") return <VideoAnalysis />;
  if (sport === "golf") return <GolfVideoAnalysis />;
  if (sport === "running") return <RunVideoAnalysis />;
  notFound();
}
