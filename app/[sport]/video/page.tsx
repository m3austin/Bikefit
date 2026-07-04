import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VideoAnalysis } from "@/components/fit/video-analysis";

export const metadata: Metadata = { title: "Video fit analysis" };

export default async function VideoFitPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (sport !== "cycling") notFound();
  return <VideoAnalysis />;
}
