import Image from "next/image";

import { cn } from "@/lib/utils";

/*
 * The Marshmallow Labs mascot (docs/sportfit/04 section 4). PLACEHOLDER
 * poses live as standalone named SVGs in public/mascot/ (merch groundwork);
 * this component just places one. Delight lives in the chrome: the mascot
 * NEVER appears on safety copy, disclaimers, results numbers, or any
 * payment/coach surface. The poses are static SVGs, so there is no motion to
 * gate on prefers-reduced-motion; any animated placement must add its own
 * guard.
 */

export type MascotPose =
  | "cycling"
  | "golf"
  | "running"
  | "swimming"
  | "lifting"
  | "cheer"
  | "faceplant";

/** The sport-posed mascot for a slug, or a neutral cheer for the hub. */
export function poseForSport(slug: string | undefined): MascotPose {
  switch (slug) {
    case "cycling":
    case "golf":
    case "running":
    case "swimming":
    case "lifting":
      return slug;
    default:
      return "cheer";
  }
}

const LABELS: Record<MascotPose, string> = {
  cycling: "A marshmallow on a bike",
  golf: "A marshmallow mid golf swing",
  running: "A marshmallow running",
  swimming: "A marshmallow swimming",
  lifting: "A marshmallow lifting a barbell",
  cheer: "A cheering marshmallow",
  faceplant: "A marshmallow face down",
};

export function Mascot({
  pose,
  size = 48,
  className,
  /** Decorative by default: delight, not information. */
  decorative = true,
}: {
  pose: MascotPose;
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <Image
      src={`/mascot/${pose}.svg`}
      width={size}
      height={size}
      alt={decorative ? "" : LABELS[pose]}
      aria-hidden={decorative || undefined}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
