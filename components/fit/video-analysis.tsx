"use client";

import * as React from "react";

import {
  DiscomfortSelect,
  type DiscomfortArea,
} from "@/components/fit/discomfort-select";
import { VideoDropzone } from "@/components/fit/video-dropzone";
import { VideoResultsSection } from "@/components/fit/video-results";
import { VideoUpload } from "@/components/fit/video-upload";
import { VideoWorkspace } from "@/components/fit/video-workspace";
import type { FrontalStrokeReport, StrokeReport } from "@/lib/biomechanics";

/*
 * Top-level state machine for Video Fit Analysis: a required side-view video,
 * an optional straight-on (front or rear) companion video, and an optional
 * discomfort question. Neither video file ever leaves this component (no
 * fetch/XHR anywhere here or below); each only ever becomes an in-memory
 * object URL for its <video> element. The two views cannot be told apart
 * automatically, so each has its own clearly-labeled slot.
 *
 * Object URLs are created and revoked inside the event handlers, not in
 * render or effects: StrictMode double-invokes render (which would leak a
 * URL) and re-runs effects (whose cleanup would revoke the URL the video is
 * still playing). Handlers run exactly once per user action. The final URLs
 * are released with the document; object URLs are per-page, so that is
 * bounded.
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

  const selectSide = React.useCallback(
    (file: File) => {
      setSideReport(null);
      side.select(file);
    },
    [side],
  );
  const clearSide = React.useCallback(() => {
    setSideReport(null);
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
          view="side"
          label="Side view"
          onChooseDifferent={clearSide}
          onAnalysis={(result) =>
            setSideReport(result?.kind === "side" ? result.report : null)
          }
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
            view="front"
            label="Front or rear view"
            changeLabel="Remove front video"
            onChooseDifferent={clearFront}
            onAnalysis={(result) =>
              setFrontalReport(
                result?.kind === "frontal" ? result.report : null,
              )
            }
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
