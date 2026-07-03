"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

/*
 * Route error boundary (Flow 8): a friendly message, a way to recover, and
 * reassurance that local data is safe. No measurement values or result numbers
 * are surfaced (privacy, PRD §8).
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold text-ink">Something went wrong</h1>
      <p className="text-ink-muted">
        This screen ran into an unexpected problem. Your saved fits and settings
        are safe on this device. Try again, and if it keeps happening, reload the
        page.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
