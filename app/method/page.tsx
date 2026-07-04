import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Cite } from "@/components/kernel/cite";
import { ReferenceList } from "@/components/kernel/reference-list";

export const metadata: Metadata = {
  title: "The rabbit hole",
  description:
    "Where every SportFits number comes from: the methods, what they are good at, where they break down, and the sources behind them. Every value is either cited or labeled as our own starting estimate.",
};

/*
 * The rabbit hole (/method): the one place depth is allowed to live. The rest
 * of the app stays short and links here. Every method names its source
 * (lib/references.ts) or is labeled plainly as our own estimate. This page is
 * the answer to "it is free, so it is probably not accurate": here is exactly
 * what each number stands on.
 */

function Sourced() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-ink">
      <BadgeCheck className="size-3 text-accent" aria-hidden="true" />
      Sourced
    </span>
  );
}

function Estimate() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-medium text-ink">
      <FlaskConical className="size-3 text-warn" aria-hidden="true" />
      Our estimate
    </span>
  );
}

function Entry({
  id,
  title,
  badge,
  children,
}: {
  id?: string;
  title: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="flex scroll-mt-20 flex-col gap-2 rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {badge}
      </div>
      <div className="flex max-w-prose flex-col gap-2 text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
    </div>
  );
}

function Sport({
  id,
  brand,
  blurb,
  children,
}: {
  id: string;
  brand: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={brand}
      className="flex scroll-mt-20 flex-col gap-4 border-t border-line pt-8"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">{brand}</h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          {blurb}
        </p>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function RabbitHolePage() {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          Down the rabbit hole
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Where every number comes from
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-ink-muted">
          SportFits is free, so it is fair to ask whether the numbers mean
          anything. This is the honest answer. Every target is either drawn
          from published work, and cited right here, or it is our own sensible
          starting estimate, and labeled as one. Nothing in between, and
          nothing dressed up. Stay as long as you like.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink">How to read this page</p>
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">
          <p className="flex items-center gap-2">
            <Sourced /> the target comes from the cited source.
          </p>
          <p className="flex items-center gap-2">
            <Estimate /> a reasonable starting value we chose, not yet confirmed
            by a sport expert. It will be replaced as experts weigh in.
          </p>
          <p>
            Either way, every output is a range with a recommended start, never
            a single oracle number. Comfort and how the movement feels always
            win over the maths.
          </p>
        </div>
      </div>

      <section className="flex scroll-mt-20 flex-col gap-2 border-t border-line pt-8">
        <h2 className="text-xl font-semibold text-ink">The technique score</h2>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Each category scores 0 to 10 by how close your measured value sits to
          its range: right in the range is 10, and the score eases down the
          further outside you land. The overall score is the plain average of
          your categories. It is a readout of fit to sensible ranges, not an
          expert grade, and it is only ever as good as the ranges below.
        </p>
      </section>

      <Sport
        id="cycling"
        brand="BikeFit (cycling)"
        blurb="Cycling is the most studied of the sports here, so most of its numbers are sourced rather than estimated."
      >
        <Entry id="saddle-height" title="Saddle height" badge={<Sourced />}>
          <p>
            We average two classic methods and round to the millimetre: 0.883
            times inseam <Cite id="lemond-1987" />, and 1.09 times inseam minus
            crank length <Cite id="hamley-thomas-1967" />. It is the most
            reliable single number in bike fitting.
          </p>
          <p>
            Where it breaks: inseam is hard to measure exactly, and shoe sole,
            pedal stack, and cleat position all shift the real height. Use the
            heel-on-pedal check and treat the range as the answer.
          </p>
        </Entry>
        <Entry title="Knee angle at the stroke bottom" badge={<Sourced />}>
          <p>
            The video analysis checks your knee against the 25 to 35 degree
            flexion window at the bottom of the stroke{" "}
            <Cite id="holmes-1994" />, the range tied to lower knee-overuse risk.
          </p>
        </Entry>
        <Entry title="Saddle setback" badge={<Sourced />}>
          <p>
            We start from knee-over-pedal-spindle <Cite id="kops-convention" />,
            a fitting convention rather than a law. Move the saddle back if the
            front of your knee aches, forward if the back does.
          </p>
        </Entry>
        <Entry title="Reach, drop, width, cranks, frame size" badge={<Estimate />}>
          <p>
            These come from long-standing fitting rules of thumb (elbow bend for
            reach, flexibility for drop, shoulder width for bars, inseam for
            cranks and frame size). They are sound starting points, not sourced
            targets, so we treat them as estimates and lead with the feel.
          </p>
        </Entry>
      </Sport>

      <Sport
        id="running"
        brand="RunFit (running)"
        blurb="Cadence is sourced; the rest of the gait numbers are starting estimates until a running coach or physiotherapist confirms them."
      >
        <Entry id="cadence" title="Cadence" badge={<Sourced />}>
          <p>
            Nudging your cadence up about 5 to 10 percent measurably lowers the
            load at your hip and knee <Cite id="heiderscheit-2011" />, which is
            why cadence is the hero metric and the first change we suggest.
          </p>
        </Entry>
        <Entry
          title="Overstride, knee at contact, bounce, trunk lean, pelvic drop"
          badge={<Estimate />}
        >
          <p>
            These read real, useful things from your video, but the exact target
            ranges are our starting estimates, and several are 2D proxies from a
            single camera. Treat them as honest hints ranked by usefulness, and
            let how running feels over a couple of weeks be the judge.
          </p>
        </Entry>
      </Sport>

      <Sport
        id="lifting"
        brand="LiftFit (lifting)"
        blurb="The safety framing is grounded in the biomechanics literature; the specific target numbers are starting estimates."
      >
        <Entry id="back-rounding" title="Deadlift back rounding" badge={<Sourced />}>
          <p>
            Spinal flexion under load is the highest-stakes fault in the app,
            and why the deadlift back-rounding reading is the one we treat most
            seriously <Cite id="mcgill-lbd" />. It is a 2D proxy that errs toward
            caution on purpose. If your back rounds even at light weight, stop
            and see a coach or physiotherapist.
          </p>
        </Entry>
        <Entry
          title="Depth, balance, wrist stack, bar path, lockout"
          badge={<Estimate />}
        >
          <p>
            The per-lift target ranges are our starting estimates from common
            coaching cues, not sourced values. A lift is a config entry, so
            these will sharpen per lift as a strength coach confirms them.
          </p>
        </Entry>
      </Sport>

      <Sport
        id="golf"
        brand="GolfFit (golf)"
        blurb="Every golf target is currently a starting estimate, and the turn numbers are 2D proxies. We are upfront about that."
      >
        <Entry title="Tempo, spine, head, turn, slide, lead arm" badge={<Estimate />}>
          <p>
            These are reasonable ranges we chose to get you started, not sourced
            targets, and the shoulder and hip turn figures read apparent width
            on camera rather than true rotation. A launch monitor or an
            in-person coach sees plenty this cannot. We will cite real values
            here as a golf professional confirms them.
          </p>
        </Entry>
      </Sport>

      <Sport
        id="swimming"
        brand="SwimFit (swimming), beta"
        blurb="Swimming is the hardest capture in the app and ships as a beta. Its numbers are the roughest here, on purpose."
      >
        <Entry title="Stroke rate, head, elbow, body roll" badge={<Estimate />}>
          <p>
            One above-water camera sees one side of a movement that lives half
            underwater. These targets are starting estimates and the readings
            are weak proxies, body roll most of all. Read the confidence note in
            your results first; on a swim clip it decides how much the rest is
            worth.
          </p>
        </Entry>
      </Sport>

      <ReferenceList />

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <p className="text-sm leading-relaxed text-ink-muted">
          None of this is medical advice or a substitute for an in-person coach
          or clinician. It is a measuring tool with sources. If a movement
          hurts, stop and get real help.
        </p>
        <Button asChild className="self-start">
          <Link href="/">Back to your sports</Link>
        </Button>
      </section>
    </article>
  );
}
