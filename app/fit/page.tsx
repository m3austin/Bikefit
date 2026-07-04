import type { Metadata } from "next";

import { FitModeChoice } from "@/components/fit/mode-choice";

export const metadata: Metadata = { title: "New fit" };

export default function FitChoicePage() {
  return <FitModeChoice />;
}
