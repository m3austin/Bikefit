import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "How it works" };

export default function MethodPage() {
  return (
    <PagePlaceholder
      eyebrow="Methodology"
      title="How BikeFit works"
      description="Each formula, where it comes from, what it is good at, and where it breaks. This page is the trust anchor, written like a knowledgeable friend rather than a paper."
      phase="Phase 6 target"
      cta={{ href: "/fit/new", label: "Start your fit" }}
    />
  );
}
