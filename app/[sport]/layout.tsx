import { notFound } from "next/navigation";

import { LIVE_SPORTS, getLiveSport } from "@/lib/sports/registry";

/*
 * The [sport] segment (SportFits, docs/sportfit/01-Architecture.md): every
 * sport's pages live under its registry slug. Unknown or coming-soon slugs
 * 404 here so child pages can assume a live module.
 */

export function generateStaticParams() {
  return LIVE_SPORTS.map((s) => ({ sport: s.slug }));
}

export default async function SportLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const sportModule = getLiveSport(sport);
  if (!sportModule) notFound();
  if (!sportModule.accentClass) return children;
  return <div className={sportModule.accentClass}>{children}</div>;
}
