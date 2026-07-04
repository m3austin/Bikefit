import type { Metadata } from "next";

import { AdjustmentGuide } from "@/components/fit/adjustment-guide";

export const metadata: Metadata = {
  title: "Adjustment guide",
  description:
    "Plain-language, step-by-step instructions for adjusting saddle height, setback, tilt, reach, bar height, and cleats. No experience needed.",
};

export default function AdjustPage() {
  return <AdjustmentGuide />;
}
