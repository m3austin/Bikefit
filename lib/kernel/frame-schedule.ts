/*
 * Analysis-pass sampling schedule (SportFits, Tier 2 offline capture). The
 * workspace analyzes by SEEKING to each of these timestamps and detecting the
 * decoded frame there, instead of playing at 1x and hoping a slow device
 * keeps up. That decouples analysis quality from device speed: every
 * scheduled frame is processed at an exact timestamp. Pure and testable; the
 * imperative seek loop lives in the workspace.
 */

export type ScheduleOptions = {
  /** Clip length in ms (video.duration * 1000); 0/unknown yields one sample. */
  durationMs: number;
  /** Desired spacing in ms (e.g. 1000/30 for ~native 30fps). */
  stepMs: number;
  /** Hard cap on the number of samples (memory + wall-clock budget). */
  maxSamples: number;
  /** Never sample past this timestamp (long-clip guard). */
  maxMs: number;
};

/**
 * The timestamps (ms) to seek-and-detect: 0 through the clip end, evenly
 * spaced, coarsened just enough to fit the sample budget so a long or high-fps
 * clip is still covered end to end rather than truncated. The final entry is
 * always the clip end.
 */
export function analysisTimestamps(options: ScheduleOptions): number[] {
  const { stepMs, maxSamples, maxMs } = options;
  const span = Math.min(Math.max(options.durationMs, 0), maxMs);
  if (span <= 0 || maxSamples <= 1 || stepMs <= 0) return [0];

  // Intervals at the desired spacing, coarsened to fit the budget so the whole
  // clip is still covered end to end (premium: no silently dropped tail).
  const intervals = Math.min(maxSamples - 1, Math.ceil(span / stepMs));
  const step = span / intervals;

  const times: number[] = [];
  for (let i = 0; i < intervals; i++) times.push(i * step);
  times.push(span); // exact clip end, no float drift
  return times;
}
