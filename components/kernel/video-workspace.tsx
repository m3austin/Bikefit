"use client";

import * as React from "react";
import { Activity, RotateCcw, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ConfidenceBanner } from "@/components/fit/confidence-banner";
import {
  VideoControls,
  type TimelineMarker,
} from "@/components/fit/video-controls";
import { drawPoseOverlay } from "@/components/fit/draw-pose";
import { useThemeColor } from "@/components/fit/use-theme-color";
import { LoadingCharacter } from "@/components/kernel/loading-character";
import { analysisTimestamps } from "@/lib/kernel/frame-schedule";
import {
  averageFrameVisibility,
  detectFacingSide,
  isSustainedLowConfidence,
  type ConfidenceSample,
  type TimedFrame,
} from "@/lib/kernel/tracking";
import {
  createPoseLandmarker,
  type PoseLandmarkerHandle,
} from "@/lib/pose-landmarker";
import type { PoseFrame } from "@/lib/pose-model";

/*
 * The kernel video workspace (docs/sportfit/01-Architecture): playback,
 * on-device pose tracking with the skeleton overlay, confidence handling,
 * decode-error guidance, and the analyze pass. Sport modules supply the
 * words and the math: an analyze closure that eats collected frames,
 * stores its own typed report wherever it likes, and returns ok (with
 * optional timeline markers) or a plain-language failure reason.
 */

const CONFIDENCE_WINDOW = 60; // frames considered for the "sustained low" check
const CONFIDENCE_THRESHOLD = 0.4;
const SIDE_VOTE_MAX_FRAMES = 240;
// Analysis-pass caps so a long clip can't grow memory without bound.
const MAX_ANALYSIS_MS = 60_000;
const MAX_ANALYSIS_SAMPLES = 3_600;
// Desired seek spacing for the offline pass: ~60fps, finer than typical phone
// capture, so fast events (impact, foot contact, chest touch) are sampled
// densely. The schedule coarsens this to fit the budget on long clips.
const ANALYSIS_STEP_MS = 1000 / 60;
// If a browser withholds the "seeked" event (target already current), don't
// hang the pass; move on after this long.
const SEEK_TIMEOUT_MS = 600;

type LandmarkerState = "loading" | "ready" | "error";

