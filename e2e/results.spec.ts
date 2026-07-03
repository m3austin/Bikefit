import { expect, test, type Page } from "@playwright/test";

/*
 * Flow 3 (results interaction): reveal from the wizard, save + rename dialog,
 * start-over confirm, and the not-found state for an unknown id.
 */

async function fillEnter(page: Page, name: string, value: string) {
  const input = page.getByRole("textbox", { name: new RegExp(name, "i") });
  await input.click();
  await input.fill(value);
  await input.press("Enter");
}

async function completeWizard(page: Page) {
  await page.goto("/fit/new");
  await page.getByRole("radio", { name: /Road/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click(); // priority
  await fillEnter(page, "Height", "178");
  await fillEnter(page, "Inseam", "82");
  await fillEnter(page, "Torso", "60");
  await fillEnter(page, "Arm", "64");
  await fillEnter(page, "Shoulder", "42");
  await page.getByRole("radio", { name: /Fingertips/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip this step" }).click();
  await page.getByRole("button", { name: "Calculate my fit" }).click();
  await page.waitForURL(/\/fit\/[0-9a-f-]{36}/);
}

test.describe("results", () => {
  test("reveal from wizard shows the fit sheet with no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));

    await completeWizard(page);

    await expect(page.getByRole("heading", { name: "Saddle height" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reach" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Frame size" })).toBeVisible();
    await expect(
      page.getByText(/educated starting point/).first(),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("save names the fit and confirms with a toast", async ({ page }) => {
    await completeWizard(page);

    await page.getByRole("button", { name: "Save fit" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Fit name" }).fill("My road bike");
    await dialog.getByRole("button", { name: "Save fit" }).click();

    // Toast is transient; give it headroom under parallel load. exact:true so
    // it does not also match Radix's screen-reader announcement region.
    await expect(
      page.getByText("Fit saved", { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    // The action now offers rename instead of save (durable saved state).
    await expect(page.getByRole("button", { name: "Rename fit" })).toBeVisible();
  });

  test("start over discards an unsaved fit and returns to the wizard", async ({
    page,
  }) => {
    await completeWizard(page);
    await page.getByRole("button", { name: "Start over" }).click();
    await page
      .getByRole("button", { name: "Discard and start over" })
      .click();
    await page.waitForURL(/\/fit\/new$/);
  });

  test("unknown id shows the not-found state", async ({ page }) => {
    await page.goto("/fit/does-not-exist");
    await expect(
      page.getByRole("heading", { name: /isn't on this device/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Start a new fit" })).toBeVisible();
  });
});
