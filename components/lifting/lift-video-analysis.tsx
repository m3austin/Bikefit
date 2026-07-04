"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { VideoDropzone } from "@/components/fit/video-dropzone";
import {
  VideoWorkspace,
  type AnalyzeOutcome,
} from "@/components/kernel/video-workspace";
import { LiftResultsSection } from "@/components/lifting/lift-results";
import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  buildLiftReport,
  type LiftReport,
} from "@/lib/sports/lifting/biomechanics";
import { getLift } from "@/lib/sports/lifting/lifts";

/*
 * LiftFit form video analysis for one lift, composed on the kernel video
 * workspace. The lift config supplies the tracker, event names, cues, and
 * metrics; this shell is lift-agnostic. Only the lift id crosses the server
 * boundary (the config carries functions, which cannot); the client resolves
 * the full config from the pure lifts registry. Videos never leave the
 * device (kernel rule); object URLs are created and revoked in event
 * handlers only (StrictMode-safe, same as cycling).
 */

type Slot = { file: File; url: string };

export function LiftVideoAnalysis({ liftId }: { liftId: string }) {
  const config = getLift(liftId);
  const urlRef = React.useRef<string | null>(null);
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [report, setReport] = React.useState<LiftReport | null>(null);
  const [cap, setCap] = React.useState<{ frames: TimedFrame[]; aspect: number } | null>(
    null,
  );

  const select = React.useCallback((file: File) => {
    setReport(null);
    setCap(null);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setSlot({ file, url });
  }, []);

  const clear = React.useCallback(() => {
    setReport(null);
    setCap(null);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setSlot(null);
  }, []);

  const analyze = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      if (!config) return { ok: false, reason: "Unknown lift." };
      const outcome = buildLiftReport(frames, aspect, config);
      if (!outcome.ok) return outcome;
      setReport(outcome.report);
      setCap({ frames, aspect });
      const markers = [
        ...outcome.report.anchorTMs.map((tMs) => ({
          tMs,
          label: config.anchorLabel,
          tone: "accent" as const,
        })),
        ...outcome.report.lockoutTMs.map((tMs) => ({
          tMs,
          label: config.lockoutLabel,
          tone: "muted" as const,
        })),
      ];
      return { ok: true, markers };
    },
    [config],
  );

  // Guarded by the page (notFound); this satisfies the type and never renders.
  if (!config) return null;

  if (!slot) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/lifting"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All lifts
          </Link>
          <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
            LiftFit
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {config.name}
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            Film a set from the side and the analysis reads your form rep by
            rep, on this device. The video is never uploaded anywhere.
          </p>
        </div>

        <div
          role="note"
          aria-label="Safety"
          className="flex gap-3 rounded-md border border-warn/50 bg-warn/10 p-4"
        >
          <ShieldAlert
            className="mt-0.5 size-5 shrink-0 text-warn"
            aria-hidden="true"
          />
          <p className="max-w-prose text-sm leading-relaxed text-ink">
            A measuring tool, not a spotter and not a coach. Lift within your
            limits, use pins or a spotter, and stop if anything hurts.
          </p>
        </div>

        <VideoDropzone
          onSelect={select}
          prompt={`Drag a side-on ${config.name.toLowerCase()} video here, or choose a file`}
          chooseLabel="Choose video"
        />

        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5">
          <h2 className="text-sm font-medium text-ink">
            For a reading the app can trust
          </h2>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">
            {config.cues.map((cue) => (
              <li key={cue} className="flex gap-2">
                <span className="text-accent" aria-hidden="true">
                  •
                </span>
                {cue}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/lifting"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All lifts
        </Link>
        <h1 className="sr-only">{config.name} form analysis</h1>
      </div>

      <VideoWorkspace
        key={slot.url}
        videoUrl={slot.url}
        fileName={slot.file.name}
        label={config.name}
        analyzeLabel="Analyze this set"
        analyzeHelper="Plays the video once and reads your form rep by rep, on this device."
        runningNoun="your set"
        analyze={analyze}
        onReset={() => {
          setReport(null);
          setCap(null);
        }}
        onChooseDifferent={clear}
      />

      <LiftResultsSection
        config={config}
        report={report}
        frames={cap?.frames}
        videoUrl={slot.url}
        aspect={cap?.aspect}
      />
    </div>
  );
}
