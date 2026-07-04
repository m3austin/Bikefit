import { CameraSetupDiagram, type CameraView } from "@/components/kernel/camera-setup";

// Dev-only: review every camera-setup diagram at once. Not linked in nav.
const VIEWS: CameraView[] = [
  "cycling-side",
  "cycling-front",
  "golf-dtl",
  "golf-face",
  "running-side",
  "running-rear",
  "lifting-side",
  "swimming-side",
];

export default function CameraPreviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Camera diagrams</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VIEWS.map((v) => (
          <CameraSetupDiagram key={v} view={v} />
        ))}
      </div>
    </div>
  );
}
