import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "Your fit" };

export default async function FitResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PagePlaceholder
      eyebrow="Results"
      title="Your fit sheet"
      description={`The results page renders every fit output as an honest range with a recommended starting point. Requested fit id: ${id}.`}
      phase="Phase 4 target"
      cta={{ href: "/fits", label: "Saved fits" }}
    />
  );
}
