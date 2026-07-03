import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Guards the engine contract (CLAUDE.md, PRD §6): lib/engine is pure and
 * dependency-free, with zero imports from React, Next, or the DOM. This runs in
 * CI so a stray import fails the build rather than slipping through review.
 */

const ENGINE_DIR = join(process.cwd(), "lib", "engine");

function engineSourceFiles(): string[] {
  return readdirSync(ENGINE_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => join(ENGINE_DIR, f));
}

describe("engine purity", () => {
  const files = engineSourceFiles();

  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.split(/[\\/]/).pop()} imports nothing from React/Next/DOM`, () => {
      const src = readFileSync(file, "utf-8");
      const importSpecifiers = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map(
        (m) => m[1]!,
      );
      for (const spec of importSpecifiers) {
        expect(spec.startsWith("@/lib/engine")).toBe(true);
      }
      // No direct DOM/global access either.
      expect(src).not.toMatch(/\b(document|window|navigator|localStorage)\b/);
      expect(src).not.toMatch(/from\s+["'](react|react-dom|next)/);
    });
  }
});
