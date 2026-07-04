"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { VideoDropzone } from "@/components/fit/video-dropzone";
import { CameraSetupDiagram } from "@/components/kernel/camera-setup";
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
import {
  buildSquatFrontReport,
  type SquatFrontReport,
} from "@/lib/sports/lifting/squat-front";
import { getLift } from "@/lib/sports/lifting/lifts";

/*
 * LiftFit form video analysis for one lift, composed on the kernel video
 * workspace. Side view (required) reads the sagittal plane rep by rep. The
 * SQUAT also offers an optional front view for the frontal plane the side
 * cannot see: knee tracking (caving) and left-right symmetry. Other lifts get
 * no front view (their faults are sagittal). Videos never leave the device;
 * object URLs are created and revoked in handlers only (StrictMode-safe).
 */

type Slot = { file: File; url: string };
type Captured = { frames: TimedFrame[]; aspect: number };

function useVideoSlot() {
  const urlRef = React.useRef<string | null>(null);
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const select = React.useCallback((file: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setSlot({ file, url });
  }, []);
  const clear = React.useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setSlot(null);
  }, []);
  return { slot, select, clear };
}

export function LiftVideoAnalysis({ liftId }: { liftId: string }) {
  const config = getLift(liftId);
  const supportsFront = liftId === "squat";

  const side = useVideoSlot();
  const front = useVideoSlot();
  const [report, setReport] = React.useState<LiftReport | null>(null);
  const [cap, setCap] = React.useState<Captured | null>(null);
  const [frontReport, setFrontReport] = React.useState<SquatFrontReport | null>(
    null,
  );

  const selectSide = React.useCallback(
    (file: File) => {
      setReport(null);
      setCap(null);
      side.select(file);
    },
    [side],
  );
  const clearSide = React.useCallback(() => {
    setReport(null);
    setCap(null);
    side.clear();
  }, [side]);
  const selectFront = React.useCallback(
    (file: File) => {
      setFrontReport(null);
      front.select(file);
    },
    [front],
  );
  const clearFront = React.useCallback(() => {
    setFrontReport(null);
    front.clear();
  }, [front]);

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

  const analyzeFront = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      const outcome = buildSquatFrontReport(frames, aspect);
      if (!outcome.ok) return outcome;
      setFrontReport(outcome.report);
      return { ok: true };
    },
    [],
  );

  // Guarded by the page (notFound); this satisfies the type and never renders.
  if (!config) return null;

  if (!side.slot && !front.slot) {
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
            {supportsFront
              ? " You can add an optional front view too, for knee tracking and left-right symmetry."
              : ""}
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
          onSelect={selectSide}
          prompt={`Drag a side-on ${config.name.toLowerCase()} video here, or choose a file`}
          chooseLabel="Choose video"
        />

        {supportsFront ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <CameraSetupDiagram view="lifting-side" />
            <CameraSetupDiagram view="lifting-front" />
          </div>
        ) : (
          <CameraSetupDiagram view="lifting-side" className="sm:max-w-sm" />
        )}

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

      {side.slot ? (
        <VideoWorkspace
          key={side.slot.url}
          videoUrl={side.slot.url}
          fileName={side.slot.file.name}
          label={supportsFront ? "Side on" : config.name}
          analyzeLabel="Analyze this set"
          analyzeHelper="Plays the video once and reads your form rep by rep, on this device."
          runningNoun="your set"
          analyze={analyze}
          onReset={() => {
            setReport(null);
            setCap(null);
          }}
          onChooseDifferent={clearSide}
        />
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-ink">Side on</h2>
            <p className="text-sm text-ink-muted">
              Required. The main view: depth, balance, and the bar path.
            </p>
          </div>
          <VideoDropzone
            onSelect={selectSide}
            prompt={`Drag a side-on ${config.name.toLowerCase()} video here, or choose a file`}
            chooseLabel="Choose side video"
          />
        </section>
      )}

      {supportsFront ? (
        <section className="flex flex-col gap-3 border-t border-line pt-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-ink">
              Front on{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </h2>
            <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
              Directly in front, whole body and both knees in frame. Adds knee
              tracking and left-right symmetry, which the side view cannot see.
              Film the same kind of set.
            </p>
          </div>
          {front.slot ? (
            <VideoWorkspace
              key={front.slot.url}
              videoUrl={front.slot.url}
              fileName={front.slot.file.name}
              label="Front on"
              changeLabel="Remove front video"
              analyzeLabel="Analyze knee tracking"
              analyzeHelper="Plays the video once and reads knee tracking and symmetry, on this device."
              runningNoun="your set"
              analyze={analyzeFront}
              onReset={() => setFrontReport(null)}
              onChooseDifferent={clearFront}
            />
          ) : (
            <VideoDropzone
              compact
              onSelect={selectFront}
              prompt="Drag a front-on squat video here, or choose a file"
              chooseLabel="Choose front video"
            />
          )}
        </section>
      ) : null}

      <LiftResultsSection
        config={config}
        report={report}
        frontReport={frontReport}
        frames={cap?.frames}
        videoUrl={side.slot?.url}
        aspect={cap?.aspect}
      />
    </div>
  );
}
