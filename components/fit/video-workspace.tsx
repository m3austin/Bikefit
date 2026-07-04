"use client";

import * as React from "react";
import { Activity, RotateCcw, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfidenceBanner } from "@/components/fit/confidence-banner";
import {
  VideoControls,
  type TimelineMarker,
} from "@/components/fit/video-controls";
import { drawPoseOverlay } from "@/components/fit/draw-pose";
import { useThemeColor } from "@/components/fit/use-theme-color";
import {
  MIN_STROKES_FOR_REPORT,
  averageFrameVisibility,
  buildFrontalStrokeReport,
  buildStrokeReport,
  detectFacingSide,
  isSustainedLowConfidence,
  type ConfidenceSample,
  type FrontalStrokeReport,
  type StrokeReport,
  type TimedFrame,
} from "@/lib/biomechanics";
import {
  createPoseLandmarker,
  type PoseLandmarkerHandle,
} from "@/lib/pose-landmarker";
import type { PoseFrame } from "@/lib/pose-model";

const CONFIDENCE_WINDOW = 60; // frames considered for the "sustained low" check
const CONFIDENCE_THRESHOLD = 0.4;
const SIDE_VOTE_MAX_FRAMES = 240;
// Analysis-pass caps so a long clip can't grow memory without bound. 60 s at
// 60 fps is far more than the few revolutions the analysis needs.
const MAX_ANALYSIS_MS = 60_000;
const MAX_ANALYSIS_SAMPLES = 3_600;

type LandmarkerState = "loading" | "ready" | "error";

/** What an analysis pass produced, discriminated by camera view. */
export type WorkspaceAnalysis =
  | { kind: "side"; report: StrokeReport }
  | { kind: "frontal"; report: FrontalStrokeReport };

type AnalysisState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; result: WorkspaceAnalysis }
  | { status: "failed"; reason: string };

const FAILURE_REASON = {
  side: "We couldn't find at least two full pedal strokes in this video. Record a few steady, seated revolutions from directly side-on and try again.",
  front:
    "We couldn't find at least two full pedal strokes for each leg. Keep both feet in frame, straight-on and level, with steady seated pedaling, and try again.",
} as const;

