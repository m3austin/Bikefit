import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/mascot/mascot";

/*
 * 404 (Tier 2 mascot moment, docs/sportfit/04 section 4): a friendly place
 * to land, not a dead end. Chrome, so the mascot is welcome here.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
      <Mascot pose="faceplant" size={96} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">
          This page took a tumble
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          We could not find what you were looking for. It may have moved, or
          the link might be a little off.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to SportFits</Link>
      </Button>
    </div>
  );
}
