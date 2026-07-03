import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { completeWizard } from "./helpers";

/*
 * Accessibility audit (UX-UI-Design §6, PRD §8). Zero serious/critical axe
 * violations on every key surface, in the default (dark) theme.
 */

async function audit(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  return serious;
}

const staticRoutes = [
  ["/", "landing"],
  ["/fit/new", "wizard"],
  ["/fits", "garage (empty)"],
  ["/settings", "settings"],
  ["/method", "method"],
] as const;

for (const [path, label] of staticRoutes) {
  test(`no serious a11y violations: ${label}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const violations = await audit(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

test("no serious a11y violations: results", async ({ page }) => {
  // Reduced motion renders the reveal instantly, so axe measures the final
  // (fully opaque) colors rather than mid-fade blends. Also exercises the
  // reduced-motion path.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await completeWizard(page);
  await page.getByRole("heading", { name: "Saddle height" }).waitFor();
  const violations = await audit(page);
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
