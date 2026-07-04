import { expect, test, type Page } from "@playwright/test";

import { completeWizard } from "./helpers";

/*
 * Banned-word copy check across all rendered UI text (PRD §12). "professional"
 * is allowed only inside the required disclaimer ("a substitute for a
 * professional bike fit"), so we check the specific banned phrasings rather
 * than the bare word.
 */
const BANNED = [
  "prescription",
  "diagnosis",
  "guaranteed",
  "perfect fit",
  "professional fit",
  "professional-grade",
];

async function bodyText(page: Page): Promise<string> {
  return (await page.locator("body").innerText()).toLowerCase();
}

function assertClean(text: string, where: string) {
  for (const word of BANNED) {
    expect(text, `"${word}" found in ${where}`).not.toContain(word);
  }
  // No em dashes anywhere in product copy (PRD §12).
  expect(text, `em dash found in ${where}`).not.toContain("—");
}

const routes = [
  "/",
  "/method",
  "/fits",
  "/settings",
  "/cycling",
  "/cycling/fit/new",
  "/cycling/video",
  "/cycling/drills",
  "/golf",
  "/golf/clubs",
  "/golf/video",
  "/golf/drills",
  "/running",
  "/running/video",
  "/running/drills",
  "/privacy",
];

for (const route of routes) {
  test(`no banned words: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    assertClean(await bodyText(page), route);
  });
}

test("no banned words: results", async ({ page }) => {
  await completeWizard(page);
  await page.getByRole("heading", { name: "Saddle height" }).waitFor();
  // Expand every collapsible so the hidden copy is checked too.
  for (const trigger of await page.getByRole("button").all()) {
    const label = (await trigger.textContent()) ?? "";
    if (/how to apply|feel right|show the method/i.test(label)) {
      await trigger.click();
    }
  }
  assertClean(await bodyText(page), "results");
});
