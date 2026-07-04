"use client";

import { ChevronsRight, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const SPEEDS = [
  { value: "1", label: "1x" },
  { value: "0.25", label: "0.25x" },
] as const;

/** A key moment found by the analysis, marked on the timeline. Labels are
 * sport-supplied ("stroke bottom", "top", "impact"); ticks color by tone. */
export type TimelineMarker = {
  tMs: number;
  label: string;
  tone?: "accent" | "muted";
};

export function VideoControls({
  playing,
  currentTime,
  duration,
  playbackRate,
  onPlayPause,
  onSeek,
  onRateChange,
  markers,
}: {
  playing: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onRateChange: (rate: number) => void;
  /** Key frames found by the analysis; drawn as ticks, jumpable by kind. */
  markers?: readonly TimelineMarker[];
}) {
  const hasMarkers = duration > 0 && (markers?.length ?? 0) > 0;

  // Distinct labels, in first-appearance order, drive the jump buttons.
  const markerLabels: string[] = [];
  for (const m of markers ?? []) {
    if (!markerLabels.includes(m.label)) markerLabels.push(m.label);
  }

  const jumpToNext = (label: string) => {
    const times = (markers ?? [])
      .filter((m) => m.label === label)
      .map((m) => m.tMs / 1000)
      .sort((a, b) => a - b);
    if (times.length === 0) return;
    // The next marker after the playhead, wrapping to the first.
    const next = times.find((t) => t > currentTime + 0.05) ?? times[0];
    if (next !== undefined) onSeek(next);
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={onPlayPause}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause /> : <Play />}
        </Button>

        <span className="measurement w-24 shrink-0 text-sm text-ink-muted">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="relative flex-1">
          {hasMarkers ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
            >
              {(markers ?? []).map((m, i) => (
                <span
                  key={`${m.label}-${i}`}
                  className={cn(
                    "absolute h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    m.tone === "muted" ? "bg-ink-muted" : "bg-accent",
                  )}
                  style={{
                    left: `${Math.min(99, Math.max(1, (m.tMs / 1000 / duration) * 100))}%`,
                  }}
                />
              ))}
            </div>
          ) : null}
          <Slider
            aria-label="Scrub video"
            min={0}
            max={Math.max(duration, 0.01)}
            step={0.01}
            value={[currentTime]}
            onValueChange={(values) => {
              const next = values[0];
              if (next !== undefined) onSeek(next);
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-muted">Playback speed</span>
        <ToggleGroup
          type="single"
          value={String(playbackRate)}
          onValueChange={(next) => {
            if (next) onRateChange(Number(next));
          }}
          aria-label="Playback speed"
        >
          {SPEEDS.map((speed) => (
            <ToggleGroupItem key={speed.value} value={speed.value}>
              {speed.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {hasMarkers ? (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {markerLabels.map((label) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => jumpToNext(label)}
              >
                <ChevronsRight className="size-4" />
                Next {label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
