import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PagePlaceholder
      eyebrow="Settings"
      title="Settings"
      description="Choose your units and theme, export or import your data as JSON, or erase everything. All settings are stored on this device."
      phase="Phase 5 target"
      cta={{ href: "/", label: "Back home" }}
    />
  );
}
