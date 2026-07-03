import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "New fit" };

export default function NewFitPage() {
  return (
    <PagePlaceholder
      eyebrow="Measurement wizard"
      title="New fit"
      description="A guided, one-question-per-screen wizard captures your body measurements and bike type, then hands them to the fit engine."
      phase="Phase 3 target"
      cta={{ href: "/", label: "Back home" }}
    />
  );
}
