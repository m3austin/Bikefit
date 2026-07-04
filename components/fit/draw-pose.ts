import { POSE_CONNECTIONS, type PoseFrame } from "@/lib/pose-model";

const VISIBLE_THRESHOLD = 0.3;

/*
 * Canvas skeleton drawing. Not a pure biomechanics function (it touches a
 * CanvasRenderingContext2D), so it lives alongside the video UI rather than in
 * lib/biomechanics.ts (CLAUDE.md: that file is math over plain data only).
 */
export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  widthCss: number,
  heightCss: number,
  frame: PoseFrame,
  color: string,
): void {
  ctx.clearRect(0, 0, widthCss, heightCss);
  if (frame.length === 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = frame[a];
    const pb = frame[b];
    if (!pa || !pb) continue;
    if ((pa.visibility ?? 1) < VISIBLE_THRESHOLD) continue;
    if ((pb.visibility ?? 1) < VISIBLE_THRESHOLD) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * widthCss, pa.y * heightCss);
    ctx.lineTo(pb.x * widthCss, pb.y * heightCss);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  for (const point of frame) {
    if ((point.visibility ?? 1) < VISIBLE_THRESHOLD) continue;
    ctx.beginPath();
    ctx.arc(point.x * widthCss, point.y * heightCss, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
