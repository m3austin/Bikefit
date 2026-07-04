import { cn } from "@/lib/utils";

/*
 * A top-down camera-setup diagram: where to put the phone relative to you,
 * and which way to face. Replaces a paragraph of "stand side on, camera level
 * with your hips" prose with one glance. Tokenized SVG, themes with the app,
 * decorative (the caption carries the words for screen readers).
 *
 * The athlete is always drawn facing up; the camera sits front / behind /
 * left / right of them with a dashed sightline, which covers every capture
 * angle across the sports.
 */

type CameraPosition = "front" | "behind" | "left" | "right";

type ViewPreset = {
  position: CameraPosition;
  label: string;
  caption: string;
};

export type CameraView =
  | "cycling-side"
  | "cycling-front"
  | "golf-dtl"
  | "golf-face"
  | "running-side"
  | "running-rear"
  | "lifting-side"
  | "lifting-front"
  | "swimming-side";

const VIEWS: Record<CameraView, ViewPreset> = {
  "cycling-side": {
    position: "right",
    label: "Side on",
    caption: "Camera directly to your side, level with the bike.",
  },
  "cycling-front": {
    position: "front",
    label: "Front or rear",
    caption: "Camera centered on the bike, level, directly in front or behind.",
  },
  "golf-dtl": {
    position: "behind",
    label: "Down the line",
    caption: "Behind you, looking along your target line, level with your hands.",
  },
  "golf-face": {
    position: "right",
    label: "Face on",
    caption: "Directly in front of your chest, square to your target line.",
  },
  "running-side": {
    position: "right",
    label: "Side on",
    caption: "Square to the treadmill, level with your hips.",
  },
  "running-rear": {
    position: "behind",
    label: "From behind",
    caption: "Directly behind you, same height.",
  },
  "lifting-side": {
    position: "right",
    label: "Side on",
    caption: "Directly to your side, whole body and the bar in frame.",
  },
  "lifting-front": {
    position: "front",
    label: "Front on",
    caption: "Directly in front, whole body and both knees in frame.",
  },
  "swimming-side": {
    position: "right",
    label: "Side on, from the deck",
    caption: "On the pool deck, side on, swimmer in the near lane.",
  },
};

// Camera glyph coordinates and the dashed sightline end, per position, in a
// 240 x 180 viewBox with the athlete at (120, 96).
const LAYOUT: Record<
  CameraPosition,
  { cam: { x: number; y: number }; toward: { x: number; y: number } }
> = {
  front: { cam: { x: 120, y: 26 }, toward: { x: 120, y: 74 } },
  behind: { cam: { x: 120, y: 154 }, toward: { x: 120, y: 118 } },
  left: { cam: { x: 34, y: 96 }, toward: { x: 90, y: 96 } },
  right: { cam: { x: 206, y: 96 }, toward: { x: 150, y: 96 } },
};

// Colors come from the live theme tokens (and the sport accent when the
// diagram sits inside a sport's accent class). Inline styles are used because
// these vars resolve at element scope; Tailwind fill/stroke utilities are not
// guaranteed for the token names.
const INK = { stroke: "var(--ink)" };
const ACCENT = "var(--accent)";

function CameraGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 16} ${y - 11})`}>
      <rect
        width="32"
        height="22"
        rx="4"
        style={{ fill: "var(--surface-2)", stroke: ACCENT }}
        strokeWidth="2"
      />
      <circle
        cx="16"
        cy="11"
        r="5.5"
        style={{ fill: "none", stroke: ACCENT }}
        strokeWidth="2"
      />
      <circle cx="16" cy="11" r="2" style={{ fill: ACCENT }} />
    </g>
  );
}

export function CameraSetupDiagram({
  view,
  className,
}: {
  view: CameraView;
  className?: string;
}) {
  const preset = VIEWS[view];
  const { cam, toward } = LAYOUT[preset.position];

  return (
    <figure
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-4",
        className,
      )}
    >
      <svg
        viewBox="0 0 240 180"
        className="h-auto w-full max-w-[280px]"
        role="img"
        aria-label={`${preset.label}: ${preset.caption}`}
      >
        {/* Sightline from camera to athlete. */}
        <line
          x1={cam.x}
          y1={cam.y}
          x2={toward.x}
          y2={toward.y}
          style={{ stroke: "var(--ink-muted)" }}
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Athlete, top down: shoulders, head, and a facing arrow pointing up. */}
        <line
          x1="104"
          y1="104"
          x2="136"
          y2="104"
          style={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="120"
          cy="96"
          r="11"
          style={{ fill: "var(--surface-2)", stroke: "var(--ink)" }}
          strokeWidth="3"
        />
        <path d="M120 70 l6 10 h-12 z" style={{ fill: "var(--ink)" }} />

        <CameraGlyph x={cam.x} y={cam.y} />
      </svg>
      <figcaption className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-sm font-medium text-ink">{preset.label}</span>
        <span className="max-w-[36ch] text-xs leading-relaxed text-ink-muted">
          {preset.caption}
        </span>
      </figcaption>
    </figure>
  );
}
