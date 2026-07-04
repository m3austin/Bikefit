import Link from "next/link";
import { Video, Waves, type LucideIcon } from "lucide-react";

import { SwimBetaNote } from "@/components/swimming/swim-beta-note";

/*
 * The SwimFit home: the stroke analysis and the drill guide (docs/sportfit/
 * 02 section 4). Leads with the beta note; plain links, no client state.
 */
const TOOLS: Array<{
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
}> = [
  {
    href: "/swimming/video",
    icon: Video,
    title: "Stroke video analysis",
    body: "Film a few front-crawl strokes from the pool deck, side on, and get your stroke rate, head position, and recovery read against sensible ranges.",
    meta: "Above-water, side-on footage only",
  },
  {
    href: "/swimming/drills",
    icon: Waves,
    title: "Drill guide",
    body: "Step-by-step practice for the common findings: head position, high-elbow recovery, body roll, and lengthening the stroke.",
    meta: "No camera needed",
  },
];

export function SwimHome() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          SwimFit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Front crawl, read from the deck
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          A side-on camera and a few clean strokes. This is a measuring tool
          and a starting nudge, not coaching. Everything runs on your device;
          your video is never uploaded.
        </p>
      </div>

      <SwimBetaNote />

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
    </div>
  );
}
