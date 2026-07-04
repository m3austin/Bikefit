"use client";

import * as React from "react";
import { ExternalLink, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsPlayDistribution } from "@/components/distribution";
import { getSettings, saveSettings } from "@/lib/db";
import { shouldShowSupportNote, supportUrl } from "@/lib/support";

/*
 * The gentle tip-jar note (lib/support.ts has the principles). Inline in the
 * page flow, never an overlay. It decides for itself whether it may appear;
 * parents just tell it how many saved fits exist. Rendering it records the
 * showing, so it stays away for the whole re-show window afterward. "No
 * thanks" hides it forever. None of this is tracked or logged anywhere.
 */
export function SupportNote({ savedFitCount }: { savedFitCount: number }) {
  const url = supportUrl();
  // Google Play distribution never shows support surfaces (payment policy).
  const play = useIsPlayDistribution();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (play) return;
    let active = true;
    async function decide() {
      const settings = await getSettings();
      const show = shouldShowSupportNote({
        url,
        savedFitCount,
        state: {
          dismissed: settings?.supportDismissed,
          lastShownMs: settings?.supportLastShownMs,
        },
        nowMs: Date.now(),
      });
      if (!active || !show) return;
      setVisible(true);
      // Record the showing so the note stays quiet for the full window.
      await saveSettings({ supportLastShownMs: Date.now() });
    }
    void decide();
    return () => {
      active = false;
    };
  }, [url, savedFitCount, play]);

  if (!visible || !url || play) return null;

  return (
    <aside
      aria-label="Support BikeFit"
      className="flex gap-3 rounded-md border border-line bg-surface p-5"
    >
      <Heart className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-ink">
            If BikeFit helped, you can chip in
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            BikeFit is free for everyone: no ads, no account, nothing to
            unlock. A few riders asked how to support it, so here it is. Only
            if you want to and can comfortably spare it; nothing changes
            either way, and this note stays out of your way.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer">
              Chip in
              <ExternalLink />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setVisible(false);
              void saveSettings({ supportDismissed: true });
            }}
          >
            No thanks
          </Button>
        </div>
        <p className="text-xs text-ink-muted">
          Payments go through Stripe on their site. BikeFit never sees your
          card details.
        </p>
      </div>
    </aside>
  );
}
