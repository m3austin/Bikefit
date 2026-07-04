"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUnit } from "@/components/unit-provider";
import { listSavedFits, type StoredFit } from "@/lib/db";

// Loaded only when a returning visitor actually has fits, so its dependency
// chain (engine, measurements, format) stays out of the landing's first-load JS.
const FitSummaryCard = dynamic(() =>
  import("@/components/fit/fit-summary-card").then((m) => m.FitSummaryCard),
);

/*
 * The landing hero island (§4.1). Renders the default hero for first-time
 * visitors (server-rendered, so it is the LCP element) and swaps to the
 * welcome-back view once local fits are found.
 */
export function LandingHero() {
  const router = useRouter();
  const { unit } = useUnit();
  const [ready, setReady] = React.useState(false);
  const [fits, setFits] = React.useState<StoredFit[]>([]);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const saved = await listSavedFits();
        if (active) setFits(saved);
      } catch {
        // Landing still works without the garage.
      }
      if (active) setReady(true);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (ready && fits.length > 0) {
    return (
      <WelcomeBack
        fits={fits}
        unit={unit}
        onOpen={(id) => router.push(`/fit/${id}`)}
      />
    );
  }
  return <Hero />;
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
          <Link href="/fit">
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
          <Link href="/fit">
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
