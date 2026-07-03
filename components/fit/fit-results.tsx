"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Info, Printer, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CautionBanner } from "@/components/fit/caution-banner";
import { ResultCards } from "@/components/fit/result-cards";
import { FitSheet } from "@/components/fit/fit-sheet";
import { useUnit } from "@/components/unit-provider";
import { useToast } from "@/components/toast-provider";
import { deleteFit, getFit, updateFit, type StoredFit } from "@/lib/db";
import { MEASUREMENTS } from "@/lib/measurements";
import { DISCLAIMER } from "@/lib/results-copy";
import { defaultFitName } from "@/lib/wizard";

type LoadState = "loading" | "found" | "notfound";

export function FitResults() {
  const router = useRouter();
  const { unit } = useUnit();
  const { toast } = useToast();

  // Read the id from the live URL rather than a server param, so a cached
  // /fit/* shell can render any fit offline (Flow 8).
  const pathname = usePathname();
  const id = pathname.split("/").pop() ?? "";

  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [fit, setFit] = React.useState<StoredFit | null>(null);
  const [animate, setAnimate] = React.useState(false);
  const [showSkeleton, setShowSkeleton] = React.useState(false);

  const [saveOpen, setSaveOpen] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [startOverOpen, setStartOverOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const reveal =
      new URLSearchParams(window.location.search).get("reveal") === "1";
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    async function load() {
      const found = await getFit(id);
      if (!active) return;
      if (found) {
        setFit(found);
        setNameDraft(found.name);
        setAnimate(reveal && !reduced);
        setLoadState("found");
        // Strip ?reveal so a refresh or shared link does not replay the reveal.
        if (reveal) window.history.replaceState(null, "", `/fit/${id}`);
      } else {
        setLoadState("notfound");
      }
    }
    void load();

    // Only show a skeleton if the read is slow (no flash under 300ms, §5).
    const skeletonTimer = setTimeout(() => {
      if (active) setShowSkeleton(true);
    }, 300);

    return () => {
      active = false;
      clearTimeout(skeletonTimer);
    };
  }, [id]);

  const handleSave = React.useCallback(async () => {
    if (!fit) return;
    const name = nameDraft.trim() || defaultFitName(fit.input.bikeType);
    const updated = await updateFit(id, { name, saved: true });
    if (updated) setFit(updated);
    setSaveOpen(false);
    toast({
      title: "Fit saved",
      description: `Saved as "${name}".`,
      action: { label: "View saved fits", onClick: () => router.push("/fits") },
    });
  }, [fit, id, nameDraft, router, toast]);

  const handleStartOver = React.useCallback(async () => {
    setStartOverOpen(false);
    if (fit && !fit.saved) {
      await deleteFit(id);
    }
    router.push("/fit/new");
  }, [fit, id, router]);

  if (loadState === "loading") {
    return showSkeleton ? <ResultsSkeleton /> : null;
  }

  if (loadState === "notfound" || !fit) {
    return <ResultsNotFound />;
  }

  const cautionLabels = fit.result.meta.cautionFlags.map(
    (flag) => MEASUREMENTS[flag.input].label,
  );
  const saved = fit.saved;

  return (
    <>
      <div className="flex flex-col gap-6 pb-24 print:hidden">
        <div className="flex flex-col gap-1">
          <p className="measurement text-sm font-medium uppercase tracking-wide text-accent">
            Your fit
          </p>
          <h1 className="text-2xl font-semibold text-ink">{fit.name}</h1>
        </div>

        {cautionLabels.length > 0 ? (
          <CautionBanner flags={cautionLabels} />
        ) : null}

        <ResultCards
          result={fit.result}
          input={fit.input}
          unit={unit}
          animate={animate}
        />

        <div className="flex gap-3 rounded-md border border-line bg-surface p-4 text-sm text-ink-muted">
          <Info className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <p>{DISCLAIMER}</p>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 backdrop-blur print:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            variant={saved ? "outline" : "default"}
            onClick={() => setSaveOpen(true)}
          >
            <Save />
            {saved ? "Rename fit" : "Save fit"}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={() => setStartOverOpen(true)}
          >
            <RotateCcw />
            Start over
          </Button>
        </div>
      </div>

      {/* Print-only sheet */}
      <FitSheet fit={fit} unit={unit} />

      {/* Save / rename dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{saved ? "Rename fit" : "Save fit"}</DialogTitle>
              <DialogDescription>
                Give this fit a name so you can find it in your garage.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-2">
              <label htmlFor="fit-name" className="text-sm font-medium text-ink">
                Fit name
              </label>
              <Input
                id="fit-name"
                value={nameDraft}
                autoFocus
                maxLength={60}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder={defaultFitName(fit.input.bikeType)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save fit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Start over confirm */}
      <ConfirmDialog
        open={startOverOpen}
        onOpenChange={setStartOverOpen}
        title={saved ? "Start a new fit?" : "Discard this unsaved fit?"}
        description={
          saved
            ? "Your saved fit stays in your garage. This starts a fresh fit from the beginning."
            : "This fit has not been saved. Starting over will discard it and take you back to the first question."
        }
        confirmLabel={saved ? "Start new fit" : "Discard and start over"}
        destructive={!saved}
        onConfirm={() => void handleStartOver()}
      />
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="h-8 w-40 rounded-sm bg-surface-2" />
      <div className="h-48 rounded-md border border-line bg-surface" />
      <div className="h-32 rounded-md border border-line bg-surface" />
      <div className="h-32 rounded-md border border-line bg-surface" />
    </div>
  );
}

function ResultsNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold text-ink">
        This fit isn&apos;t on this device
      </h1>
      <p className="text-ink-muted">
        BikeFit keeps your fits locally in this browser, so a fit made on another
        device or browser will not appear here. Nothing was lost, it simply lives
        where it was created.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/fit/new">Start a new fit</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/fits">Saved fits</Link>
        </Button>
      </div>
    </div>
  );
}
