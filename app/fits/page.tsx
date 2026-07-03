import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "Saved fits" };

export default function SavedFitsPage() {
  return (
    <PagePlaceholder
      eyebrow="Garage"
      title="Saved fits"
      description="Your saved fits live here, stored locally in this browser. Open, rename, duplicate, or delete them. Every fit keeps a snapshot of its inputs and results."
      phase="Phase 5 target"
      cta={{ href: "/fit/new", label: "Start a new fit" }}
    />
  );
}
