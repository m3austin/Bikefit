import { describe, expect, it } from "vitest";

import { isTheme, resolveTheme } from "@/lib/theme";

describe("theme helpers", () => {
  it("recognises valid theme values", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("system")).toBe(true);
  });

  it("rejects invalid theme values", () => {
    expect(isTheme("blue")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("resolves explicit preferences regardless of OS", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("resolves system to the OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
