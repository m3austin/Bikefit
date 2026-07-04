"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bike, Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FitSummaryCard } from "@/components/fit/fit-summary-card";
import { useConfirmDelete } from "@/components/fit/use-confirm-delete";
import { useUnit } from "@/components/unit-provider";
import {
  deleteFit,
  listSavedFits,
  putFit,
  saveActiveDraft,
  updateFit,
  type StoredFit,
} from "@/lib/db";
import { draftFromInput } from "@/lib/wizard";

type LoadState = "loading" | "ready" | "error";

export function SavedFits() {
  const router = useRouter();
  const { unit } = useUnit();

  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [fits, setFits] = React.useState<StoredFit[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);

  const sortNewest = (list: StoredFit[]) =>
    [...list].sort((a, b) => b.createdAt - a.createdAt);

  const retry = () => {
    setLoadState("loading");
    setShowSkeleton(false);
    setReloadKey((k) => k + 1);
  };

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const saved = await listSavedFits();
        if (active) {
          setFits(saved);
          setLoadState("ready");
        }
      } catch {
        if (active) setLoadState("error");
      }
    }
    void load();
    const timer = setTimeout(() => {
      if (active) setShowSkeleton(true);
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reloadKey]);

  const { confirm: confirmDelete, dialog: deleteDialog } =
    useConfirmDelete<StoredFit>({
      getName: (f) => f.name,
      remove: async (f) => {
        await deleteFit(f.id);
        setFits((prev) => prev.filter((x) => x.id !== f.id));
      },
      restore: async (f) => {
        await putFit(f);
        setFits((prev) => sortNewest([...prev, f]));
      },
    });

  const startRename = (fit: StoredFit) => {
    setEditingId(fit.id);
    setEditingName(fit.name);
  };

  const commitRename = async (fit: StoredFit) => {
    const name = editingName.trim() || fit.name;
    setEditingId(null);
    if (name === fit.name) return;
    const updated = await updateFit(fit.id, { name });
    if (updated) {
      setFits((prev) => prev.map((f) => (f.id === fit.id ? updated : f)));
    }
  };

  const duplicate = async (fit: StoredFit) => {
    const cautions = fit.result.meta.cautionFlags.map((flag) => flag.input);
    await saveActiveDraft(draftFromInput(fit.input, cautions));
    router.push("/fit/new");
  };

  if (loadState === "loading") {
    return showSkeleton ? <GarageSkeleton /> : null;
  }

  if (loadState === "error") {
    return (
      <StateBlock
        title="We couldn't open your saved fits"
        body="Something went wrong reading local storage. Your data is still on this device."
      >
        <Button onClick={retry}>Try again</Button>
      </StateBlock>
    );
  }

  if (fits.length === 0) {
    return (
      <StateBlock
        icon
        title="No saved fits yet"
        body="When you calculate a fit and save it, it lands here so you can open, rename, or re-run it later."
      >
        <Button asChild>
          <Link href="/fit">Start your first fit</Link>
        </Button>
      </StateBlock>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Saved fits</h1>
        <Button asChild variant="outline">
          <Link href="/fit">New fit</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fits.map((fit) => (
          <FitSummaryCard
            key={fit.id}
            fit={fit}
            unit={unit}
            onOpen={() => router.push(`/fit/${fit.id}`)}
            renameControl={
              editingId === fit.id ? (
                <Input
                  autoFocus
                  aria-label="Fit name"
                  value={editingName}
                  maxLength={60}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => void commitRename(fit)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commitRename(fit);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                />
              ) : undefined
            }
            actions={
              editingId === fit.id ? null : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-ink-muted"
                      aria-label={`Actions for ${fit.name}`}
                    >
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => startRename(fit)}>
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void duplicate(fit)}>
                      <Copy />
                      Duplicate and edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      destructive
                      onSelect={() => confirmDelete(fit)}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }
          />
        ))}
      </div>

      {deleteDialog}
    </div>
  );
}

function GarageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="h-8 w-40 rounded-sm bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-md border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}

function StateBlock({
  title,
  body,
  icon,
  children,
}: {
  title: string;
  body: string;
  icon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      {icon ? (
        <div className="grid size-16 place-items-center rounded-full bg-surface-2 text-accent">
          <Bike className="size-8" aria-hidden="true" />
        </div>
      ) : null}
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="text-ink-muted">{body}</p>
      {children}
    </div>
  );
}
