import Link from "next/link";
import { Dumbbell, ShieldAlert } from "lucide-react";

import { LIFTS } from "@/lib/sports/lifting/lifts";

/*
 * The LiftFit home: pick a lift, or read the cues guide. The safety note is
 * not a footnote here (docs/sportfit/00 section 7): lifting carries the
 * highest injury stakes in the app, so the dead-serious register leads.
 */
export function LiftHome() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          LiftFit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Which lift are you filming?
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Film a set from the side and get a second pair of eyes on your form.
          Everything runs on your device; your video is never uploaded.
        </p>
      </div>

      <div
        role="note"
        aria-label="Safety"
        className="flex gap-3 rounded-md border border-warn/50 bg-warn/10 p-4"
      >
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden="true" />
        <p className="max-w-prose text-sm leading-relaxed text-ink">
          This is a measuring tool, not a spotter and not a coach. It cannot
          catch a failed rep. Lift within your limits, use safety pins or a
          spotter, and stop the moment anything hurts. For heavy or contest
          lifting, work with a qualified coach.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {LIFTS.map((lift) => (
          <Link
            key={lift.id}
            href={`/lifting/${lift.id}`}
            className="group flex flex-col gap-4 rounded-md border border-line bg-surface p-6 transition-colors hover:border-accent hover:bg-surface-2"
          >
            <div className="grid size-11 place-items-center rounded-md bg-surface-2 text-accent group-hover:bg-bg">
              <Dumbbell className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium text-ink">{lift.name}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                {lift.tagline}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-sm text-ink-muted">
        Want the practice cues first? The{" "}
        <Link
          href="/lifting/drills"
          className="text-accent underline underline-offset-2"
        >
          cues and drills guide
        </Link>{" "}
        walks through each fix step by step.
      </p>
    </div>
  );
}
