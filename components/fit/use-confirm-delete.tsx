"use client";

import * as React from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/toast-provider";

/*
 * The one shared destructive-action utility (CLAUDE.md universal delete rule):
 * a confirmation dialog naming exactly what will be removed (Cancel focused by
 * default), then a ~10s Undo toast that fully restores. Every delete in the app
 * routes through this. `remove` and `restore` update both storage and UI so the
 * hook only orchestrates the dialog and toast.
 */
export function useConfirmDelete<T>({
  getName,
  remove,
  restore,
  noun = "fit",
}: {
  getName: (item: T) => string;
  remove: (item: T) => void | Promise<void>;
  restore: (item: T) => void | Promise<void>;
  noun?: string;
}): { confirm: (item: T) => void; dialog: React.ReactNode } {
  const { toast } = useToast();
  const [pending, setPending] = React.useState<T | null>(null);

  const confirm = React.useCallback((item: T) => setPending(item), []);

  const onConfirm = React.useCallback(() => {
    const item = pending;
    setPending(null);
    if (item == null) return;
    void Promise.resolve(remove(item)).then(() => {
      toast({
        title: `Deleted ${getName(item)}`,
        action: { label: "Undo", onClick: () => void restore(item) },
        durationMs: 10000,
      });
    });
  }, [pending, remove, restore, toast, getName]);

  const name = pending ? getName(pending) : "";
  const dialog = (
    <ConfirmDialog
      open={pending != null}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      title={`Delete ${name}?`}
      description={`This removes ${name} from this device. You can undo for a few seconds after.`}
      confirmLabel={`Delete ${noun}`}
      onConfirm={onConfirm}
    />
  );

  return { confirm, dialog };
}
