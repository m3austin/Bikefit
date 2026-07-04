"use client";

import { VideoDropzone } from "@/components/fit/video-dropzone";

const TIPS = [
  "Film from directly to the side, level with the bike, not from above or below.",
  "Good, even lighting: avoid strong backlight from a window behind the rider.",
  "Fitted or tucked-in clothing so the camera can see hip, knee, and ankle clearly.",
  "Aim for 15 to 20 seconds of steady, seated pedaling at your normal cadence. Under 8 seconds is too little to average; past 30 seconds, tiring form starts muddying the numbers.",
  "You can add an optional straight-on video afterward for knee tracking and left-right symmetry.",
];

/*
 * The side-view entry point: pick a local video file. The file is only ever
 * read into an in-memory object URL, never uploaded (video fit analysis
 * architecture rules, CLAUDE.md). The dropzone and its validation are shared
 * with the optional front-view slot via VideoDropzone.
 */
export function VideoUpload({
  onSelect,
}: {
  onSelect: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
          Video fit analysis
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Record yourself pedaling, side-on
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Set your phone on a chair or tripod, side-on to your trainer, and
          record a few pedal strokes. Everything below runs on this device:
          the video is never uploaded anywhere.
        </p>
      </div>

      <VideoDropzone onSelect={onSelect} />

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
