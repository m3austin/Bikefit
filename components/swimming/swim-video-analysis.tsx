"use client";

import * as React from "react";

import { VideoDropzone } from "@/components/fit/video-dropzone";
import {
  VideoWorkspace,
  type AnalyzeOutcome,
} from "@/components/kernel/video-workspace";
import { SwimBetaNote } from "@/components/swimming/swim-beta-note";
import { SwimResultsSection } from "@/components/swimming/swim-results";
import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  buildSwimReport,
  type SwimReport,
} from "@/lib/sports/swimming/biomechanics";

/*
 * SwimFit stroke video analysis: a single side-on, above-water view composed
 * on the kernel video workspace. Videos never leave the device (kernel
 * rule); object URLs are created and revoked in event handlers only
 * (StrictMode-safe, same as cycling).
 */

type Slot = { file: File; url: string };

const TIPS = [
  "Film from the pool deck, side on, with the swimmer in the near lane.",
  "A few strokes in clear, settled water beat a long noisy clip. Splash and bubbles are what cost the reading.",
  "Camera low and close to the surface if you safely can; keep it still.",
  "Above water only. Underwater housings and the model do not get along yet.",
];

export function SwimVideoAnalysis() {
  const urlRef = React.useRef<string | null>(null);
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [report, setReport] = React.useState<SwimReport | null>(null);

  const select = React.useCallback((file: File) => {
    setReport(null);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setSlot({ file, url });
  }, []);

  const clear = React.useCallback(() => {
    setReport(null);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setSlot(null);
  }, []);

  const analyze = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      const outcome = buildSwimReport(frames, aspect);
      if (!outcome.ok) return outcome;
      setReport(outcome.report);
      const markers = [
        ...outcome.report.catchTMs.map((tMs) => ({
          tMs,
          label: "catch",
          tone: "accent" as const,
        })),
        ...outcome.report.recoveryTMs.map((tMs) => ({
          tMs,
          label: "recovery",
          tone: "muted" as const,
        })),
      ];
      return { ok: true, markers };
    },
    [],
  );

  if (!slot) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
            SwimFit
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Film a few strokes, side on
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            Set your phone on the deck, catch a few clean strokes, and the
            analysis reads your stroke rate, head position, and recovery on
            this device. The video is never uploaded anywhere.
          </p>
        </div>

        <SwimBetaNote />

        <VideoDropzone
          onSelect={select}
          prompt="Drag a side-on swimming video here, or choose a file"
          chooseLabel="Choose video"
        />

        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5">
          <h2 className="text-sm font-medium text-ink">
            For a reading the app can trust
          </h2>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="text-accent" aria-hidden="true">
                  •
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="sr-only">Stroke video analysis</h1>

      <VideoWorkspace
        key={slot.url}
        videoUrl={slot.url}
        fileName={slot.file.name}
        label="Front crawl, side on"
        analyzeLabel="Analyze this swim"
        analyzeHelper="Plays the video once and reads your near arm, on this device. Swim clips are noisy; check the confidence read in the results."
        runningNoun="your stroke"
        analyze={analyze}
        onReset={() => setReport(null)}
        onChooseDifferent={clear}
      />

      <SwimResultsSection report={report} />
    </div>
  );
}
