import { PagePlaceholder } from "@/components/page-placeholder";

export default function HomePage() {
  return (
    <PagePlaceholder
      eyebrow="BikeFit"
      title="A professional starting fit, from your own measurements."
      description="A free, local-first bike fit in about ten minutes. Nothing to install, no account required, and your measurements never leave this device unless you choose to sync."
      phase="Phase 0 shell"
      cta={{ href: "/fit/new", label: "Start your fit" }}
    />
  );
}
