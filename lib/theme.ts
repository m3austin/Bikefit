/** Theme preference. `system` follows the OS; default per UX-UI-Design §2. */
export type Theme = "dark" | "light" | "system";

export const THEMES: readonly Theme[] = ["light", "dark", "system"] as const;

export const DEFAULT_THEME: Theme = "system";

/** localStorage key (source of truth) and cookie name (SSR hint). */
export const THEME_STORAGE_KEY = "theme";
export const THEME_COOKIE = "theme";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

/** Resolve a preference to the concrete theme, given the OS preference. */
export function resolveTheme(theme: Theme, prefersDark: boolean): "dark" | "light" {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}
