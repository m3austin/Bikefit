import Image from "next/image";
import Link from "next/link";
import { Camera, Ruler, Wrench } from "lucide-react";

import { LandingHero } from "@/components/fit/landing";
import { SupportFooterLink } from "@/components/fit/support-footer-link";
import { SPORTS } from "@/lib/sports/registry";

/*
 * The SportFits hub (docs/sportfit/05 Phase 1): pick your sport, understand
 * what this is and is not, and meet the maker. Playful register in the
 * chrome; the honesty block stays plain (doc 04). The hero is a client
 * island (welcome-back check); everything else server-renders.
 */

const STEPS = [
  {
    icon: Camera,
    title: "Film",
    body: "Point your phone at yourself doing the thing. A chair and ten seconds of honesty are plenty.",
  },
  {
    icon: Ruler,
    title: "Measure",
    body: "SportFits reads your angles and timing right on your device. Your video never leaves it.",
  },
  {
    icon: Wrench,
    title: "Adjust",
    body: "You get the one change worth trying first, with plain steps to make it. Then you go do the thing again.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      <LandingHero />

      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-ink">Pick your sport</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPORTS.map((sport) =>
            sport.comingSoon ? (
              <div
                key={sport.slug}
                className="flex flex-col gap-2 rounded-md border border-dashed border-line bg-surface p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="measurement text-lg font-semibold text-ink-muted">
                    {sport.brand}
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted">
                    Coming soon
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {sport.tagline}
                </p>
              </div>
            ) : (
              <Link
                key={sport.slug}
                href={`/${sport.slug}`}
                className="group flex flex-col gap-2 rounded-md border border-line bg-surface p-5 transition-colors hover:border-accent hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="measurement text-lg font-semibold text-ink">
                    {sport.brand}
                  </span>
                  <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-ink">
                    Live
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {sport.tagline}
                </p>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-ink">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="flex flex-col gap-3">
              <div className="grid size-11 place-items-center rounded-md bg-surface-2 text-accent">
                <step.icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="font-medium text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink-muted">
          Want the formulas and where they come from?{" "}
          <Link
            href="/method"
            className="text-accent underline underline-offset-2"
          >
            Read the method
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl font-semibold text-ink">
          What this is, and what it is not
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          SportFits is a measuring tool with good manners. It gives you honest
          numbers and a sensible starting change, for free, in plain language.
          It is not medical advice, and it is not a substitute for an
          in-person coach. If something hurts, stop and get real help.
        </p>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-ink-muted">
        <span className="flex items-center gap-2">
          <Image
            src="/marshmallow-labs.svg"
            alt="Marshmallow Labs"
            width={22}
            height={22}
            className="rounded-[5px]"
          />
          A Marshmallow Labs experiment. No tracking, no account required.
        </span>
        <span className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-ink"
          >
            Privacy
          </Link>
          <SupportFooterLink />
        </span>
      </footer>
    </div>
  );
}
