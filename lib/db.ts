/*
 * The single gateway to IndexedDB (CLAUDE.md): components never touch Dexie
 * directly, only these functions. Schema follows PRD §7: a single-row profile,
 * saved fits (each an input + result snapshot), settings, plus a wizard draft
 * for refresh-safe resume. All measurements are stored in integer mm.
 */

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

/** A deleted fit's id, kept so a delete can propagate to the cloud (Flow 7). */
export type TombstoneRow = { id: string; deletedAt: number };

export const ACTIVE_DRAFT_ID = "active";
export const PROFILE_ID = "me";
export const SETTINGS_ID = "app";

/*
 * Dexie is loaded on demand (dynamic import) rather than at module load, so it
 * stays out of the landing's first-load JS budget (PRD §8). It is pulled in the
 * first time a db function runs, which is always inside an effect or handler.
 */
async function makeDexie(): Promise<AppDb> {
  const { default: Dexie } = await import("dexie");
  const dexie = new Dexie("bikefit");
  dexie.version(1).stores({
    drafts: "id, updatedAt",
    fits: "id, saved, createdAt, updatedAt",
    profile: "id",
    settings: "id",
  });
  // v2 adds local tombstones for cloud sync (Flow 7).
  dexie.version(2).stores({
    tombstones: "id, deletedAt",
  });
  // Dexie exposes a table accessor per store; the AppDb interface narrows it.
  return dexie as unknown as AppDb;
}

/*
 * The minimal table/database surface this module uses. Both the Dexie backend
 * and the in-memory fallback satisfy it, so the access functions below are
 * written once against this interface.
 */
type Row = { id: string };

interface TableLike<T extends Row> {
  get(id: string): Promise<T | undefined>;
  put(item: T): Promise<unknown>;
  delete(id: string): Promise<void>;
  toArray(): Promise<T[]>;
  count(): Promise<number>;
  clear(): Promise<void>;
  bulkPut(items: T[]): Promise<unknown>;
}

interface AppDb {
  drafts: TableLike<WizardDraft>;
  fits: TableLike<StoredFit>;
  profile: TableLike<Profile>;
  settings: TableLike<AppSettings>;
  tombstones: TableLike<TombstoneRow>;
  transaction<T>(mode: string, ...args: unknown[]): Promise<T>;
}

/*
 * In-memory fallback (Flow 8): when IndexedDB is unavailable (a private-mode
 * edge case), the app still works for the session, it just does not persist.
 * A banner tells the rider so.
 */
class MemoryTable<T extends Row> implements TableLike<T> {
  private rows = new Map<string, T>();
  async get(id: string) {
    return this.rows.get(id);
  }
  async put(item: T) {
    this.rows.set(item.id, item);
    return item.id;
  }
  async delete(id: string) {
    this.rows.delete(id);
  }
  async toArray() {
    return [...this.rows.values()];
  }
  async count() {
    return this.rows.size;
  }
  async clear() {
    this.rows.clear();
  }
  async bulkPut(items: T[]) {
    for (const item of items) this.rows.set(item.id, item);
  }
}

class MemoryDb implements AppDb {
  drafts = new MemoryTable<WizardDraft>();
  fits = new MemoryTable<StoredFit>();
  profile = new MemoryTable<Profile>();
  settings = new MemoryTable<AppSettings>();
  tombstones = new MemoryTable<TombstoneRow>();
  async transaction<T>(_mode: string, ...args: unknown[]): Promise<T> {
    const fn = args[args.length - 1] as () => Promise<T>;
    return fn();
  }
}

/*
 * Lazily construct the backend so importing this module never touches
 * IndexedDB on the server (it is unavailable there). Callers run in effects /
 * event handlers on the client.
 */
let dexiePromise: Promise<AppDb> | null = null;
let memoryInstance: MemoryDb | null = null;

function db(): Promise<AppDb> {
  if (isPersistenceAvailable()) {
    dexiePromise ??= makeDexie();
    return dexiePromise;
  }
  memoryInstance ??= new MemoryDb();
  return Promise.resolve(memoryInstance);
}

/** True when local persistence is available (false in private-mode edge cases). */
export function isPersistenceAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

// --- Wizard draft -----------------------------------------------------------

export async function getActiveDraft(): Promise<WizardDraft | undefined> {
  return (await db()).drafts.get(ACTIVE_DRAFT_ID);
}

