import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Unit tests use .test.*; Playwright specs (.spec.*) live in e2e/.
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**", "playwright-report/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // The engine is the contract: hold it to 100% branch coverage (PRD §9).
      include: ["lib/engine/**/*.ts"],
      exclude: ["lib/engine/**/*.test.ts"],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
