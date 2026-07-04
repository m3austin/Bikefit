import { LoadingCharacter } from "@/components/kernel/loading-character";
import { ANIMS } from "@/lib/loading/marshmallow-animations";

// Dev-only: every loading animation at once, to review motion and color.
// Not linked in nav. The live app picks one at random per load.
export default function LoadingGalleryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Loading animations</h1>
      <p className="text-sm text-ink-muted">
        All 18 loops. In the app one is picked at random per load; append
        <code className="measurement"> ?anim=&lt;key&gt;</code> to a loading
        screen to force one.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ANIMS.map((a) => (
          <div
            key={a.key}
            className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface p-3"
          >
            <div className="w-full rounded-md bg-surface-2 p-2">
              <LoadingCharacter animation={a.key} size={140} label={a.label} />
            </div>
            <span className="measurement text-xs text-ink-muted">
              {a.key} ({a.group})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
