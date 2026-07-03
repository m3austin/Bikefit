/*
 * JSON backup format for export/import (Flow 6). Pure and dependency-free so it
 * is easy to validate and test. Import validates strictly: anything that does
 * not match this schema is rejected and changes nothing on the device.
 */

import type { AppSettings, Profile, StoredFit } from "@/lib/db";

export const BACKUP_APP = "bikefit";
export const BACKUP_SCHEMA_VERSION = 1;

export type BackupSettings = Pick<AppSettings, "units" | "theme">;

export type BackupFile = {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  settings: BackupSettings;
  profile: Profile | null;
  fits: StoredFit[];
};

export function buildBackup(params: {
  settings: BackupSettings;
  profile: Profile | null;
  fits: StoredFit[];
  exportedAt: string;
}): BackupFile {
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: params.exportedAt,
    settings: params.settings,
    profile: params.profile,
    fits: params.fits,
  };
}

export type ValidateResult =
  | { ok: true; data: BackupFile }
  | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidFit(v: unknown): v is StoredFit {
  if (!isObject(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    isObject(v.input) &&
    isObject(v.result)
  );
}

/** Validate a parsed backup object. On any problem, returns a human message. */
export function validateBackup(raw: unknown): ValidateResult {
  if (!isObject(raw)) {
    return { ok: false, error: "That file is not readable as JSON data." };
  }
  if (raw.app !== BACKUP_APP) {
    return { ok: false, error: "That file is not a BikeFit backup." };
  }
  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        "That backup was made by a different version of BikeFit and cannot be imported.",
    };
  }
  if (!Array.isArray(raw.fits) || !raw.fits.every(isValidFit)) {
    return { ok: false, error: "That backup is missing or has damaged fits." };
  }

  const settingsRaw = isObject(raw.settings) ? raw.settings : {};
  const settings: BackupSettings = {};
  if (settingsRaw.units === "cm" || settingsRaw.units === "in") {
    settings.units = settingsRaw.units;
  }
  if (typeof settingsRaw.theme === "string") {
    settings.theme = settingsRaw.theme;
  }

  const profile = isObject(raw.profile) ? (raw.profile as Profile) : null;

  // Normalise fit timestamps so a hand-edited file cannot break sorting.
  const fits = (raw.fits as StoredFit[]).map((f) => ({
    ...f,
    saved: typeof f.saved === "boolean" ? f.saved : true,
    createdAt: typeof f.createdAt === "number" ? f.createdAt : 0,
    updatedAt: typeof f.updatedAt === "number" ? f.updatedAt : 0,
  }));

  return {
    ok: true,
    data: {
      app: BACKUP_APP,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt:
        typeof raw.exportedAt === "string" ? raw.exportedAt : "",
      settings,
      profile,
      fits,
    },
  };
}
