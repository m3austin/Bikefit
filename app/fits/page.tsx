import type { Metadata } from "next";

import { SavedFits } from "@/components/fit/saved-fits";

export const metadata: Metadata = { title: "Saved fits" };

export default function SavedFitsPage() {
  return <SavedFits />;
}
