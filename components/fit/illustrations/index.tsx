/*
 * Line-art measurement illustrations (UX-UI-Design §3): single-stroke SVG,
 * `currentColor` so they theme automatically, 1.5px stroke, accent used
 * sparingly for the dimension line. One registry keyed by measurement so the
 * wizard and gallery can look up the right figure.
 */

import type { MeasurementKey } from "@/lib/engine";
import { InseamIllustration } from "@/components/fit/illustrations/inseam-illustration";

type IllustrationProps = { className?: string };

function Guide({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
      className={className}
    >
      {children}
    </svg>
  );
}

export function HeightIllustration({ className }: IllustrationProps) {
  return (
    <Guide
      label="A person standing barefoot against a wall, measured from the floor to the crown of the head."
      className={className}
    >
      <path d="M34 24 V214" strokeOpacity={0.5} />
      <path d="M34 214 H184" strokeOpacity={0.5} />
      <circle cx={96} cy={40} r={12} />
      <path d="M96 52 V120" />
      <path d="M96 66 L78 96 M96 66 L114 96" />
      <path d="M96 120 L84 178 L82 210 M96 120 L108 178 L110 210" />
      <g className="text-accent">
        <path d="M150 28 V210" />
        <path d="M144 34 L150 28 L156 34" />
        <path d="M144 204 L150 210 L156 204" />
        <path d="M108 28 H150" strokeOpacity={0.5} strokeDasharray="3 4" />
        <path d="M34 210 H150" strokeOpacity={0.5} strokeDasharray="3 4" />
      </g>
    </Guide>
  );
}

export function TorsoIllustration({ className }: IllustrationProps) {
  return (
    <Guide
      label="A front view of the upper body, measured from the sternal notch down to the pubic-bone reference point."
      className={className}
    >
      <circle cx={100} cy={36} r={12} />
      <path d="M100 48 V58" />
      <path d="M74 66 Q100 56 126 66" />
      <path d="M80 66 L86 150 M120 66 L114 150 M86 150 H114" />
      <path d="M78 68 L70 128 M122 68 L130 128" />
      <g className="text-accent">
        <path d="M150 70 V150" />
        <path d="M144 76 L150 70 L156 76" />
        <path d="M144 144 L150 150 L156 144" />
        <circle cx={100} cy={70} r={2.5} fill="currentColor" stroke="none" />
        <circle cx={100} cy={150} r={2.5} fill="currentColor" stroke="none" />
        <path d="M100 70 H150" strokeOpacity={0.5} strokeDasharray="3 4" />
        <path d="M100 150 H150" strokeOpacity={0.5} strokeDasharray="3 4" />
      </g>
    </Guide>
  );
}

export function ArmIllustration({ className }: IllustrationProps) {
  return (
    <Guide
      label="An arm hanging relaxed, measured from the shoulder bone tip down to the wrist crease."
      className={className}
    >
      <circle cx={76} cy={40} r={11} />
      <path d="M76 51 V150" />
      <path d="M76 62 L96 106 L92 150" />
      <g className="text-accent">
        <path d="M140 62 V150" />
        <path d="M134 68 L140 62 L146 68" />
        <path d="M134 144 L140 150 L146 144" />
        <circle cx={76} cy={62} r={2.5} fill="currentColor" stroke="none" />
        <path d="M76 62 H140" strokeOpacity={0.5} strokeDasharray="3 4" />
        <path d="M92 150 H140" strokeOpacity={0.5} strokeDasharray="3 4" />
      </g>
    </Guide>
  );
}

export function ShoulderIllustration({ className }: IllustrationProps) {
  return (
    <Guide
      label="A back view, measured straight across from one shoulder bone tip to the other."
      className={className}
    >
      <circle cx={100} cy={46} r={13} />
      <path d="M60 74 Q100 62 140 74" />
      <path d="M66 76 L80 156 H120 L134 76" />
      <path d="M60 74 L52 132 M140 74 L148 132" />
      <g className="text-accent">
        <path d="M60 52 H140" />
        <path d="M66 46 L60 52 L66 58" />
        <path d="M134 46 L140 52 L134 58" />
        <circle cx={60} cy={72} r={2.5} fill="currentColor" stroke="none" />
        <circle cx={140} cy={72} r={2.5} fill="currentColor" stroke="none" />
        <path d="M60 72 V52" strokeOpacity={0.5} strokeDasharray="3 4" />
        <path d="M140 72 V52" strokeOpacity={0.5} strokeDasharray="3 4" />
      </g>
    </Guide>
  );
}

export function FootIllustration({ className }: IllustrationProps) {
  return (
    <Guide
      label="A side view of a bare foot, measured from the heel to the tip of the longest toe."
      className={className}
    >
      <path d="M30 168 H188" strokeOpacity={0.5} />
      <path d="M58 150 C55 120 70 106 92 110 L120 114 C144 118 156 140 156 156 L60 160 Z" />
      <path d="M66 110 L72 92 L86 92" strokeOpacity={0.7} />
      <g className="text-accent">
        <path d="M58 186 H156" />
        <path d="M64 180 L58 186 L64 192" />
        <path d="M150 180 L156 186 L150 192" />
        <path d="M58 160 V186" strokeOpacity={0.5} strokeDasharray="3 4" />
        <path d="M156 156 V186" strokeOpacity={0.5} strokeDasharray="3 4" />
      </g>
    </Guide>
  );
}

export { InseamIllustration };

/** Line-art figure for each body-measurement step. */
export const MEASUREMENT_ILLUSTRATIONS: Record<
  MeasurementKey,
  (props: IllustrationProps) => React.ReactNode
> = {
  height: HeightIllustration,
  inseam: InseamIllustration,
  torso: TorsoIllustration,
  arm: ArmIllustration,
  shoulder: ShoulderIllustration,
  foot: FootIllustration,
};
