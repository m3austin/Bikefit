import type { Metadata } from "next";

import { MeasurementWizard } from "@/components/fit/measurement-wizard";

export const metadata: Metadata = { title: "New fit" };

export default function NewFitPage() {
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
