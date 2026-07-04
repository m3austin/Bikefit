"use client";

import * as React from "react";

import type { AngleHighlight } from "@/lib/kernel/keyframes";
import { landmarkPoint } from "@/lib/kernel/keyframes";
import type { ScoreTone } from "@/lib/kernel/scoring";
import { POSE_CONNECTIONS, type PoseFrame } from "@/lib/pose-model";

/*
 * Draws a stick figure from pose landmarks onto a canvas, with the measured
 * angles emphasized. The skeleton comes from the landmarks alone, so it
 * renders with or without the underlying video frame; when a captured frame
 * is supplied it sits behind the figure, dimmed, as an enhancement. All
 * colors come from the live theme tokens, so it themes and picks up the
 * sport accent like everything else.
 */

type Tokens = {
  ink: string;
  inkMuted: string;
  line: string;
  surface: string;
  accent: string;
  warn: string;
  danger: string;
};

function readTokens(el: HTMLElement): Tokens {
  const s = getComputedStyle(el);
  const v = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;
  return {
    ink: v("--ink", "#e8edf4"),
    inkMuted: v("--ink-muted", "#8a97a8"),
    line: v("--line", "#232d3d"),
    surface: v("--surface", "#121821"),
    accent: v("--accent", "#3ddc97"),
    warn: v("--warn", "#e8b34b"),
    danger: v("--danger", "#e5645f"),
  };
}

function toneColor(tone: ScoreTone, t: Tokens): string {
  if (tone === "watch") return t.warn;
  if (tone === "work") return t.danger;
  return t.accent;
}

export function PoseFigure({
  landmarks,
  highlights,
  frame,
  width = 320,
  height = 320,
  className,
}: {
  landmarks: PoseFrame;
  highlights: readonly AngleHighlight[];
  /** Optional captured video still to sit behind the figure. */
  frame?: CanvasImageSource | null;
  width?: number;
  height?: number;
  className?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = readTokens(canvas);

    // Backdrop: the captured frame (dimmed) or a plain surface.
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = t.surface;
    ctx.fillRect(0, 0, width, height);
    if (frame) {
      try {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(frame, 0, 0, width, height);
        ctx.globalAlpha = 1;
        // Darken slightly so the figure reads on top.
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillRect(0, 0, width, height);
      } catch {
        // A tainted or not-ready frame just leaves the plain backdrop.
      }
    }

    const px = (x: number) => x * width;
    const py = (y: number) => y * height;

    // Skeleton bones.
    ctx.lineWidth = 3;
    ctx.strokeStyle = frame ? "rgba(255,255,255,0.85)" : t.inkMuted;
    ctx.lineCap = "round";
    for (const [a, b] of POSE_CONNECTIONS) {
      const pa = landmarkPoint(landmarks, a);
      const pb = landmarkPoint(landmarks, b);
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(px(pa.x), py(pa.y));
      ctx.lineTo(px(pb.x), py(pb.y));
      ctx.stroke();
    }

    // Joints.
    ctx.fillStyle = frame ? "rgba(255,255,255,0.9)" : t.ink;
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarkPoint(landmarks, i);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlighted angles.
    for (const h of highlights) {
      const color = toneColor(h.tone, t);
      const pts = h.points
        .map((i) => landmarkPoint(landmarks, i))
        .filter((p): p is NonNullable<typeof p> => p !== null);
      if (pts.length < 2) continue;

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px(pts[0]!.x), py(pts[0]!.y));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(px(pts[i]!.x), py(pts[i]!.y));
      }
      ctx.stroke();

      // The vertex we annotate: the middle point for a 3-point angle, else
      // the midpoint of the segment.
      const vertex =
        pts.length >= 3
          ? pts[1]!
          : { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
      const vx = px(vertex.x);
      const vy = py(vertex.y);

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(vx, vy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label chip.
      const text = `${h.label} ${h.valueText}`;
      ctx.font =
        "600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      const tw = ctx.measureText(text).width;
      const padX = 6;
      const chipW = tw + padX * 2;
      const chipH = 20;
      let lx = vx + 10;
      let ly = vy - chipH - 6;
      if (lx + chipW > width) lx = width - chipW - 2;
      if (lx < 2) lx = 2;
      if (ly < 2) ly = vy + 8;
      ctx.fillStyle = color;
      const rr = 5;
      ctx.beginPath();
      ctx.roundRect(lx, ly, chipW, chipH, rr);
      ctx.fill();
      ctx.fillStyle = "#0b0f14";
      ctx.textBaseline = "middle";
      ctx.fillText(text, lx + padX, ly + chipH / 2 + 0.5);
    }
  }, [landmarks, highlights, frame, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={className}
      role="img"
      aria-label={
        highlights.length > 0
          ? `Pose with ${highlights.map((h) => `${h.label} ${h.valueText}`).join(", ")}`
          : "Pose stick figure"
      }
    />
  );
}