/** m:ss.d for the trim readout (tenths, so a tight window is legible). */
function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${mins}:${secs}`;
}

/** Seek the video and resolve once the frame is decoded ("seeked"), with a
 * timeout so a withheld event (target already current) can't hang the pass. */
function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener("seeked", done);
      resolve();
    };
    const timer = setTimeout(done, SEEK_TIMEOUT_MS);
    video.addEventListener("seeked", done);
    try {
      video.currentTime = seconds;
    } catch {
      done();
    }
  });
}

/** What a module's analyze closure reports back to the workspace shell. */
export type AnalyzeOutcome =
  | { ok: true; markers?: TimelineMarker[] }
  | { ok: false; reason: string };

type AnalysisState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; markers?: TimelineMarker[] }
  | { status: "failed"; reason: string };

export function VideoWorkspace({
  videoUrl,
  fileName,
  onChooseDifferent,
  label,
  changeLabel = "Choose a different video",
  analyzeLabel,
  analyzeHelper,
  runningNoun = "your movement",
  showFacingSide = false,
  analyze,
  onReset,
}: {
  videoUrl: string;
  fileName: string;
  onChooseDifferent: () => void;
  /** Kicker text identifying this slot when several videos are on screen. */
  label: string;
  changeLabel?: string;
  /** The analyze button, e.g. "Analyze pedal strokes", "Analyze your swing". */
  analyzeLabel: string;
  /** Helper sentence beside the button (plain-precise register). */
  analyzeHelper: string;
  /** Fills "Analyzing {runningNoun}, 3s / 12s" while the pass runs. */
  runningNoun?: string;
  /**
   * Show the live facing-side readout. Only meaningful for side-on views;
   * facing-side detection assumes one side is occluded, false head-on.
   */
  showFacingSide?: boolean;
  /**
   * The module's analysis: consume the collected frames (media-timed, aspect
   * given), store any typed report in the module's own state, and return ok
   * with optional timeline markers, or a plain-language failure reason.
   */
  analyze: (frames: TimedFrame[], aspectRatio: number) => AnalyzeOutcome;
  /** Called when a new pass starts, so the parent clears its stale report. */
  onReset?: () => void;
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
  // The analysis pass steps the video by seeking, not by real-time playback,
  // so a slow device still processes every scheduled frame. This guards
  // against overlapping runs and cancellation.
  const analysisRunRef = React.useRef(0);

  const [landmarkerState, setLandmarkerState] =
    React.useState<LandmarkerState>("loading");
  const [retryToken, setRetryToken] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  // Optional trim window (ms): analysis is limited to [trimStartMs, trimEndMs].
  // Bracketing just the movement removes walk-ins, setups, and practice reps
  // that would otherwise seed phantom cycles and misplaced start points.
  const [trimStartMs, setTrimStartMs] = React.useState(0);
  const [trimEndMs, setTrimEndMs] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [liveConfidence, setLiveConfidence] = React.useState<number | null>(
    null,
  );
  const [side, setSide] = React.useState<"left" | "right" | null>(null);
  const [lowConfidence, setLowConfidence] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<AnalysisState>({
    status: "idle",
  });
  // 0..1 progress through the offline analysis pass, for the progress readout.
  const [analysisProgress, setAnalysisProgress] = React.useState(0);
  // The browser cannot decode this file (commonly an iPhone HEVC recording
  // opened in a browser without an HEVC decoder). Resets with a new video,
  // since a new videoUrl remounts the workspace via its key.
  const [videoUnplayable, setVideoUnplayable] = React.useState(false);

  const accentColor = useThemeColor("--accent", "#3ddc97");
  React.useEffect(() => {
    accentColorRef.current = accentColor;
  }, [accentColor]);

  // Keep the module callbacks out of effect/callback dependency lists.
  const analyzeRef = React.useRef(analyze);
  const onResetRef = React.useRef(onReset);
  React.useEffect(() => {
    analyzeRef.current = analyze;
    onResetRef.current = onReset;
  }, [analyze, onReset]);

  // Create this workspace's own pose landmarker (VIDEO mode is stateful, so
  // two on-screen videos can't share one; see lib/pose-landmarker.ts) and
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

    const outcome = analyzeRef.current(frames, aspectRef.current);
    if (outcome.ok) {
      setAnalysis({ status: "done", markers: outcome.markers });
    } else {
      setAnalysis({ status: "failed", reason: outcome.reason });
    }
  }, []);

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
      // view, so only side-on views feed the vote buffer.
      if (showFacingSide) {
        const sideFrames = sideFramesRef.current;
        sideFrames.push(frame);
        if (sideFrames.length > SIDE_VOTE_MAX_FRAMES) sideFrames.shift();
      }

      const now = performance.now();
      if (now - lastUiUpdateRef.current > 150) {
        lastUiUpdateRef.current = now;
        setLiveConfidence(visibility);
        if (showFacingSide) {
          setSide(detectFacingSide(sideFramesRef.current).side);
        }
        setLowConfidence(
          isSustainedLowConfidence(samples, {
            windowSize: CONFIDENCE_WINDOW,
            threshold: CONFIDENCE_THRESHOLD,
          }),
        );
      }
    },
    [draw, finalizeAnalysis, showFacingSide],
  );

  // Detect the pose on the currently decoded frame and route it to handleFrame
  // stamped with `mediaTimeMs`. Shared by the live-preview loop and the
  // offline analysis pass, so both go through one monotonic-timestamp path.
  const detectAt = React.useCallback(
    (mediaTimeMs: number) => {
      const landmarker = landmarkerRef.current;
      const video = videoRef.current;
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
        handleFrame(result.landmarks[0] ?? [], mediaTimeMs);
      } catch {
        // A transient decode/detect hiccup should not stop playback.
      }
    },
    [handleFrame],
  );

  // Live-preview detection while the user scrubs or plays, synced to decoded
  // frames via requestVideoFrameCallback (rAF fallback). It YIELDS during the
  // analysis pass: the seek loop owns detection then, so this must not also
  // detect (that would double-count frames and fight the monotonic timestamp).
  React.useEffect(() => {
    if (landmarkerState !== "ready") return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let handle: number | null = null;
    const useVfc = typeof video.requestVideoFrameCallback === "function";

    function tick(_now?: number, metadata?: { mediaTime?: number }) {
      if (cancelled || !video) return;
      if (!analyzingRef.current) {
        detectAt((metadata?.mediaTime ?? video.currentTime) * 1000);
      }
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
      if (!useVfc && !analyzingRef.current) detectAt(video!.currentTime * 1000);
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
  }, [landmarkerState, detectAt]);

  // The offline analysis pass: seek to each scheduled timestamp, wait for the
  // frame to decode, detect it. Every scheduled frame is processed regardless
  // of device speed, at an exact timestamp; a runId guards against overlap and
  // cancellation.
  const runSeekAnalysis = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video || landmarkerRef.current === null) return;
    const runId = analysisRunRef.current;
    const clipMs =
      (Number.isFinite(video.duration) ? video.duration : 0) * 1000;
    // Honor the trim window when set; otherwise analyze the whole clip.
    const endMs = trimEndMs > trimStartMs ? trimEndMs : clipMs;
    const times = analysisTimestamps({
      startMs: trimStartMs,
      durationMs: endMs,
      stepMs: ANALYSIS_STEP_MS,
      maxSamples: MAX_ANALYSIS_SAMPLES,
      maxMs: MAX_ANALYSIS_MS,
    });
    for (let k = 0; k < times.length; k++) {
      if (!analyzingRef.current || analysisRunRef.current !== runId) return;
      const t = times[k] ?? 0;
      await seekTo(video, t / 1000);
      if (!analyzingRef.current || analysisRunRef.current !== runId) return;
      detectAt(t);
      if (k % 4 === 0 || k === times.length - 1) {
        setAnalysisProgress((k + 1) / times.length);
      }
    }
    finalizeAnalysis();
  }, [detectAt, finalizeAnalysis, trimStartMs, trimEndMs]);

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
    confidenceSamplesRef.current = [];
    analyzingRef.current = true;
    analysisRunRef.current += 1;
    setAnalysisProgress(0);
    setAnalysis({ status: "running" });
    onResetRef.current?.();
    // The pass drives the clip by seeking, not playback, so pause and let the
    // seek loop step through every scheduled frame.
    video.pause();
    setPlaying(false);
    void runSeekAnalysis();
  }, [runSeekAnalysis]);

  const cancelAnalysis = React.useCallback(() => {
    analyzingRef.current = false;
    analysisRunRef.current += 1; // invalidate the running seek loop
    collectedRef.current = [];
    setAnalysisProgress(0);
    videoRef.current?.pause();
    setAnalysis({ status: "idle" });
  }, []);

  const analyzing = analysis.status === "running";
  const markers =
    analysis.status === "done" ? analysis.markers : undefined;

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
            // Reset the trim window to the whole clip for this video.
            setTrimStartMs(0);
            setTrimEndMs(Number.isFinite(v.duration) ? v.duration * 1000 : 0);
            aspectRef.current =
              v.videoHeight > 0 ? v.videoWidth / v.videoHeight : 1;
          }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={finalizeAnalysis}
          onError={() => setVideoUnplayable(true)}
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

      {videoUnplayable ? (
        <div
          role="note"
          aria-label="Video cannot be played"
          className="flex gap-3 rounded-md border border-warn/40 bg-warn/10 p-4 text-ink"
        >
          <TriangleAlert
            className="mt-0.5 shrink-0 text-warn"
            aria-hidden="true"
          />
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              This browser cannot play that video
            </p>
            <p className="text-ink-muted">
              iPhones often record in HEVC (High Efficiency), which some
              browsers cannot decode. Two easy fixes: run the analysis in
              Safari on the phone that recorded it, or set the camera to Most
              Compatible (Settings, then Camera, then Formats) and re-record.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
        {landmarkerState === "loading" ? (
          <span>Loading the pose tracker (only needed the first time)...</span>
        ) : null}
        {landmarkerState === "ready" ? (
          <>
            {showFacingSide ? (
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
        <div className="flex flex-col items-center gap-4 rounded-md border border-line bg-surface p-6">
          <LoadingCharacter
            size={96}
            expectedDurationMs={duration ? duration * 1000 : undefined}
            label={`Analyzing ${runningNoun} frame by frame, ${Math.round(
              analysisProgress * 100,
            )}%`}
            srStatus={`Analyzing ${runningNoun}. This stays on your device.`}
          />
          <div
            className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={Math.round(analysisProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Analysis progress"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.round(analysisProgress * 100)}%` }}
            />
          </div>
          <p className="max-w-xs text-center text-xs text-ink-muted">
            Reading every frame for the most accurate result. This stays on your
            device.
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
        <div className="flex flex-col gap-4">
          {duration > 0 ? (
            <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  Trim to the movement{" "}
                  <span className="font-normal text-ink-muted">(optional)</span>
                </p>
                {trimStartMs > 0 || trimEndMs < duration * 1000 - 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTrimStartMs(0);
                      setTrimEndMs(duration * 1000);
                    }}
                  >
                    Reset to full clip
                  </Button>
                ) : null}
              </div>
              <Slider
                aria-label="Trim the analyzed range"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.05}
                minStepsBetweenThumbs={1}
                value={[trimStartMs / 1000, trimEndMs / 1000]}
                onValueChange={(values) => {
                  const s = values[0] ?? 0;
                  const e = values[1] ?? duration;
                  const sMs = s * 1000;
                  const eMs = e * 1000;
                  // Preview the handle being dragged (the one that moved most).
                  handleSeek(
                    Math.abs(sMs - trimStartMs) >= Math.abs(eMs - trimEndMs)
                      ? s
                      : e,
                  );
                  setTrimStartMs(sMs);
                  setTrimEndMs(eMs);
                }}
              />
              <p className="measurement text-xs text-ink-muted">
                Analyzing {formatClock(trimStartMs / 1000)} to{" "}
                {formatClock(trimEndMs / 1000)} (
                {formatClock(Math.max(0, (trimEndMs - trimStartMs) / 1000))} of
                movement). Bracket just the movement for the cleanest read.
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={startAnalysis}
              disabled={landmarkerState !== "ready" || duration === 0}
            >
              <Activity />
              {analysis.status === "done" ? "Analyze again" : analyzeLabel}
            </Button>
            <p className="text-sm text-ink-muted">{analyzeHelper}</p>
          </div>
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
