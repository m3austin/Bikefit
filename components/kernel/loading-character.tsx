"use client";

import * as React from "react";

import { ANIMATION_CSS } from "@/lib/loading/animation-css";
import { getAnimation, type AnimationKey } from "@/lib/loading/marshmallow-animations";
import {
  forcedAnimationFromQuery,
  pickAnimationKey,
} from "@/lib/loading/pick-animation";
import { cn } from "@/lib/utils";

/*
 * The marshmallow loading character: renders one of the 18 self-contained
 * animations (verbatim SVG from lib/loading/marshmallow-animations) and loops
 * it until loading finishes. The animation is chosen once on mount, weighted
 * so the common pool is usual and the rare easter eggs are a treat, and only
 * eligible for a rare when the load is expected to run long enough to see it
 * (see pickAnimationKey).
 *
 * Testing: append ?anim=<key> (or ?loading=<key>) to the URL to force one,
 * e.g. ?anim=golden. The `animation` prop overrides everything.
 */

/*
 * The SVG-internal animations are main-thread-driven, and the one place this
 * character shows (the analyzing screen) is exactly when pose inference pegs
 * the main thread, freezing them. This wrapper animation is transform-only on
 * a promoted HTML layer, so the compositor keeps it moving under load; the
 * per-part animations resume whenever the thread breathes. Kept here, not in
 * animation-css.ts, which is a verbatim port of the reference set.
 */
const STAGE_CSS = `
.ml-stage{ will-change: transform; animation: mlStageBob 2.6s ease-in-out infinite; }
@keyframes mlStageBob{
  0%,100%{transform:translateY(0) rotate(-2deg);}
  50%{transform:translateY(-5%) rotate(2deg);}
}
@media (prefers-reduced-motion: reduce){
  .ml-stage, .ml-loading .char, .ml-loading .char *{ animation: none !important; }
}
`;

export function LoadingCharacter({
  animation,
  expectedDurationMs,
  label,
  srStatus,
  size = 168,
  className,
}: {
  /** Force a specific animation (overrides the random pick and the query). */
  animation?: AnimationKey;
  /** Likely load duration; gates whether a rare easter egg is eligible. */
  expectedDurationMs?: number;
  /** Visible caption. May tick (e.g. an elapsed counter); it is decorative,
   * so a changing value never spams assistive tech. */
  label?: string;
  /** Stable message announced once to screen readers. Keep it fixed even when
   * `label` ticks. Defaults to a generic "Loading." */
  srStatus?: string;
  /** Max width of the character stage in px. */
  size?: number;
  className?: string;
}) {
  // Pick once, on mount. Math.random runs only on the client, so it never
  // causes a hydration mismatch: this component is shown after a user action
  // (never in the initial server HTML). An explicit `animation` is
  // deterministic and safe even if server-rendered; for a server-rendered
  // loading screen, always pass one.
  const [resolved] = React.useState<AnimationKey | null>(() => {
    if (animation) return animation;
    if (typeof window === "undefined") return null;
    return (
      forcedAnimationFromQuery(window.location.search) ??
      pickAnimationKey({ expectedDurationMs })
    );
  });

  // Build the markup once per chosen animation, so a live-updating label
  // (e.g. an elapsed-time counter) never rebuilds the SVG or restarts the loop.
  const html = React.useMemo(() => {
    const entry = resolved ? getAnimation(resolved) : undefined;
    return entry ? entry.build() : "";
  }, [resolved]);

  return (
    <div className={cn("ml-loading flex flex-col items-center gap-3", className)}>
      {/* Hoisted, deduped by href across every LoadingCharacter instance. */}
      <style href="ml-loading-animations" precedence="default">
        {ANIMATION_CSS + STAGE_CSS}
      </style>
      <div
        className="ml-stage w-full"
        style={{ maxWidth: size, aspectRatio: "200 / 230" }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {/* Visible caption is decorative so a ticking value is not announced
          repeatedly; the stable status below is what screen readers hear. */}
      <span className="text-sm text-ink-muted" aria-hidden="true">
        {label ?? "Working on it..."}
      </span>
      <span className="sr-only" role="status">
        {srStatus ?? "Loading."}
      </span>
    </div>
  );
}
