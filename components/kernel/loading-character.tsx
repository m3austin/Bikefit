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

export function LoadingCharacter({
  animation,
  expectedDurationMs,
  label,
  size = 168,
  className,
}: {
  /** Force a specific animation (overrides the random pick and the query). */
  animation?: AnimationKey;
  /** Likely load duration; gates whether a rare easter egg is eligible. */
  expectedDurationMs?: number;
  /** Optional caption under the character. */
  label?: string;
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
    <div
      className={cn("ml-loading flex flex-col items-center gap-3", className)}
      role="status"
      aria-live="polite"
    >
      {/* Hoisted, deduped by href across every LoadingCharacter instance. */}
      <style href="ml-loading-animations" precedence="default">
        {ANIMATION_CSS}
      </style>
      <div
        className="w-full"
        style={{ maxWidth: size, aspectRatio: "200 / 230" }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <span className="text-sm text-ink-muted">{label ?? "Working on it..."}</span>
    </div>
  );
}
