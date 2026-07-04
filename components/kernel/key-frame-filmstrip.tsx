"use client";

import * as React from "react";

import { PoseFigure } from "@/components/kernel/pose-figure";
import type { AngleHighlight, KeyFrameSpec } from "@/lib/kernel/keyframes";
import type { ScoreTone } from "@/lib/kernel/scoring";
import { cn } from "@/lib/utils";

/*
 * The key-frame filmstrip: the moments the analysis keyed on, each with a
 * stick-figure overlay showing the exact angles measured. It grabs a still
 * from the (local, never-uploaded) video at each key time to sit behind the
 * figure; if a grab fails, the figure still renders from the pose data, so
 * the illustration never breaks. Captures run once, sequentially, off a
 * private hidden video element.
 */

const FIGURE_H = 240;

const TONE_DOT: Record<ScoreTone, string> = {
  great: "bg-accent",
  good: "bg-accent",
  watch: "bg-warn",
  work: "bg-danger",
};

function useCapturedFrames(
  videoUrl: string | undefined,
  times: readonly number[],
): Array<HTMLCanvasElement | null> {
  const [frames, setFrames] = React.useState<Array<HTMLCanvasElement | null>>(
    () => times.map(() => null),
  );
  // Stable key so we recapture only when the video or the set of times change.
  const key = `${videoUrl ?? ""}|${times.join(",")}`;

  React.useEffect(() => {
    if (!videoUrl) return; // No video: figures render skeleton-only.
    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.src = videoUrl;

    const seekTo = (t: number) =>
      new Promise<void>((resolve) => {
        const done = () => {
          video.removeEventListener("seeked", done);
          resolve();
        };
        video.addEventListener("seeked", done);
        // A tiny nudge past 0 avoids some browsers ignoring a seek to exactly
        // the current time; the fallback timer resolves if no event fires.
        video.currentTime = Math.max(0.001, t / 1000);
        window.setTimeout(done, 600);
      });

    const run = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          if (video.readyState >= 2) return resolve();
          video.addEventListener("loadeddata", () => resolve(), { once: true });
          video.addEventListener("error", () => reject(new Error("load")), {
            once: true,
          });
          window.setTimeout(() => resolve(), 3000);
        });
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 640;
        const out = times.map(() => null as HTMLCanvasElement | null);
        for (let i = 0; i < times.length; i++) {
          if (cancelled) return;
          await seekTo(times[i] ?? 0);
          if (cancelled) return;
          try {
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const cx = c.getContext("2d");
            if (cx) {
              cx.drawImage(video, 0, 0, w, h);
              out[i] = c;
            }
          } catch {
            // Leave this one null; the figure renders skeleton-only.
          }
        }
        if (!cancelled) setFrames(out);
      } catch {
        // Whole capture failed (decode/codec): skeleton-only for all frames.
      }
    };
    void run();

    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return frames;
}

function HighlightLegend({ highlights }: { highlights: readonly AngleHighlight[] }) {
  if (highlights.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {highlights.map((h) => (
        <li key={h.label} className="flex items-center gap-2 text-xs text-ink-muted">
          <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[h.tone])} />
          <span className="text-ink">{h.label}</span>
          <span className="measurement ml-auto text-ink">{h.valueText}</span>
        </li>
      ))}
    </ul>
  );
}

export function KeyFrameFilmstrip({
  videoUrl,
  frames,
  aspect = 1,
}: {
  /** The local video to pull stills from; omit to render skeleton-only. */
  videoUrl?: string;
  frames: readonly KeyFrameSpec[];
  /** Video width / height, to keep the figure undistorted. */
  aspect?: number;
}) {
  const times = React.useMemo(() => frames.map((f) => f.tMs), [frames]);
  const captured = useCapturedFrames(videoUrl, times);

  if (frames.length === 0) return null;

  const figW = Math.round(
    Math.max(180, Math.min(FIGURE_H * (aspect || 1), 360)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-ink">Your key moments</h3>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Pulled from your video, on your device. The overlay traces the exact
          angles the analysis measured, so you can see what each number means
          on your own body.
        </p>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {frames.map((spec, i) => (
          <figure
            key={`${spec.label}-${spec.tMs}`}
            className="flex shrink-0 flex-col gap-3 rounded-lg border border-line bg-surface p-3"
            style={{ width: figW }}
          >
            <div className="overflow-hidden rounded-md bg-surface-2">
              <PoseFigure
                landmarks={spec.landmarks}
                highlights={spec.highlights}
                frame={captured[i] ?? null}
                width={figW - 24}
                height={FIGURE_H}
              />
            </div>
            <figcaption className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {spec.label}
                </span>
                <span className="measurement text-xs text-ink-muted">
                  {(spec.tMs / 1000).toFixed(2)}s
                </span>
              </div>
              {spec.caption ? (
                <p className="text-xs leading-relaxed text-ink-muted">
                  {spec.caption}
                </p>
              ) : null}
              <HighlightLegend highlights={spec.highlights} />
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
