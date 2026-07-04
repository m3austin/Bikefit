"use client";

import * as React from "react";

import { VideoDropzone } from "@/components/fit/video-dropzone";
import { CameraSetupDiagram } from "@/components/kernel/camera-setup";
import {
  VideoWorkspace,
  type AnalyzeOutcome,
} from "@/components/kernel/video-workspace";
import { RunResultsSection } from "@/components/running/run-results";
import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  buildGaitReport,
  buildRearGaitReport,
  type GaitReport,
  type RearGaitReport,
} from "@/lib/sports/running/biomechanics";

/*
 * RunFit gait video analysis: a side-on view (primary) and a rear view
 * (optional, for pelvic drop), composed on the kernel video workspace. The
 * two views cannot be told apart automatically, so each has its own labeled
 * slot. Videos never leave the device (kernel rule); object URLs are created
 * and revoked in event handlers only (StrictMode-safe, same as cycling).
 */

type Slot = { file: File; url: string };

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

const TIPS = [
  "Ten to fifteen seconds of steady, comfortable running is plenty. Warm up first so it is your normal stride.",
  "A tripod or a propped phone beats a handheld friend, and the whole body should stay in frame.",
  "Treadmill strongly preferred: the fixed frame is what makes the numbers trustworthy. Outdoors works only if the camera does not move.",
];

function sideMarkers(report: GaitReport) {
  return [
    ...report.contactTMs.map((tMs) => ({
      tMs,
      label: "footstrike",
      tone: "accent" as const,
    })),
    ...report.toeOffTMs.map((tMs) => ({
      tMs,
      label: "toe-off",
      tone: "muted" as const,
    })),
  ];
}

function rearMarkers(report: RearGaitReport) {
  return [
    ...report.contactTMsLeft.map((tMs) => ({
      tMs,
      label: "left footstrike",
      tone: "accent" as const,
    })),
    ...report.contactTMsRight.map((tMs) => ({
      tMs,
      label: "right footstrike",
      tone: "muted" as const,
    })),
  ];
}

type Captured = { frames: TimedFrame[]; aspect: number };

export function RunVideoAnalysis() {
  const side = useVideoSlot();
  const rear = useVideoSlot();
  const [sideReport, setSideReport] = React.useState<GaitReport | null>(null);
  const [rearReport, setRearReport] = React.useState<RearGaitReport | null>(
    null,
  );
  const [sideCap, setSideCap] = React.useState<Captured | null>(null);

  const selectSide = React.useCallback(
    (file: File) => {
      setSideReport(null);
      setSideCap(null);
      side.select(file);
    },
    [side],
  );
  const clearSide = React.useCallback(() => {
    setSideReport(null);
    setSideCap(null);
    side.clear();
  }, [side]);
  const selectRear = React.useCallback(
    (file: File) => {
      setRearReport(null);
      rear.select(file);
    },
    [rear],
  );
  const clearRear = React.useCallback(() => {
    setRearReport(null);
    rear.clear();
  }, [rear]);

  const analyzeSide = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      const outcome = buildGaitReport(frames, aspect);
      if (!outcome.ok) return outcome;
      setSideReport(outcome.report);
      setSideCap({ frames, aspect });
      return { ok: true, markers: sideMarkers(outcome.report) };
    },
    [],
  );
  const analyzeRear = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      const outcome = buildRearGaitReport(frames, aspect);
      if (!outcome.ok) return outcome;
      setRearReport(outcome.report);
      return { ok: true, markers: rearMarkers(outcome.report) };
    },
    [],
  );

  if (!side.slot && !rear.slot) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
            RunFit
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Film a few strides, side on
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            Prop your phone beside the treadmill, run easy for fifteen
            seconds, and the analysis reads your cadence, landing, posture,
            and bounce on this device. The video is never uploaded anywhere.
          </p>
        </div>

        <VideoDropzone
          onSelect={selectSide}
          prompt="Drag a side-on running video here, or choose a file"
          chooseLabel="Choose video"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CameraSetupDiagram view="running-side" />
          <CameraSetupDiagram view="running-rear" />
        </div>

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
      <h1 className="sr-only">Gait video analysis</h1>

      {side.slot ? (
        <VideoWorkspace
          key={side.slot.url}
          videoUrl={side.slot.url}
          fileName={side.slot.file.name}
          label="Side on"
          analyzeLabel="Analyze this run"
          analyzeHelper="Plays the video once and reads your cadence, landing, posture, and bounce, on this device."
          runningNoun="your stride"
          analyze={analyzeSide}
          onReset={() => {
            setSideReport(null);
            setSideCap(null);
          }}
          onChooseDifferent={clearSide}
        />
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-ink">
              Side on{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </h2>
            <p className="text-sm text-ink-muted">
              Camera square to the treadmill, level with your hips. The main
              view: cadence, landing, posture, and bounce.
            </p>
          </div>
          <VideoDropzone
            compact
            onSelect={selectSide}
            prompt="Drag a side-on running video here, or choose a file"
            chooseLabel="Choose side-on video"
          />
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">
            From behind{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            Camera directly behind you, same height. Adds the pelvic-drop
            reading the side view cannot see. Film the same kind of easy,
            steady running.
          </p>
        </div>
        {rear.slot ? (
          <VideoWorkspace
            key={rear.slot.url}
            videoUrl={rear.slot.url}
            fileName={rear.slot.file.name}
            label="From behind"
            changeLabel="Remove rear-view video"
            analyzeLabel="Analyze this run"
            analyzeHelper="Plays the video once and reads your hip drop and stance width, on this device."
            runningNoun="your stride"
            analyze={analyzeRear}
            onReset={() => setRearReport(null)}
            onChooseDifferent={clearRear}
          />
        ) : (
          <VideoDropzone
            compact
            onSelect={selectRear}
            prompt="Drag a rear-view running video here, or choose a file"
            chooseLabel="Choose rear-view video"
          />
        )}
      </section>

      <RunResultsSection
        sideReport={sideReport}
        rearReport={rearReport}
        sideFrames={sideCap?.frames}
        sideUrl={side.slot?.url}
        aspect={sideCap?.aspect}
      />
    </div>
  );
}
