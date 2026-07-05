/*
 * The SportFits mark: six aperture blades sweeping around an ink hub, in the
 * unified emerald palette (docs: sportfits-wordmark-preview). Geometry is
 * verbatim from the approved design; the gradient reads the per-theme
 * --logo-g1/--logo-g2 tokens (globals.css) so the mark brightens on dark
 * backgrounds exactly like the rest of the brand.
 */
export function SportFitsMark({
  size = 22,
  className,
}: {
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="-250 -250 500 500"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sf-blades" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--logo-g1)" />
          <stop offset="1" stopColor="var(--logo-g2)" />
        </linearGradient>
      </defs>
      <path d="M0 0 L0 -235 A235 235 0 0 1 203.5 -117.5 Z" fill="url(#sf-blades)" />
      <path d="M0 0 L203.5 -117.5 A235 235 0 0 1 203.5 117.5 Z" fill="url(#sf-blades)" opacity=".8" />
      <path d="M0 0 L203.5 117.5 A235 235 0 0 1 0 235 Z" fill="url(#sf-blades)" opacity=".6" />
      <path d="M0 0 L0 235 A235 235 0 0 1 -203.5 117.5 Z" fill="url(#sf-blades)" opacity=".45" />
      <path d="M0 0 L-203.5 117.5 A235 235 0 0 1 -203.5 -117.5 Z" fill="url(#sf-blades)" opacity=".3" />
      <path d="M0 0 L-203.5 -117.5 A235 235 0 0 1 0 -235 Z" fill="url(#sf-blades)" opacity=".2" />
      <circle cx="0" cy="0" r="30" fill="#0A3323" />
    </svg>
  );
}
