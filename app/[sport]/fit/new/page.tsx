import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MeasurementWizard } from "@/components/fit/measurement-wizard";

export const metadata: Metadata = { title: "New fit" };

// The measurement Quick Fit is a cycling (BikeFit) tool.
export default async function NewFitPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (sport !== "cycling") notFound();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="sr-only">New fit</h1>
      <p
        aria-hidden="true"
        className="measurement text-sm font-medium uppercase tracking-wide text-accent"
      >
        Measurement wizard
      </p>
      <MeasurementWizard />
    </div>
  );
}
