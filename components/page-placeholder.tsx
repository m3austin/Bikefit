import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type Cta = { href: string; label: string };

/*
 * Phase 0 route placeholder. Uses design tokens only, so it demonstrates the
 * theme wiring on every route. Each phase replaces these with real screens.
 */
export function PagePlaceholder({
  eyebrow,
  title,
  description,
  phase,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
  cta?: Cta;
}) {
  return (
    <section className="flex flex-col items-start gap-6">
      <div className="flex flex-col gap-3">
        <span className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          {eyebrow}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          {description}
        </p>
      </div>

      <div className="w-full rounded-md border border-line bg-surface p-5 shadow-none sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="measurement rounded-sm bg-surface-2 px-2 py-1 text-xs text-ink-muted">
            {phase}
          </span>
          <span className="text-sm text-ink-muted">
            Placeholder screen. Real UI arrives in a later build phase.
          </span>
        </div>

        {cta ? (
          <div className="mt-5">
            <Button asChild>
              <Link href={cta.href}>
                {cta.label}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
