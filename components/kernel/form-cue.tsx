import type { ScoreTone } from "@/lib/kernel/scoring";
import { cn } from "@/lib/utils";

/*
 * A "what good looks like" figure: a clean, hand-authored side-view stick
 * pose for a drill, with the key line or angle drawn in accent. Static poses,
 * so this suits drills about a position (a hinge, a lockout, a high elbow);
 * rhythm drills simply omit it. Tokenized SVG; themes and picks up the sport
 * accent like the rest. Decorative, with the caption carrying the meaning.
 */

export type StickJoint =
  | "head"
  | "shoulder"
  | "elbow"
  | "wrist"
  | "hip"
  | "knee"
  | "ankle"
  | "heel"
  | "toe";

/** Normalized 0-1 side-view coordinates (y grows downward), facing right. */
export type StickPose = Partial<Record<StickJoint, { x: number; y: number }>>;

/** A highlighted line (two joints) or angle (three, vertex in the middle). */
export type FormHighlight = { joints: StickJoint[]; tone: ScoreTone };

export type FormFigure = {
  pose: StickPose;
  highlight?: FormHighlight;
  caption: string;
};

const BONES: Array<[StickJoint, StickJoint]> = [
  ["head", "shoulder"],
  ["shoulder", "hip"],
  ["hip", "knee"],
  ["knee", "ankle"],
  ["ankle", "heel"],
  ["ankle", "toe"],
  ["shoulder", "elbow"],
  ["elbow", "wrist"],
];

const TONE_VAR: Record<ScoreTone, string> = {
  great: "var(--accent)",
  good: "var(--accent)",
  watch: "var(--warn)",
  work: "var(--danger)",
};

export function FormCue({
  figure,
  size = 150,
  className,
}: {
  figure: FormFigure;
  size?: number;
  className?: string;
}) {
  const { pose, highlight, caption } = figure;
  const pad = 12;
  const span = size - pad * 2;
  const px = (x: number) => pad + x * span;
  const py = (y: number) => pad + y * span;

  const at = (j: StickJoint) => pose[j];
  const accent = highlight ? TONE_VAR[highlight.tone] : "var(--accent)";

  // Head radius from the head-to-shoulder gap, so it scales with the pose.
  const head = pose.head;
  const shoulder = pose.shoulder;
  const headR =
    head && shoulder
      ? Math.max(6, Math.hypot(px(head.x) - px(shoulder.x), py(head.y) - py(shoulder.y)) * 0.55)
      : 9;

  const highlightPts = highlight
    ? highlight.joints
        .map(at)
        .filter((p): p is { x: number; y: number } => p !== undefined)
    : [];

  return (
    <figure
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-2 p-3",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={caption}
      >
        {/* Bones. */}
        {BONES.map(([a, b]) => {
          const pa = at(a);
          const pb = at(b);
          if (!pa || !pb) return null;
          return (
            <line
              key={`${a}-${b}`}
              x1={px(pa.x)}
              y1={py(pa.y)}
              x2={px(pb.x)}
              y2={py(pb.y)}
              style={{ stroke: "var(--ink-muted)" }}
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}

        {/* Joints. */}
        {(Object.keys(pose) as StickJoint[]).map((j) => {
          if (j === "head") return null;
          const p = at(j);
          if (!p) return null;
          return (
            <circle
              key={j}
              cx={px(p.x)}
              cy={py(p.y)}
              r="2.6"
              style={{ fill: "var(--ink)" }}
            />
          );
        })}

        {/* Head. */}
        {head ? (
          <circle
            cx={px(head.x)}
            cy={py(head.y)}
            r={headR}
            style={{ fill: "var(--surface)", stroke: "var(--ink)" }}
            strokeWidth="3.5"
          />
        ) : null}

        {/* Highlighted line or angle, drawn on top in the tone color. */}
        {highlightPts.length >= 2 ? (
          <polyline
            points={highlightPts.map((p) => `${px(p.x)},${py(p.y)}`).join(" ")}
            style={{ stroke: accent, fill: "none" }}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {highlightPts.map((p, i) => (
          <circle
            key={i}
            cx={px(p.x)}
            cy={py(p.y)}
            r="3.4"
            style={{ fill: accent }}
          />
        ))}
      </svg>
      <figcaption className="max-w-[30ch] text-center text-xs leading-relaxed text-ink-muted">
        {caption}
      </figcaption>
    </figure>
  );
}