export function VideoWorkspace({
  videoUrl,
  fileName,
  onChooseDifferent,
  view = "side",
  label = "Video fit analysis",
  changeLabel = "Choose a different video",
  onAnalysis,
}: {
  videoUrl: string;
  fileName: string;
  onChooseDifferent: () => void;
  /**
   * "side" runs facing-side detection and the sagittal pedal-stroke analysis;
   * "front" runs the frontal-plane analysis (knee tracking, symmetry, hip
   * drop). Facing-side detection must never run on a front view: it assumes
   * one side is occluded, which is false head-on.
   */
  view?: "side" | "front";
  /** Kicker text identifying this slot when two videos are on screen. */
  label?: string;
  changeLabel?: string;
  /**
   * Mirrors analysis results to the parent, which owns all results rendering
   * (the Stage 3 results section). Called with null when a new pass starts
   * or one fails, so the parent never holds a stale report.
   */
  onAnalysis?: (result: WorkspaceAnalysis | null) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const landmarkerRef = React.useRef<PoseLandmarkerHandle | null>(null);
  // MediaPipe VIDEO mode requires strictly increasing timestamps and uses
  // them for temporal smoothing, so feed it real (monotonic) wall-clock time.
  const lastDetectTsRef = React.useRef(0);
  const confidenceSamplesRef = React.useRef<ConfidenceSample[]>([]);
  const sideFramesRef = React.useRef<PoseFrame[]>([]);
  const lastUiUpdateRef = React.useRef(0);
  const accentColorRef = React.useRef("#3ddc97");
  const aspectRef = React.useRef(1);
  const analyzingRef = React.useRef(false);
  const collectedRef = React.useRef<TimedFrame[]>([]);

  const [landmarkerState, setLandmarkerState] =
    React.useState<LandmarkerState>("loading");
  const [retryToken, setRetryToken] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [liveConfidence, setLiveConfidence] = React.useState<number | null>(
    null,
  );
  const [side, setSide] = React.useState<"left" | "right" | null>(null);
  const [lowConfidence, setLowConfidence] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<AnalysisState>({
    status: "idle",
  });

  const accentColor = useThemeColor("--accent", "#3ddc97");
  React.useEffect(() => {
    accentColorRef.current = accentColor;
  }, [accentColor]);

  // Keep the parent callback out of effect/callback dependency lists.
  const onAnalysisRef = React.useRef(onAnalysis);
  React.useEffect(() => {
    onAnalysisRef.current = onAnalysis;
  }, [onAnalysis]);

  // Create this workspace's own pose landmarker (VIDEO mode is stateful, so
  // side and front views can't share one; see lib/pose-landmarker.ts) and
  // close it on unmount. retryToken only changes via the "Try again" button,
  // which resets state to "loading" itself, so this effect never needs to
  // setState synchronously on entry.
  React.useEffect(() => {
    let cancelled = false;
    let owned: PoseLandmarkerHandle | null = null;
    createPoseLandmarker()
      .then((handle) => {
        if (cancelled) {
          handle.close();
          return;
        }
        owned = handle;
        landmarkerRef.current = handle;
        setLandmarkerState("ready");
      })
      .catch(() => {
        if (!cancelled) setLandmarkerState("error");
      });
    return () => {
      cancelled = true;
      landmarkerRef.current = null;
      owned?.close();
    };
  }, [retryToken]);

  const finalizeAnalysis = React.useCallback(() => {
    if (!analyzingRef.current) return;
    analyzingRef.current = false;
    videoRef.current?.pause();
    const frames = collectedRef.current;
    collectedRef.current = [];

    let result: WorkspaceAnalysis;
    let enoughStrokes: boolean;
    if (view === "side") {
      const report = buildStrokeReport(frames, aspectRef.current);
      result = { kind: "side", report };
      enoughStrokes = report.strokeCount >= MIN_STROKES_FOR_REPORT;
    } else {
      const report = buildFrontalStrokeReport(frames, aspectRef.current);
      result = { kind: "frontal", report };
      enoughStrokes =
        Math.min(report.strokeCountLeft, report.strokeCountRight) >=
        MIN_STROKES_FOR_REPORT;
    }

    if (!enoughStrokes) {
      setAnalysis({
        status: "failed",
        reason: view === "side" ? FAILURE_REASON.side : FAILURE_REASON.front,
      });
      onAnalysisRef.current?.(null);
    } else {
      setAnalysis({ status: "done", result });
      onAnalysisRef.current?.(result);
    }
  }, [view]);

  const draw = React.useCallback((frame: PoseFrame) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const widthCss = canvas.width / dpr;
    const heightCss = canvas.height / dpr;
    drawPoseOverlay(ctx, widthCss, heightCss, frame, accentColorRef.current);
  }, []);

  const handleFrame = React.useCallback(
    (frame: PoseFrame, mediaTimeMs: number) => {
      draw(frame);

      if (analyzingRef.current) {
        collectedRef.current.push({ tMs: mediaTimeMs, frame });
        if (
          mediaTimeMs > MAX_ANALYSIS_MS ||
          collectedRef.current.length >= MAX_ANALYSIS_SAMPLES
        ) {
          finalizeAnalysis();
        }
      }

      const visibility = averageFrameVisibility(frame);
      const samples = confidenceSamplesRef.current;
      samples.push({ timestampMs: mediaTimeMs, visibility });
      if (samples.length > CONFIDENCE_WINDOW * 3) samples.shift();

      // Facing-side detection is meaningless (and misleading) on a head-on
      // view, so only the side view feeds the vote buffer.
      if (view === "side") {
        const sideFrames = sideFramesRef.current;
        sideFrames.push(frame);
        if (sideFrames.length > SIDE_VOTE_MAX_FRAMES) sideFrames.shift();
      }

      const now = performance.now();
      if (now - lastUiUpdateRef.current > 150) {
        lastUiUpdateRef.current = now;
        setLiveConfidence(visibility);
        if (view === "side") setSide(detectFacingSide(sideFramesRef.current).side);
        setLowConfidence(
          isSustainedLowConfidence(samples, {
            windowSize: CONFIDENCE_WINDOW,
            threshold: CONFIDENCE_THRESHOLD,
          }),
        );
      }
    },
    [draw, finalizeAnalysis, view],
  );

  // Per-frame pose detection, synced to actual decoded video frames when the
  // browser supports requestVideoFrameCallback, falling back to
  // requestAnimationFrame otherwise.
  React.useEffect(() => {
    if (landmarkerState !== "ready") return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let handle: number | null = null;
    // TS's DOM lib declares this as always present, but real-world support is
    // newer than most of the rest of the DOM API, so guard it at runtime too.
    const useVfc = typeof video.requestVideoFrameCallback === "function";

    function runDetection(mediaTimeSec?: number) {
      const landmarker = landmarkerRef.current;
      if (!landmarker || !video) return;
      // Not decodable yet (metadata still loading): nothing to detect on.
      if (video.videoWidth === 0 || video.readyState < 2) return;
      const ts = Math.max(
        Math.round(performance.now()),
        lastDetectTsRef.current + 1,
      );
      lastDetectTsRef.current = ts;
      try {
        const result = landmarker.detect(video, ts);
        handleFrame(
          result.landmarks[0] ?? [],
          (mediaTimeSec ?? video.currentTime) * 1000,
        );
      } catch {
        // A transient decode/detect hiccup should not stop playback.
      }
    }

    function tick(_now?: number, metadata?: { mediaTime?: number }) {
      if (cancelled) return;
      runDetection(metadata?.mediaTime);
      scheduleNext();
    }

    function scheduleNext() {
      if (cancelled || !video) return;
      if (useVfc) {
        handle = video.requestVideoFrameCallback(tick);
      } else if (!video.paused && !video.ended) {
        handle = requestAnimationFrame(() => tick());
      }
    }

    function onSeeked() {
      if (!useVfc) runDetection();
    }

    scheduleNext();
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("play", scheduleNext);

    return () => {
      cancelled = true;
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("play", scheduleNext);
      if (handle != null) {
        if (useVfc) video.cancelVideoFrameCallback(handle);
        else cancelAnimationFrame(handle);
      }
    };
  }, [landmarkerState, handleFrame]);

  // Keep the canvas pixel size matched to the video's rendered box.
  React.useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    function resize() {
      if (!video || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const width = video.clientWidth || 1;
      const height = video.clientHeight || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(video);
    return () => observer.disconnect();
  }, [videoUrl]);

  const handlePlayPause = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const handleSeek = React.useCallback((seconds: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = seconds;
  }, []);

  const handleRateChange = React.useCallback((rate: number) => {
    setPlaybackRate(rate);
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
  }, []);

  const startAnalysis = React.useCallback(() => {
    const video = videoRef.current;
    if (!video || landmarkerRef.current === null) return;
    collectedRef.current = [];
    analyzingRef.current = true;
    setAnalysis({ status: "running" });
    onAnalysisRef.current?.(null);
    setPlaybackRate(1);
    video.playbackRate = 1;
    video.currentTime = 0;
    void video.play();
  }, []);

  const cancelAnalysis = React.useCallback(() => {
    analyzingRef.current = false;
    collectedRef.current = [];
    videoRef.current?.pause();
    setAnalysis({ status: "idle" });
  }, []);

  const analyzing = analysis.status === "running";

  // Key frames land on the timeline once the side analysis has run (the
  // frontal report carries no single set of key frames; it is two legs).
  const markers: TimelineMarker[] | undefined =
    analysis.status === "done" && analysis.result.kind === "side"
      ? [
          ...analysis.result.report.bdcTMs.map((tMs) => ({
            tMs,
            kind: "bdc" as const,
          })),
          ...analysis.result.report.threeOClockTMs.map((tMs) => ({
            tMs,
            kind: "three" as const,
          })),
        ]
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
            {label}
          </p>
          <h2 className="text-xl font-semibold text-ink">{fileName}</h2>
        </div>
        <Button variant="outline" onClick={onChooseDifferent}>
          <RotateCcw />
          {changeLabel}
        </Button>
      </div>

      {landmarkerState === "error" ? (
        <div className="flex flex-col gap-3 rounded-md border border-danger/40 bg-danger/10 p-4">
          <p className="flex items-center gap-2 text-sm text-ink">
            <TriangleAlert className="size-4 text-danger" aria-hidden="true" />
            The pose tracker couldn&apos;t load. Check your connection and
            try again.
          </p>
          <Button
            variant="outline"
            className="self-start"
            onClick={() => {
              setLandmarkerState("loading");
              setRetryToken((t) => t + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {/* Shrink-wrapped so the canvas overlay always matches the video box
          exactly, and portrait phone footage stays a sane height. */}
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-md bg-[#000]">
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted
          className="block h-auto max-h-[70dvh] w-auto max-w-full"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setDuration(v.duration);
            aspectRef.current =
              v.videoHeight > 0 ? v.videoWidth / v.videoHeight : 1;
          }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={finalizeAnalysis}
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
        {landmarkerState === "loading" ? (
          <span>Loading the pose tracker (only needed the first time)...</span>
        ) : null}
        {landmarkerState === "ready" ? (
          <>
            {view === "side" ? (
              <span>
                Tracking side:{" "}
                <span className="measurement font-medium text-ink">
                  {side ? (side === "left" ? "Left" : "Right") : "..."}
                </span>
              </span>
            ) : null}
            <span>
              Confidence:{" "}
              <span className="measurement font-medium text-ink">
                {liveConfidence != null
                  ? `${Math.round(liveConfidence * 100)}%`
                  : "..."}
              </span>
            </span>
          </>
        ) : null}
      </div>

      {lowConfidence ? <ConfidenceBanner /> : null}

      {analyzing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-4">
          <p className="text-sm text-ink" role="status">
            Analyzing your pedaling,{" "}
            <span className="measurement">
              {currentTime.toFixed(0)}s / {duration ? duration.toFixed(0) : "?"}s
            </span>
            . Everything stays on this device.
          </p>
          <Button variant="outline" onClick={cancelAnalysis}>
            <X />
            Cancel
          </Button>
        </div>
      ) : (
        <VideoControls
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onRateChange={handleRateChange}
          markers={markers}
        />
      )}

      {!analyzing ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={startAnalysis}
            disabled={landmarkerState !== "ready" || duration === 0}
          >
            <Activity />
            {analysis.status === "done"
              ? "Analyze again"
              : view === "side"
                ? "Analyze pedal strokes"
                : "Analyze knee tracking"}
          </Button>
          <p className="text-sm text-ink-muted">
            {view === "side"
              ? "Plays the video once and measures your joint angles, on this device."
              : "Plays the video once and measures knee tracking, symmetry, and hip drop, on this device."}
          </p>
        </div>
      ) : null}

      {analysis.status === "failed" ? (
        <div
          role="note"
          aria-label="Analysis did not complete"
          className="flex gap-3 rounded-md border border-warn/40 bg-warn/10 p-4 text-ink"
        >
          <TriangleAlert
            className="mt-0.5 shrink-0 text-warn"
            aria-hidden="true"
          />
          <p className="text-sm text-ink-muted">{analysis.reason}</p>
        </div>
      ) : null}

    </div>
  );
}
