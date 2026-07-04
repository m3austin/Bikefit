"use client";

import * as React from "react";

import { Mascot } from "@/components/mascot/mascot";

/*
 * Tier 4 easter egg (docs/sportfit/04 section 4): the hub-footer mascot.
 * Tap it five times in quick succession and it faceplants for a beat, then
 * picks itself back up. Deliberately hidden and low-stakes; it lives only in
 * the hub chrome (never on results, safety, or payment surfaces). The swap
 * is an instant pose change with no animation, so prefers-reduced-motion has
 * nothing to gate.
 */

const NEEDED = 5;
const WINDOW_MS = 2000;
const FACEPLANT_MS = 2500;

export function MascotEasterEgg({ size = 28 }: { size?: number }) {
  const [down, setDown] = React.useState(false);
  const taps = React.useRef<number[]>([]);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onActivate = React.useCallback(() => {
    if (down) return;
    // performance.now avoids any wall-clock dependency and is monotonic.
    const now = performance.now();
    taps.current = [...taps.current, now].filter((t) => now - t <= WINDOW_MS);
    if (taps.current.length >= NEEDED) {
      taps.current = [];
      setDown(true);
      timer.current = setTimeout(() => setDown(false), FACEPLANT_MS);
    }
  }, [down]);

  return (
    <button
      type="button"
      // A genuine hidden extra: not announced, not a documented control.
      aria-hidden="true"
      tabIndex={-1}
      onClick={onActivate}
      className="ml-1 inline-flex cursor-default border-0 bg-transparent p-0"
    >
      <Mascot pose={down ? "faceplant" : "cheer"} size={size} />
    </button>
  );
}
