"use client";

import * as React from "react";

import {
  DiscomfortSelect,
  type DiscomfortArea,
} from "@/components/fit/discomfort-select";
import { VideoDropzone } from "@/components/fit/video-dropzone";
import { VideoResultsSection } from "@/components/fit/video-results";
import { VideoUpload } from "@/components/fit/video-upload";
import {
  VideoWorkspace,
  type AnalyzeOutcome,
} from "@/components/kernel/video-workspace";
import type { TimedFrame } from "@/lib/kernel/tracking";
import {
  MIN_STROKES_FOR_REPORT,
  buildFrontalStrokeReport,
  buildStrokeReport,
  type FrontalStrokeReport,
  type StrokeReport,
} from "@/lib/sports/cycling/biomechanics";

/*
 * Cycling (BikeFit) video analysis: a required side-view video, an optional
 * straight-on (front or rear) companion video, and an optional discomfort
 * question, composed on the kernel video workspace. Neither video file ever
 * leaves this component (no fetch/XHR anywhere here or below); each only
 * ever becomes an in-memory object URL for its <video> element.
 *
 * Object URLs are created and revoked inside the event handlers, not in
 * render or effects: StrictMode double-invokes render (which would leak a
 * URL) and re-runs effects (whose cleanup would revoke the URL the video is
 * still playing). Handlers run exactly once per user action.
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

const FRONT_GUIDANCE =
  "A straight-on view adds what the side view cannot see: how your knees track through the stroke and whether your left and right sides move alike. Center the camera on the bike, level with it, from directly in front or directly behind. Use a tripod or something solid; knee tracking is a small movement and camera shake drowns it out. Keep both knees and both feet in frame, and record the same 15 to 20 seconds of steady pedaling.";

export function VideoAnalysis() {
  const side = useVideoSlot();
  const front = useVideoSlot();
  // Captured with the analysis input for later guidance; nothing consumes it
  // yet (the rules engine is a future stage).
  const [discomfort, setDiscomfort] = React.useState<DiscomfortArea[]>([]);
  // Analysis results lifted from the workspaces so the combined view can
  // show both tables together. Cleared whenever the matching video changes.
  const [sideReport, setSideReport] = React.useState<StrokeReport | null>(null);
  const [frontalReport, setFrontalReport] =
    React.useState<FrontalStrokeReport | null>(null);
  const [sideCap, setSideCap] = React.useState<{
    frames: TimedFrame[];
    aspect: number;
  } | null>(null);

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
  const selectFront = React.useCallback(
    (file: File) => {
      setFrontalReport(null);
      front.select(file);
    },
    [front],
  );
  const clearFront = React.useCallback(() => {
    setFrontalReport(null);
    front.clear();
  }, [front]);

  // The module's analyzers: compute the typed report, keep it in module
  // state, hand the workspace shell just the outcome and timeline markers.
  const analyzeSide = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      const report = buildStrokeReport(frames, aspect);
      if (report.strokeCount < MIN_STROKES_FOR_REPORT) {
        return {
          ok: false,
          reason:
            "We couldn't find at least two full pedal strokes in this video. Record a few steady, seated revolutions from directly side-on and try again.",
        };
      }
      setSideReport(report);
      setSideCap({ frames, aspect });
      return {
        ok: true,
        markers: [
          ...report.bdcTMs.map((tMs) => ({
            tMs,
            label: "stroke bottom",
            tone: "accent" as const,
          })),
          ...report.threeOClockTMs.map((tMs) => ({
            tMs,
            label: "3 o'clock",
            tone: "muted" as const,
          })),
        ],
      };
    },
    [],
  );

  const analyzeFront = React.useCallback(
    (frames: TimedFrame[], aspect: number): AnalyzeOutcome => {
      const report = buildFrontalStrokeReport(frames, aspect);
      if (
        Math.min(report.strokeCountLeft, report.strokeCountRight) <
        MIN_STROKES_FOR_REPORT
      ) {
        return {
          ok: false,
          reason:
            "We couldn't find at least two full pedal strokes for each leg. Keep both feet in frame, straight-on and level, with steady seated pedaling, and try again.",
        };
      }
      setFrontalReport(report);
      return { ok: true };
    },
    [],
  );

  if (!side.slot && !front.slot) {
    return <VideoUpload onSelect={selectSide} />;
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="sr-only">Video fit analysis</h1>

      {side.slot ? (
        <VideoWorkspace
          key={side.slot.url}
          videoUrl={side.slot.url}
          fileName={side.slot.file.name}
          label="Side view"
          analyzeLabel="Analyze pedal strokes"
          analyzeHelper="Plays the video once and measures your joint angles, on this device."
          runningNoun="your pedaling"
          showFacingSide
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
            <h2 className="text-lg font-semibold text-ink">Side view</h2>
            <p className="text-sm text-ink-muted">
              Required. Filmed from directly to the side, level with the bike.
            </p>
          </div>
          <VideoDropzone
            onSelect={selectSide}
            prompt="Drag a side-view video here, or choose a file"
            chooseLabel="Choose side video"
          />
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">
            Front or rear view{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            {FRONT_GUIDANCE}
          </p>
        </div>
        {front.slot ? (
          <VideoWorkspace
            key={front.slot.url}
            videoUrl={front.slot.url}
            fileName={front.slot.file.name}
            label="Front or rear view"
            changeLabel="Remove front video"
            analyzeLabel="Analyze knee tracking"
            analyzeHelper="Plays the video once and measures knee tracking, symmetry, and hip drop, on this device."
            runningNoun="your pedaling"
            analyze={analyzeFront}
            onReset={() => setFrontalReport(null)}
            onChooseDifferent={clearFront}
          />
        ) : (
          <VideoDropzone
            compact
            onSelect={selectFront}
            prompt="Drag a straight-on video here, or choose a file"
            chooseLabel="Choose front video"
          />
        )}
      </section>

      <VideoResultsSection
        sideReport={sideReport}
        frontalReport={frontalReport}
        sideFrames={sideCap?.frames}
        sideUrl={side.slot?.url}
        aspect={sideCap?.aspect}
      />

      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">
            Any discomfort when you ride?
          </h2>
          <p className="text-sm text-ink-muted">
            Optional. Kept with your analysis so later guidance can take it
            into account.
          </p>
        </div>
        <DiscomfortSelect value={discomfort} onChange={setDiscomfort} />
      </section>
    </div>
  );
}
