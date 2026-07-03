"use client";

import * as React from "react";

/*
 * Count a value up to `target` over `durationMs` when `animate` is true, else
 * return `target` immediately. The one springy results moment (UX-UI-Design
 * §1, §4.3). Callers pass animate=false under prefers-reduced-motion or when a
 * fit is opened from /fits, so this stays instant there.
 */
export function useCountUp(
  target: number,
  animate: boolean,
  durationMs = 600,
): number {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!animate) return;
    let raf = 0;
    let startTime: number | null = null;
    const tick = (now: number) => {
      startTime ??= now;
      const t = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate, durationMs]);

  // When not animating, always reflect the target immediately.
  return animate ? value : target;
}
