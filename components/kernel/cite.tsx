import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { reference, type ReferenceId } from "@/lib/references";
import { cn } from "@/lib/utils";

/*
 * An inline citation. Renders the source's short label as a small chip; when
 * the source has a stable link it opens in a new tab, otherwise it points at
 * the references list in the rabbit hole. Credibility, inline: every claim
 * that leans on a source can name it right where it is made.
 */
export function Cite({
  id,
  className,
}: {
  id: ReferenceId;
  className?: string;
}) {
  const ref = reference(id);
  const base = cn(
    "inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 align-middle text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink",
    className,
  );

  if (ref.url) {
    return (
      <a
        href={ref.url}
        target="_blank"
        rel="noopener noreferrer"
        className={base}
        title={ref.citation}
      >
        {ref.short}
        <ExternalLink className="size-3" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href="/method#references" className={base} title={ref.citation}>
      {ref.short}
    </Link>
  );
}
