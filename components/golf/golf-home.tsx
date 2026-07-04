import Link from "next/link";
import { Club, Video, type LucideIcon } from "lucide-react";

/*
 * The GolfFit home: choose between the two tools (docs/sportfit/02 section
 * 3). Mirrors cycling's mode choice; plain links, no client state.
 */
const TOOLS: Array<{
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
}> = [
  {
    href: "/golf/video",
    icon: Video,
    title: "Swing video analysis",
    body: "Film a swing from down the line or face on, and get your tempo, posture, and turn measured against sensible ranges.",
    meta: "Needs one full swing on video",
  },
  {
    href: "/golf/clubs",
    icon: Club,
    title: "Club fitting starting points",
    body: "Two body measurements give you a sensible starting club length, plus plain-language primers on lie, grip, and flex.",
    meta: "No camera needed",
  },
];

export function GolfHome() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          GolfFit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          How do you want to work on your game?
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Both are free and honest about their limits. The video analysis is a
          measuring tool, not a lesson; the club numbers are starting points,
          not a fitting.
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
        Already know what to work on? The{" "}
        <Link
          href="/golf/drills"
          className="text-accent underline underline-offset-2"
        >
          drill guide
        </Link>{" "}
        has step-by-step practice for the common findings.
      </p>
    </div>
  );
}
