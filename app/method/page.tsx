import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DISCLAIMER } from "@/lib/results-copy";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The fitting methods BikeFit uses, where they come from, what they are good at, and where they break down.",
};

function Method({
  title,
  formula,
  children,
}: {
  title: string;
  formula?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-8">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {formula ? (
        <p className="measurement rounded-sm bg-surface-2 px-3 py-2 text-sm text-ink">
          {formula}
        </p>
      ) : null}
      <div className="flex max-w-prose flex-col gap-3 text-ink-muted">
        {children}
      </div>
    </section>
  );
}

export default function MethodPage() {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          Methodology
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          How BikeFit works
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-ink-muted">
          Every number here comes from a published fitting method. None of them
          are secret, and none of them are the last word. This page walks
          through each one: where it comes from, what it is good at, and where
          it breaks down, so you can trust the parts that deserve trust and take
          the rest as a starting point.
        </p>
      </header>

      <Method
        title="Saddle height"
        formula="Recommended start = mean of (0.883 times inseam) and (1.09 times inseam minus crank length)"
      >
        <p>
          Two classic methods sit behind this number. The first, popularised by
          Greg LeMond, sets saddle height at 0.883 of your inseam measured from
          the bottom bracket to the top of the saddle. The second, from research
          by Hamley, works from the pedal and gives 1.09 of your inseam once you
          subtract the crank length. We take the average of the two and round to
          the nearest millimetre, then nudge it slightly for your bike type and
          riding priority.
        </p>
        <p>
          What it is good at: giving a repeatable, sane starting height that
          keeps your knee from over-extending. It is the most reliable single
          number in bike fitting.
        </p>
        <p>
          Where it breaks: inseam is hard to measure to the millimetre, and shoe
          sole thickness, pedal stack, and cleat position all shift the real
          height. Treat the range as the answer, not the exact figure, and use
          the heel-on-pedal check: with your heel on the pedal at the bottom of
          the stroke, your leg should be straight and your hips level.
        </p>
      </Method>

      <Method
        title="Saddle setback"
        formula="Estimated setback from the bottom bracket = 0.245 times inseam minus 100 mm"
      >
        <p>
          Setback is how far the saddle sits behind the bottom bracket. The old
          rule of thumb is knee over pedal spindle: with the cranks level, a
          plumb line from the front of your kneecap falls near the pedal axle.
          The formula gives a rough starting band, but the behaviour matters
          more than the millimetres.
        </p>
        <p>
          Where it breaks: knee over pedal is a convention, not a law of
          physics. Riders comfortable a centimetre either side of it are
          completely normal. Move the saddle back if the front of your knee
          aches, forward if the back of your knee does.
        </p>
      </Method>

      <Method
        title="Reach"
        formula="Estimated reach = (torso plus arm) divided by two, plus 40 mm"
      >
        <p>
          Reach is the horizontal distance from saddle to handlebar, set mostly
          by frame and stem. This is the least formula-friendly number on the
          sheet, so we lead with the feel: on the hoods or grips, your elbows
          should keep a slight bend, around 15 to 20 degrees, and your arms
          should never lock straight.
        </p>
        <p>
          Where it breaks: torso and arm proportions vary a lot for the same
          height, and flexibility changes what feels good. Use the number to
          pick a stem length in the right neighbourhood, then trust your body.
        </p>
      </Method>

      <Method title="Handlebar drop">
        <p>
          Drop is how far the bars sit below the saddle, and it only applies to
          drop-bar bikes. We set the band from your flexibility (the toe-touch
          test), then place the start point within it based on your priority:
          more comfort means less drop, more performance means more.
        </p>
        <p>
          Where it breaks: flexibility changes over a season and with warm-up.
          Raise the bars if your hands go numb or your neck aches, and revisit
          the fit as you get more supple.
        </p>
      </Method>

      <Method title="Handlebar width">
        <p>
          For drop bars, width is your shoulder measurement rounded to the
          nearest 20 mm, since bars are sold in 2 cm steps. Wider bars open the
          chest and steady the steering, narrower ones feel quicker. Mountain
          and hybrid bars are a different story: they run wide, around 740 to 780
          mm, and you trim them to taste. Cutting is permanent, so go slowly.
        </p>
      </Method>

      <Method title="Crank length">
        <p>
          We pick crank length from your inseam: under 750 mm suggests 165,
          750 to 809 suggests 170, 810 to 859 suggests 172.5, and 860 and up
          suggests 175. The industry has been trending shorter for good reasons,
          so going one step below the chart is never a wrong choice for comfort.
          Shorter cranks open your hip angle and can let you drop the saddle
          slightly.
        </p>
      </Method>

      <Method title="Cleat position">
        <p>
          If you gave a foot length, we include cleat guidance. Start with the
          pedal axle under the ball of your foot, the wide part just behind the
          big-toe joint. There is no single right number here, so this is
          behaviour, not a formula. Moving the cleat a little toward the midfoot
          takes load off the calf and can feel better on long rides.
        </p>
      </Method>

      <Method
        title="Frame size"
        formula="Road and gravel: 0.665 times inseam (cm). Mountain: 0.225 times inseam (inches)."
      >
        <p>
          This one is for shopping, not for a bike you already own. It gives a
          rough seat-tube size for road and gravel, and a rough frame size in
          inches for mountain bikes. Modern geometry varies a lot, so treat it
          as a place to start on a size chart and always compare stack and
          reach. Between two sizes, the smaller frame is usually easier to make
          comfortable.
        </p>
      </Method>

      <Method title="Ranges, not oracle numbers">
        <p>
          You will notice every output is a range with a recommended start. That
          is deliberate. False precision is the fastest way to lose your trust,
          and no formula knows your body. Comfort always wins over the maths: if
          a setting hurts, change it, and let the number lose the argument.
        </p>
      </Method>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <p className="text-sm leading-relaxed text-ink-muted">{DISCLAIMER}</p>
        <Button asChild className="self-start">
          <Link href="/cycling">Start your fit</Link>
        </Button>
      </section>
    </article>
  );
}
