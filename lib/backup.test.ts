import { describe, expect, it } from "vitest";

import { buildBackup, validateBackup, BACKUP_SCHEMA_VERSION } from "@/lib/backup";
import { computeFit, type FitInput } from "@/lib/engine";
import type { StoredFit } from "@/lib/db";

const input: FitInput = {
  bikeType: "road",
  priority: "balanced",
  flexibility: "medium",
  measurements: {
    heightMm: 1780,
    inseamMm: 820,
    torsoMm: 600,
    armMm: 640,
    shoulderMm: 420,
  },
};

const fit: StoredFit = {
  id: "abc",
  name: "Road fit",
  input,
  result: computeFit(input),
  saved: true,
  createdAt: 1000,
  updatedAt: 1000,
};

describe("backup round-trip", () => {
  it("builds a backup and validates it", () => {
    const backup = buildBackup({
      settings: { units: "cm", theme: "dark" },
      profile: null,
      fits: [fit],
      exportedAt: "2026-07-03T00:00:00.000Z",
    });
    const result = validateBackup(backup);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fits).toHaveLength(1);
      expect(result.data.fits[0]!.id).toBe("abc");
      expect(result.data.settings.units).toBe("cm");
    }
  });
});

describe("validateBackup rejects bad input (import changes nothing)", () => {
  it("rejects a non-object", () => {
    expect(validateBackup("nope").ok).toBe(false);
    expect(validateBackup(null).ok).toBe(false);
  });

  it("rejects a file that is not a BikeFit backup", () => {
    const r = validateBackup({ app: "other", schemaVersion: 1, fits: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not a BikeFit backup/i);
  });

  it("rejects a different schema version", () => {
    const r = validateBackup({
      app: "bikefit",
      schemaVersion: BACKUP_SCHEMA_VERSION + 1,
      fits: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/different version/i);
  });

  it("rejects damaged fits", () => {
    const r = validateBackup({
      app: "bikefit",
      schemaVersion: 1,
      fits: [{ id: "x" }], // missing input/result/name
    });
    expect(r.ok).toBe(false);
  });

  it("accepts an empty garage", () => {
    const r = validateBackup({ app: "bikefit", schemaVersion: 1, fits: [] });
    expect(r.ok).toBe(true);
  });
});
