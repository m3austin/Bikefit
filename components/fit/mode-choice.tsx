import Link from "next/link";
import { Ruler, Video, type LucideIcon } from "lucide-react";

/*
 * The Quick Fit / Video Fit Analysis chooser (/fit). Plain links, no client
 * state, so it costs nothing beyond the landing's existing JS budget (PRD §8).
 */
const MODES: Array<{
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
}> = [
  {
    href: "/fit/new",
    icon: Ruler,
    title: "Quick Fit",
    body: "Answer a few questions and measure with a tape and a book. About ten minutes, works everywhere.",
    meta: "No camera needed",
  },
  {
    href: "/fit/video",
    icon: Video,
    title: "Video Fit Analysis",
    body: "Record yourself pedaling on a trainer and get joint-angle measurements from the side. Add an optional straight-on video for knee tracking and left-right symmetry.",
    meta: "Needs a side-view video",
  },
];

export function FitModeChoice() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          How do you want to fit your bike?
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Both give you a real starting point. Video Fit Analysis adds
          joint-angle checks from actual pedaling, on top of what Quick Fit
          already covers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {MODES.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className="group flex flex-col gap-4 rounded-md border border-line bg-surface p-6 transition-colors hover:border-accent hover:bg-surface-2"
          >
            <div className="grid size-11 place-items-center rounded-md bg-surface-2 text-accent group-hover:bg-bg">
              <mode.icon className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium text-ink">{mode.title}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                {mode.body}
              </p>
            </div>
            <p className="measurement text-xs font-medium uppercase tracking-wide text-ink-muted">
              {mode.meta}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
