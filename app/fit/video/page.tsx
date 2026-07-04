import type { Metadata } from "next";

import { VideoAnalysis } from "@/components/fit/video-analysis";

export const metadata: Metadata = { title: "Video fit analysis" };

export default function VideoFitPage() {
  return <VideoAnalysis />;
}