export async function saveActiveDraft(
  draft: Omit<WizardDraft, "id" | "updatedAt">,
): Promise<void> {
  await (await db()).drafts.put({
    ...draft,
    id: ACTIVE_DRAFT_ID,
    updatedAt: Date.now(),
  });
}

export async function clearActiveDraft(): Promise<void> {
  await (await db()).drafts.delete(ACTIVE_DRAFT_ID);
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
  await (await db()).fits.put(fit);
  return fit;
}

export async function getFit(id: string): Promise<StoredFit | undefined> {
  return (await db()).fits.get(id);
}

/** Merge a patch into a fit and bump updatedAt. Returns the updated fit. */
export async function updateFit(
  id: string,
  patch: Partial<Pick<StoredFit, "name" | "saved">>,
): Promise<StoredFit | undefined> {
  const d = await db();
  const existing = await d.fits.get(id);
  if (!existing) return undefined;
  const updated: StoredFit = { ...existing, ...patch, updatedAt: Date.now() };
  await d.fits.put(updated);
  return updated;
}

export async function deleteFit(id: string): Promise<void> {
  const d = await db();
  await d.fits.delete(id);
  // Record a tombstone so the delete can propagate to the cloud if the rider
  // is (or later becomes) signed in. Harmless when signed out.
  await d.tombstones.put({ id, deletedAt: Date.now() });
}

/** Saved fits (the garage), newest first (Flow 4). */
export async function listSavedFits(): Promise<StoredFit[]> {
  // `saved` is a boolean, not a valid IndexedDB key, so filter rather than index.
  const all = await (await db()).fits.toArray();
  return all.filter((f) => f.saved).sort((a, b) => b.createdAt - a.createdAt);
}

/** Write a fit exactly as given (used to restore after an undo). */
export async function putFit(fit: StoredFit): Promise<void> {
  const d = await db();
  await d.fits.put(fit);
  // Restoring clears any tombstone so the fit is no longer marked deleted.
  await d.tombstones.delete(fit.id);
}

// --- Tombstones & sync helpers ----------------------------------------------

export async function listTombstones(): Promise<TombstoneRow[]> {
  return (await db()).tombstones.toArray();
}

/** Apply a remote delete: drop the fit and record the remote's deletedAt. */
export async function applyRemoteDelete(
  id: string,
  deletedAt: number,
): Promise<void> {
  const d = await db();
  await d.fits.delete(id);
  await d.tombstones.put({ id, deletedAt });
}

/** Drop a tombstone once its delete is confirmed on the remote. */
export async function pruneTombstone(id: string): Promise<void> {
  await (await db()).tombstones.delete(id);
}

// --- Profile & settings -----------------------------------------------------

export async function getProfile(): Promise<Profile | undefined> {
  return (await db()).profile.get(PROFILE_ID);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  return (await db()).settings.get(SETTINGS_ID);
}

/** Merge a settings patch (units/theme) so each field persists independently. */
export async function saveSettings(
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<void> {
  const d = await db();
  const existing = await d.settings.get(SETTINGS_ID);
  await d.settings.put({ ...existing, ...patch, id: SETTINGS_ID });
}

// --- Backup import / erase --------------------------------------------------

/** Replace all fits and the profile (used by import "replace"). */
export async function replaceData(params: {
  fits: StoredFit[];
  profile?: Profile;
}): Promise<void> {
  const d = await db();
  await d.transaction("rw", d.fits, d.profile, async () => {
    await d.fits.clear();
    await d.profile.clear();
    if (params.fits.length) await d.fits.bulkPut(params.fits);
    if (params.profile) await d.profile.put(params.profile);
  });
}

/** Upsert fits and the profile without removing existing data (import "merge"). */
export async function mergeData(params: {
  fits: StoredFit[];
  profile?: Profile;
}): Promise<void> {
  const d = await db();
  await d.transaction("rw", d.fits, d.profile, async () => {
    if (params.fits.length) await d.fits.bulkPut(params.fits);
    if (params.profile) await d.profile.put(params.profile);
  });
}

/** True when any user data exists (drives the import merge/replace choice). */
export async function hasAnyData(): Promise<boolean> {
  const d = await db();
  const fits = await d.fits.count();
  const profiles = await d.profile.count();
  return fits > 0 || profiles > 0;
}

/** Wipe every table (erase everything, Flow 6). */
export async function eraseAll(): Promise<void> {
  const d = await db();
  await Promise.all([
    d.drafts.clear(),
    d.fits.clear(),
    d.profile.clear(),
    d.settings.clear(),
    d.tombstones.clear(),
  ]);
}
