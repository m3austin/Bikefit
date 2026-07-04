"use client";

import * as React from "react";
import { TriangleAlert, UploadCloud, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".webm"];

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // Some phones/browsers report an empty or nonstandard MIME type for .mov;
  // fall back to the extension so a real recording is never rejected.
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/*
 * The drag-and-drop / file-picker zone shared by the side and front video
 * slots. File validation lives here so every slot accepts exactly the same
 * formats. The file only ever becomes an in-memory object URL upstream; it is
 * never uploaded anywhere (CLAUDE.md video fit analysis rules).
 */
export function VideoDropzone({
  onSelect,
  chooseLabel = "Choose video",
  prompt = "Drag a video here, or choose a file",
  compact = false,
}: {
  onSelect: (file: File) => void;
  chooseLabel?: string;
  prompt?: string;
  compact?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFile = React.useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!isAcceptedFile(file)) {
        setError(
          "That file type isn't supported. Use an mp4, mov, or webm video.",
        );
        return;
      }
      setError(null);
      onSelect(file);
    },
    [onSelect],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-4 rounded-lg border-2 border-dashed text-center transition-colors",
          compact ? "p-6" : "p-10",
          dragOver ? "border-accent bg-surface-2" : "border-line bg-surface",
        )}
      >
        <div
          className={cn(
            "grid place-items-center rounded-full bg-surface-2 text-accent",
            compact ? "size-11" : "size-14",
          )}
        >
          <Video
            className={compact ? "size-5" : "size-6"}
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium text-ink">{prompt}</p>
          <p className="text-sm text-ink-muted">mp4, mov, or webm</p>
        </div>
        <Button type="button" onClick={() => inputRef.current?.click()}>
          <UploadCloud />
          {chooseLabel}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger">
          <TriangleAlert className="size-4" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
