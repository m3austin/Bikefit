import Link from "next/link";
import { Footprints, Video, type LucideIcon } from "lucide-react";

/*
 * The RunFit home: the gait analysis and the drill guide (docs/sportfit/02
 * section 1). Mirrors the golf mode choice; plain links, no client state.
 */
const TOOLS: Array<{
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
}> = [
  {
    href: "/running/video",
    icon: Video,
    title: "Gait video analysis",
    body: "Film a short stretch of steady running, side on, and get your cadence, landing, posture, and bounce measured against sensible ranges.",
    meta: "A treadmill and a propped phone is the ideal setup",
  },
  {
    href: "/running/drills",
    icon: Footprints,
    title: "Drill guide",
    body: "Step-by-step practice for the common findings: cadence nudges, landing under your hips, posture resets, and hip strength.",
    meta: "No camera needed",
  },
];

export function RunHome() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          RunFit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Check your stride before your knees do
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          A camera, a treadmill, and a few honest numbers. This is a measuring
          tool and a starting nudge, not gait therapy; anything that hurts
          belongs with a physiotherapist.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex flex-col gap-4 rounded-md border border-line bg-surface p-6 transition-colors hover:border-accent hover:bg-surface-2"
          >
            <div className="grid size-11 place-items-center rounded-md bg-surface-2 text-accent group-hover:bg-bg">
              <tool.icon className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium text-ink">{tool.title}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                {tool.body}
              </p>
            </div>
            <p className="measurement text-xs font-medium uppercase tracking-wide text-ink-muted">
              {tool.meta}
            </p>
          </Link>
        ))}
      </div>
      <p className="text-sm text-ink-muted">
        Everything runs on your device. Your video is never uploaded anywhere.
      </p>
    </div>
  );
}
