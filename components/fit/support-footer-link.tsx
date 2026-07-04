"use client";

import Link from "next/link";

import { useIsPlayDistribution } from "@/components/distribution";
import { supportUrl } from "@/lib/support";

/*
 * The landing footer's quiet "Support BikeFit" link. A client island so it
 * can hide in the Play-wrapped app (Google payment policy) as well as when
 * no payment link is configured.
 */
export function SupportFooterLink() {
  const play = useIsPlayDistribution();
  if (!supportUrl() || play) return null;
  return (
    <Link
      href="/settings#support"
      className="underline underline-offset-2 hover:text-ink"
    >
      Support BikeFit
    </Link>
  );
}
