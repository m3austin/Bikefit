import Link from "next/link";
import { Calculator, Ruler, Wrench } from "lucide-react";

import { LandingHero } from "@/components/fit/landing";
import { SupportFooterLink } from "@/components/fit/support-footer-link";

// The hero is a small client island (welcome-back check); everything else is
// server-rendered, so it ships no client JS (keeps landing JS lean, PRD §8).
const STEPS = [
  {
    icon: Ruler,
    title: "Measure",
    body: "Measure a few body dimensions with a tape and a book. The wizard shows you how.",
  },
  {
    icon: Calculator,
    title: "Calculate",
    body: "We turn them into saddle height, reach, bar width, and more, using published fitting methods.",
  },
  {
    icon: Wrench,
    title: "Apply",
    body: "Follow plain instructions and adjust to feel, a few millimetres at a time.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      <LandingHero />

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
          BikeFit is a calculator, not a fitter. It gives you a solid, safe
          starting point from published methods, expressed as honest ranges. It
          is not medical advice or a substitute for a professional bike fit. If
          something hurts, stop and get help.
        </p>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-ink-muted">
        <span>
          No tracking, no account required. Your data stays in this browser
          unless you export it. A Marshmallow Labs experiment.
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
