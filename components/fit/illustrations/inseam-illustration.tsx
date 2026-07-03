/*
 * Placeholder line-art illustration establishing the guide style: single-stroke
 * SVG, `currentColor` so it themes automatically, 1.5px stroke, no raster
 * (UX-UI-Design §3). Accent is used sparingly for the dimension line. One
 * illustration is built now; the full per-step set arrives with the wizard.
 */
export function InseamIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="A person standing against a wall with a book pulled up snug, measuring inseam from the floor to the book spine."
      className={className}
    >
      {/* Wall and floor */}
      <path d="M34 20 V214" strokeOpacity={0.5} />
      <path d="M34 214 H184" strokeOpacity={0.5} />

      {/* Standing figure */}
      <circle cx={96} cy={54} r={13} />
      <path d="M96 67 V116" />
      <path d="M96 82 L74 104 M96 82 L118 104" />
      <path d="M96 116 L82 168 L80 210 M96 116 L110 168 L112 210" />

      {/* Book pulled up snug at the inseam */}
      <rect x={80} y={114} width={32} height={9} rx={1.5} />
      <path d="M96 114 V123" strokeOpacity={0.5} />

      {/* Dimension line: floor to book spine (accent) */}
      <g className="text-accent">
        <path d="M150 123 V210" />
        <path d="M144 129 L150 123 L156 129" />
        <path d="M144 204 L150 210 L156 204" />
        <path d="M112 118 H150" strokeOpacity={0.5} strokeDasharray="3 4" />
        <path d="M34 214 H150" strokeOpacity={0.5} strokeDasharray="3 4" />
      </g>
    </svg>
  );
}
