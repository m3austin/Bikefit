/*
 * Thin, lazily-loaded wrapper around @mediapipe/tasks-vision's PoseLandmarker
 * (video fit analysis architecture rules, CLAUDE.md). @mediapipe/tasks-vision
 * is dynamically imported so it never lands in the main app bundle: it is only
 * pulled in when a rider opens Video Fit Analysis, mirroring how lib/db.ts
 * dynamic-imports Dexie.
 *
 * Each caller gets its OWN landmarker instance (createPoseLandmarker) because
 * VIDEO running mode is stateful: it smooths landmarks over time and requires
 * strictly increasing timestamps per instance. With two videos on screen (side
 * and front views), a shared instance would interleave two unrelated frame
 * streams and corrupt both. The expensive parts (the wasm runtime and module
 * load) are still shared through module-level caches below.
 *
 * KNOWN TRADEOFF: the WASM runtime and the pose_landmarker_lite model are
 * fetched from Google's public CDN on first use (a few MB, cached by the
 * browser afterwards). That is a one-time download of ML model weights, not
 * user data: the rider's video itself is never sent anywhere. Unlike the
 * self-hosted Geist fonts, MediaPipe does not ship a bundler-friendly static
 * asset story, so Video Fit Analysis needs network on its first use per
 * device even though the rest of the app works fully offline.
 */

// Pinned to the installed @mediapipe/tasks-vision version (package.json).
// Bump both together.
const MEDIAPIPE_VERSION = "0.10.35";
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export type PoseLandmarkerHandle = {
  /**
   * Detect the pose in one video frame. `timestampMs` must strictly increase
   * across calls on the same handle (the tasks-vision VIDEO running mode
   * contract); callers use monotonic wall-clock time.
   */
  detect: (video: HTMLVideoElement, timestampMs: number) => PoseFrameResult;
  close: () => void;
};

export type PoseFrameResult = {
  /** Empty when no pose was detected in this frame. */
  landmarks: Array<
    Array<{ x: number; y: number; z: number; visibility?: number }>
  >;
};

type VisionModule = typeof import("@mediapipe/tasks-vision");
type Fileset = Awaited<
  ReturnType<VisionModule["FilesetResolver"]["forVisionTasks"]>
>;

let visionPromise: Promise<VisionModule> | null = null;
let filesetPromise: Promise<Fileset> | null = null;

function loadVision(): Promise<VisionModule> {
  visionPromise ??= import("@mediapipe/tasks-vision");
  return visionPromise;
}

/** The wasm runtime, loaded once and shared by every landmarker instance. */
function loadFileset(): Promise<Fileset> {
  if (!filesetPromise) {
    // A failed load (e.g. offline on first use) clears the cache so the next
    // call retries fresh instead of staying rejected forever.
    filesetPromise = loadVision()
      .then((vision) => vision.FilesetResolver.forVisionTasks(WASM_BASE_URL))
      .catch((error: unknown) => {
        filesetPromise = null;
        throw error;
      });
  }
  return filesetPromise;
}

/**
 * Create a fresh lite-model, VIDEO-mode PoseLandmarker. Callers own the
 * instance and must call close() when done with it (e.g. on unmount).
 *
 * GPU first for speed, CPU as the fallback: some mobile browsers (older
 * Android WebViews, some iOS Safari versions) cannot initialise the WebGL
 * GPU delegate, and slower tracking beats no tracking.
 */
export async function createPoseLandmarker(): Promise<PoseLandmarkerHandle> {
  const vision = await loadVision();
  const fileset = await loadFileset();

  const create = (delegate: "GPU" | "CPU") =>
    vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate,
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });

  let landmarker: Awaited<ReturnType<typeof create>>;
  try {
    landmarker = await create("GPU");
  } catch {
    landmarker = await create("CPU");
  }

  return {
    detect: (video, timestampMs) => {
      const result = landmarker.detectForVideo(video, timestampMs);
      return { landmarks: result.landmarks ?? [] };
    },
    close: () => landmarker.close(),
  };
}
