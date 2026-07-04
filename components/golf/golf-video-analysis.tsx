"use client";

import * as React from "react";

import { VideoDropzone } from "@/components/fit/video-dropzone";
import { CameraSetupDiagram } from "@/components/kernel/camera-setup";
import {
  VideoWorkspace,
  type AnalyzeOutcome,
} from "@/components/kernel/video-workspace";
import { GolfResultsSection } from "@/components/golf/golf-results";
import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  buildSwingReport,
  type SwingReport,
} from "@/lib/sports/golf/biomechanics";

/*
 * GolfFit swing video analysis: a down-the-line view and a face-on view,
 * either or both, composed on the kernel video workspace. The two views
 * cannot be told apart automatically, so each has its own labeled slot.
 * Videos never leave the device (kernel rule); object URLs are created and
 * revoked in event handlers only (StrictMode-safe, same as cycling).
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
  "One full swing per clip, with a second of stillness at address before you start. The stillness is how the analysis finds your setup.",
  "Tripod or a propped phone; whole body and club in frame through the finish.",
  "Good, even light. Golf happens outside, which helps.",
];

function markersFor(report: SwingReport) {
  const p = report.phases;
  return [
    { tMs: p.addressTMs, label: "address", tone: "muted" as const },
    { tMs: p.takeawayTMs, label: "takeaway", tone: "muted" as const },
    { tMs: p.topTMs, label: "top", tone: "accent" as const },
    { tMs: p.impactTMs, label: "impact", tone: "accent" as const },
    { tMs: p.followTMs, label: "finish", tone: "muted" as const },
  ];
}

type Captured = { frames: TimedFrame[]; aspect: number };

export function GolfVideoAnalysis() {
  const dtl = useVideoSlot();
  const face = useVideoSlot();
  const [dtlReport, setDtlReport] = React.useState<SwingReport | null>(null);
  const [faceReport, setFaceReport] = React.useState<SwingReport | null>(null);
  const [dtlCap, setDtlCap] = React.useState<Captured | null>(null);
  const [faceCap, setFaceCap] = React.useState<Captured | null>(null);

  const selectDtl = React.useCallback(
    (file: File) => {
      setDtlReport(null);
      setDtlCap(null);
      dtl.select(file);
    },
    [dtl],
  );
  const clearDtl = React.useCallback(() => {
    setDtlReport(null);
    setDtlCap(null);
    dtl.clear();
  }, [dtl]);
  const selectFace = React.useCallback(
    (file: File) => {
      setFaceReport(null);
      setFaceCap(null);
      face.select(file);
    },
    [face],
  );
  const clearFace = React.useCallback(() => {
    setFaceReport(null);
    setFaceCap(null);
    face.clear();
  }, [face]);

  const analyzeDtl = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      const outcome = buildSwingReport(frames, aspect, "dtl");
      if (!outcome.ok) return outcome;
      setDtlReport(outcome.report);
      setDtlCap({ frames, aspect });
      return { ok: true, markers: markersFor(outcome.report) };
    },
    [],
  );
  const analyzeFace = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      const outcome = buildSwingReport(frames, aspect, "face");
      if (!outcome.ok) return outcome;
      setFaceReport(outcome.report);
      setFaceCap({ frames, aspect });
      return { ok: true, markers: markersFor(outcome.report) };
    },
    [],
  );

  if (!dtl.slot && !face.slot) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
            GolfFit
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Film one swing, side or face on
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            Set your phone down, hit one shot, and the analysis reads your
            tempo, posture, and turn on this device. The video is never
            uploaded anywhere. Either view works; both together see the most.
          </p>
        </div>

        <VideoDropzone
          onSelect={selectDtl}
          prompt="Drag a down-the-line video here, or choose a file"
          chooseLabel="Choose video"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CameraSetupDiagram view="golf-dtl" />
          <CameraSetupDiagram view="golf-face" />
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
      <h1 className="sr-only">Swing video analysis</h1>

      {dtl.slot ? (
        <VideoWorkspace
          key={dtl.slot.url}
          videoUrl={dtl.slot.url}
          fileName={dtl.slot.file.name}
          label="Down the line"
          analyzeLabel="Analyze this swing"
          analyzeHelper="Plays the video once and reads your tempo, posture, and head movement, on this device."
          runningNoun="your swing"
          analyze={analyzeDtl}
          onReset={() => {
            setDtlReport(null);
            setDtlCap(null);
          }}
          onChooseDifferent={clearDtl}
        />
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-ink">
              Down the line{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </h2>
            <p className="text-sm text-ink-muted">
              Camera behind you, looking along the target line. Best view for
              posture and plane.
            </p>
          </div>
          <VideoDropzone
            compact
            onSelect={selectDtl}
            prompt="Drag a down-the-line video here, or choose a file"
            chooseLabel="Choose down-the-line video"
          />
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">
            Face on{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            Camera directly in front of you, perpendicular to the target
            line. Best view for turn, sway, and head movement. Film the same
            kind of swing as the other view.
          </p>
        </div>
        {face.slot ? (
          <VideoWorkspace
            key={face.slot.url}
            videoUrl={face.slot.url}
            fileName={face.slot.file.name}
            label="Face on"
            changeLabel="Remove face-on video"
            analyzeLabel="Analyze this swing"
            analyzeHelper="Plays the video once and reads your turn, slide, and lead arm, on this device."
            runningNoun="your swing"
            analyze={analyzeFace}
            onReset={() => {
              setFaceReport(null);
              setFaceCap(null);
            }}
            onChooseDifferent={clearFace}
          />
        ) : (
          <VideoDropzone
            compact
            onSelect={selectFace}
            prompt="Drag a face-on video here, or choose a file"
            chooseLabel="Choose face-on video"
          />
        )}
      </section>

      <GolfResultsSection
        dtlReport={dtlReport}
        faceReport={faceReport}
        dtlFrames={dtlCap?.frames}
        faceFrames={faceCap?.frames}
        dtlUrl={dtl.slot?.url}
        faceUrl={face.slot?.url}
        aspect={dtlCap?.aspect ?? faceCap?.aspect}
      />
    </div>
  );
}
