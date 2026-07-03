"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Calculator, Ruler, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FitSummaryCard } from "@/components/fit/fit-summary-card";
import { useUnit } from "@/components/unit-provider";
import { isPersistenceAvailable, listSavedFits, type StoredFit } from "@/lib/db";

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

export function Landing() {
  const router = useRouter();
  const { unit } = useUnit();
  const [loaded, setLoaded] = React.useState(false);
  const [fits, setFits] = React.useState<StoredFit[]>([]);

  React.useEffect(() => {
    let active = true;
    async function load() {
      if (!isPersistenceAvailable()) {
        if (active) setLoaded(true);
        return;
      }
      try {
        const saved = await listSavedFits();
        if (active) setFits(saved);
      } catch {
        // Landing still works without the garage; fall through to the hero.
      }
      if (active) setLoaded(true);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-16">
      {!loaded ? (
        <div className="h-64 rounded-lg bg-surface" aria-hidden="true" />
      ) : fits.length > 0 ? (
        <WelcomeBack fits={fits} unit={unit} onOpen={(id) => router.push(`/fit/${id}`)} />
      ) : (
        <Hero />
      )}

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
          <Link href="/method" className="text-accent hover:underline">
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

      <footer className="border-t border-line pt-6 text-sm text-ink-muted">
        No cookies, no tracking, no account. Your data stays in this browser
        unless you export it.
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="flex flex-col items-start gap-6 pt-4">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          A professional starting bike fit, from your own measurements.
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-ink-muted">
          Answer a few questions, measure with a tape and a book, and get an
          honest set of ranges you can dial in with a hex key. No account,
          nothing to install, in about ten minutes.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link href="/fit/new">
            Start your fit
            <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/method">How it works</Link>
        </Button>
      </div>
    </section>
  );
}

function WelcomeBack({
  fits,
  unit,
  onOpen,
}: {
  fits: StoredFit[];
  unit: ReturnType<typeof useUnit>["unit"];
  onOpen: (id: string) => void;
}) {
  const recent = fits.slice(0, 3);
  return (
    <section className="flex flex-col gap-6 pt-4">
      <div className="flex flex-col gap-3">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          Welcome back
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Pick up where you left off
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          Open a saved fit to review it, or start a new one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((fit) => (
          <FitSummaryCard
            key={fit.id}
            fit={fit}
            unit={unit}
            onOpen={() => onOpen(fit.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href="/fit/new">
            New fit
            <ArrowRight />
          </Link>
        </Button>
        {fits.length > recent.length ? (
          <Button asChild variant="outline">
            <Link href="/fits">All saved fits</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
