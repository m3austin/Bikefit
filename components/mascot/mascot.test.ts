import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { poseForSport, type MascotPose } from "@/components/mascot/mascot";
import { SPORTS } from "@/lib/sports/registry";

/*
 * Mascot contract (docs/sportfit/04 section 4). Two guarantees worth locking:
 * every sport maps to a pose, and every pose has a standalone named SVG in
 * public/mascot (the merch groundwork the doc asks us not to paint over).
 */

const POSES: MascotPose[] = [
  "cycling",
  "golf",
  "running",
  "swimming",
  "lifting",
  "cheer",
  "faceplant",
];

describe("mascot poses", () => {
  it("maps every registry sport to its own pose", () => {
    for (const sport of SPORTS) {
      // Every real sport slug returns a pose named for it.
      expect(poseForSport(sport.slug)).toBe(sport.slug);
    }
  });

  it("falls back to a neutral cheer for an unknown slug (the hub)", () => {
    expect(poseForSport(undefined)).toBe("cheer");
    expect(poseForSport("not-a-sport")).toBe("cheer");
  });

  it("ships a standalone SVG for every pose (merch groundwork)", () => {
    for (const pose of POSES) {
      const file = join(process.cwd(), "public", "mascot", `${pose}.svg`);
      expect(existsSync(file), file).toBe(true);
    }
  });
});
