"use client";

import * as React from "react";
import { Download, Heart, TriangleAlert, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UnitToggle } from "@/components/fit/unit-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountSection } from "@/components/fit/account-section";
import { useToast } from "@/components/toast-provider";
import { ENGINE_VERSION } from "@/lib/engine";
import { supportUrl } from "@/lib/support";
import { isTheme } from "@/lib/theme";
import { useTheme } from "@/components/theme-provider";
import { useUnit } from "@/components/unit-provider";
import {
  buildBackup,
  validateBackup,
  type BackupFile,
} from "@/lib/backup";
import {
  eraseAll,
  getProfile,
  hasAnyData,
  isPersistenceAvailable,
  listSavedFits,
  mergeData,
  replaceData,
} from "@/lib/db";

function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="flex scroll-mt-20 flex-col gap-4 border-t border-line py-8 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsView() {
  const { unit } = useUnit();
  const { setUnit } = useUnit();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [pendingImport, setPendingImport] = React.useState<BackupFile | null>(
    null,
  );
  const [replaceConfirmOpen, setReplaceConfirmOpen] = React.useState(false);
  const [eraseText, setEraseText] = React.useState("");

  const applySettings = React.useCallback(
    (data: BackupFile) => {
      if (data.settings.units) setUnit(data.settings.units);
      if (data.settings.theme && isTheme(data.settings.theme)) {
        setTheme(data.settings.theme);
      }
    },
    [setUnit, setTheme],
  );

  const handleExport = React.useCallback(async () => {
    const fits = await listSavedFits();
    const profile = (await getProfile()) ?? null;
    const backup = buildBackup({
      settings: { units: unit, theme },
      profile,
      fits,
      exportedAt: new Date().toISOString(),
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bikefit-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Backup downloaded",
      description: `${fits.length} saved ${fits.length === 1 ? "fit" : "fits"} exported.`,
    });
  }, [unit, theme, toast]);

  const finishImport = React.useCallback(
    async (data: BackupFile, mode: "merge" | "replace") => {
      const payload = {
        fits: data.fits,
        profile: data.profile ?? undefined,
      };
      if (mode === "replace") await replaceData(payload);
      else await mergeData(payload);
      applySettings(data);
      setPendingImport(null);
      toast({
        title: mode === "replace" ? "Backup restored" : "Backup imported",
        description: `${data.fits.length} ${data.fits.length === 1 ? "fit" : "fits"} imported.`,
      });
    },
    [applySettings, toast],
  );

  const handleFile = React.useCallback(
    async (file: File) => {
      setImportError(null);
      setPendingImport(null);
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        setImportError("That file is not valid JSON.");
        return;
      }
      const result = validateBackup(parsed);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      // Nothing exists yet: import straight away. Otherwise ask merge/replace.
      if (await hasAnyData()) {
        setPendingImport(result.data);
      } else {
        await finishImport(result.data, "merge");
      }
    },
    [finishImport],
  );

  const handleErase = React.useCallback(async () => {
    await eraseAll();
    try {
      localStorage.removeItem("theme");
      localStorage.removeItem("units");
    } catch {
      // ignore
    }
    // Hard navigation so in-memory theme/units reset to defaults on a fresh /.
    window.location.assign("/");
  }, []);

  const canErase = eraseText.trim().toLowerCase() === "erase";
  const persistence = isPersistenceAvailable();
  const supportLink = supportUrl();

  return (
    <div className="flex flex-col">
      <h1 className="pb-4 text-2xl font-semibold text-ink">Settings</h1>

      <Section
        title="Units"
        description="Choose how measurements are shown. Values are always stored the same way, so switching never changes your fits."
      >
        <UnitToggle />
      </Section>

      <Section title="Theme" description="Light, dark, or match your system.">
        <ThemeToggle />
      </Section>

      <Section
        title="Account and sync"
        description="Optional. Sync your saved fits across devices. BikeFit works fully without an account."
      >
        <AccountSection />
      </Section>

      <Section
        title="Your data"
        description="Everything stays on this device. Export a backup you can keep or move to another browser."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void handleExport()}>
            <Download />
            Export backup
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
            Import backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {importError ? (
          <p
            role="alert"
            className="flex items-center gap-2 text-sm text-danger"
          >
            <TriangleAlert className="size-4" aria-hidden="true" />
            {importError} Nothing on this device was changed.
          </p>
        ) : null}

        {pendingImport ? (
          <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-2 p-4">
            <p className="text-sm text-ink">
              You already have data on this device. Merge this backup with it, or
              replace everything?
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void finishImport(pendingImport, "merge")}>
                Merge
              </Button>
              <Button
                variant="destructive"
                onClick={() => setReplaceConfirmOpen(true)}
              >
                Replace everything
              </Button>
              <Button variant="ghost" onClick={() => setPendingImport(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section
        title="Erase everything"
        description="Permanently delete all fits, your profile, and settings on this device. This cannot be undone."
      >
        <div className="flex flex-col gap-3">
          <label htmlFor="erase-confirm" className="text-sm text-ink-muted">
            Type <span className="measurement font-medium text-ink">erase</span>{" "}
            to confirm.
          </label>
          <Input
            id="erase-confirm"
            value={eraseText}
            onChange={(e) => setEraseText(e.target.value)}
            placeholder="erase"
            className="max-w-xs"
            autoComplete="off"
          />
          <Button
            variant="destructive"
            className="self-start"
            disabled={!canErase || !persistence}
            onClick={() => void handleErase()}
          >
            Erase everything
          </Button>
        </div>
      </Section>

      {supportLink ? (
        <Section
          id="support"
          title="Support BikeFit"
          description="Free, no ads, nothing to buy, and it stays that way. If BikeFit helped you get comfortable on your bike and you would like to help cover the hosting, you can leave a small tip. Every feature stays free for everyone either way."
        >
          <div className="flex flex-col gap-3">
            <Button asChild variant="outline" className="self-start">
              <a href={supportLink} target="_blank" rel="noopener noreferrer">
                <Heart />
                Leave a tip
              </a>
            </Button>
            <p className="text-xs text-ink-muted">
              Payments go through Stripe on their site. BikeFit never sees
              your card details.
            </p>
          </div>
        </Section>
      ) : null}

      <Section title="About">
        <p className="text-sm text-ink-muted">
          BikeFit is free and local-first. Your measurements never leave this
          device. There are no cookies to consent to.
        </p>
        <p className="measurement text-sm text-ink-muted">
          Engine version {ENGINE_VERSION}
        </p>
      </Section>

      <ConfirmDialog
        open={replaceConfirmOpen}
        onOpenChange={setReplaceConfirmOpen}
        title="Replace all local data?"
        description="This deletes every fit on this device and replaces them with the backup. This cannot be undone."
        confirmLabel="Replace everything"
        onConfirm={() => {
          setReplaceConfirmOpen(false);
          if (pendingImport) void finishImport(pendingImport, "replace");
        }}
      />
    </div>
  );
}
