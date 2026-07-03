/*
 * The single gateway to IndexedDB (CLAUDE.md): components never touch Dexie
 * directly, only these functions. Schema follows PRD §7: a single-row profile,
 * saved fits (each an input + result snapshot), settings, plus a wizard draft
 * for refresh-safe resume. All measurements are stored in integer mm.
 */

import Dexie, { type Table } from "dexie";

import type {
  BikeType,
  FitInput,
  FitResult,
  Flexibility,
  MeasurementKey,
  Priority,
} from "@/lib/engine";
import type { Unit } from "@/lib/units";

/** The in-progress wizard, persisted every step so a refresh resumes it. */
export type WizardDraft = {
  id: string; // singleton: ACTIVE_DRAFT_ID
  bikeType?: BikeType;
  priority?: Priority;
  flexibility?: Flexibility;
  /** Committed values in mm, keyed by measurement. */
  values: Partial<Record<MeasurementKey, number>>;
  /** Measurements the rider confirmed as unusual (carry a caution flag). */
  cautions: MeasurementKey[];
  /** True when the rider chose to skip the optional foot-length step. */
  footSkipped?: boolean;
  stepIndex: number;
  updatedAt: number;
};

/** A saved fit: input + result snapshot, so it never changes when the engine does. */
export type StoredFit = {
  id: string;
  name: string;
  input: FitInput;
  result: FitResult;
  /** False until the rider explicitly saves it to the garage (Flow 3). */
  saved: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Profile = {
  id: string; // singleton: PROFILE_ID
  values: Partial<Record<MeasurementKey, number>>;
  flexibility?: Flexibility;
  updatedAt: number;
};

export type AppSettings = {
  id: string; // singleton: SETTINGS_ID
  units?: Unit;
  theme?: string;
};

export const ACTIVE_DRAFT_ID = "active";
export const PROFILE_ID = "me";
export const SETTINGS_ID = "app";

class BikeFitDatabase extends Dexie {
  drafts!: Table<WizardDraft, string>;
  fits!: Table<StoredFit, string>;
  profile!: Table<Profile, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("bikefit");
    this.version(1).stores({
      drafts: "id, updatedAt",
      fits: "id, saved, createdAt, updatedAt",
      profile: "id",
      settings: "id",
    });
  }
}

/*
 * Lazily construct the Dexie instance so importing this module never touches
 * IndexedDB on the server (it is unavailable there). Callers run in effects /
 * event handlers on the client.
 */
let dbInstance: BikeFitDatabase | null = null;

function db(): BikeFitDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable in this environment");
  }
  dbInstance ??= new BikeFitDatabase();
  return dbInstance;
}

/** True when local persistence is available (false in private-mode edge cases). */
export function isPersistenceAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

// --- Wizard draft -----------------------------------------------------------

export async function getActiveDraft(): Promise<WizardDraft | undefined> {
  return db().drafts.get(ACTIVE_DRAFT_ID);
}

export async function saveActiveDraft(
  draft: Omit<WizardDraft, "id" | "updatedAt">,
): Promise<void> {
  await db().drafts.put({
    ...draft,
    id: ACTIVE_DRAFT_ID,
    updatedAt: Date.now(),
  });
}

export async function clearActiveDraft(): Promise<void> {
  await db().drafts.delete(ACTIVE_DRAFT_ID);
}

// --- Fits -------------------------------------------------------------------

export async function createFit(params: {
  id: string;
  name: string;
  input: FitInput;
  result: FitResult;
  saved?: boolean;
}): Promise<StoredFit> {
  const now = Date.now();
  const fit: StoredFit = {
    id: params.id,
    name: params.name,
    input: params.input,
    result: params.result,
    saved: params.saved ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await db().fits.put(fit);
  return fit;
}

export async function getFit(id: string): Promise<StoredFit | undefined> {
  return db().fits.get(id);
}

/** Merge a patch into a fit and bump updatedAt. Returns the updated fit. */
export async function updateFit(
  id: string,
  patch: Partial<Pick<StoredFit, "name" | "saved">>,
): Promise<StoredFit | undefined> {
  const existing = await db().fits.get(id);
  if (!existing) return undefined;
  const updated: StoredFit = { ...existing, ...patch, updatedAt: Date.now() };
  await db().fits.put(updated);
  return updated;
}

export async function deleteFit(id: string): Promise<void> {
  await db().fits.delete(id);
}

/** Saved fits (the garage), newest first (Flow 4). */
export async function listSavedFits(): Promise<StoredFit[]> {
  // `saved` is a boolean, not a valid IndexedDB key, so filter rather than index.
  const all = await db().fits.toArray();
  return all.filter((f) => f.saved).sort((a, b) => b.createdAt - a.createdAt);
}

/** Write a fit exactly as given (used to restore after an undo). */
export async function putFit(fit: StoredFit): Promise<void> {
  await db().fits.put(fit);
}

// --- Profile & settings -----------------------------------------------------

export async function getProfile(): Promise<Profile | undefined> {
  return db().profile.get(PROFILE_ID);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  return db().settings.get(SETTINGS_ID);
}

/** Merge a settings patch (units/theme) so each field persists independently. */
export async function saveSettings(
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<void> {
  const existing = await db().settings.get(SETTINGS_ID);
  await db().settings.put({ ...existing, ...patch, id: SETTINGS_ID });
}

// --- Backup import / erase --------------------------------------------------

/** Replace all fits and the profile (used by import "replace"). */
export async function replaceData(params: {
  fits: StoredFit[];
  profile?: Profile;
}): Promise<void> {
  await db().transaction("rw", db().fits, db().profile, async () => {
    await db().fits.clear();
    await db().profile.clear();
    if (params.fits.length) await db().fits.bulkPut(params.fits);
    if (params.profile) await db().profile.put(params.profile);
  });
}

/** Upsert fits and the profile without removing existing data (import "merge"). */
export async function mergeData(params: {
  fits: StoredFit[];
  profile?: Profile;
}): Promise<void> {
  await db().transaction("rw", db().fits, db().profile, async () => {
    if (params.fits.length) await db().fits.bulkPut(params.fits);
    if (params.profile) await db().profile.put(params.profile);
  });
}

/** True when any user data exists (drives the import merge/replace choice). */
export async function hasAnyData(): Promise<boolean> {
  const fits = await db().fits.count();
  const profiles = await db().profile.count();
  return fits > 0 || profiles > 0;
}

/** Wipe every table (erase everything, Flow 6). */
export async function eraseAll(): Promise<void> {
  await Promise.all([
    db().drafts.clear(),
    db().fits.clear(),
    db().profile.clear(),
    db().settings.clear(),
  ]);
}
