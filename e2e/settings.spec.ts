import { expect, test } from "@playwright/test";

import { completeWizardAndSave } from "./helpers";

/*
 * Flow 6 (export / import / erase). Fresh context per test = empty IndexedDB.
 */

test.describe("settings data controls", () => {
  test("export downloads a backup file", async ({ page }) => {
    await completeWizardAndSave(page, "Export me");
    await page.goto("/settings");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export backup" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("bikefit-backup.json");
  });

  test("invalid import shows an error and changes nothing", async ({ page }) => {
    await page.goto("/settings");
    await page.setInputFiles('input[type="file"]', {
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"app":"other"}'),
    });
    await expect(page.getByText(/not a BikeFit backup/i)).toBeVisible();
    await expect(page.getByText(/Nothing on this device was changed/i)).toBeVisible();
  });

  test("import into an empty device restores fits", async ({ page }) => {
    await page.goto("/settings");
    const backup = {
      app: "bikefit",
      schemaVersion: 1,
      exportedAt: "2026-07-03T00:00:00.000Z",
      settings: { units: "cm", theme: "dark" },
      profile: null,
      fits: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Imported fit",
          saved: true,
          createdAt: 1000,
          updatedAt: 1000,
          input: {
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
          },
          result: {
            meta: { engineVersion: "1.0.0", computedAt: "", cautionFlags: [] },
            saddleHeight: {
              low: 716,
              high: 728,
              start: 722,
              methods: { lemond: 724, hamley: 721 },
            },
            saddleSetback: { low: 91, high: 111, start: 101 },
            frameSize: { roadCm: 54.5 },
            reachBand: { low: 645, high: 675, start: 660 },
            barDrop: { low: 30, high: 60, start: 45 },
            barWidthMm: 420,
            crankLengthMm: 172.5,
          },
        },
      ],
    };
    await page.setInputFiles('input[type="file"]', {
      name: "bikefit-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await expect(
      page.getByText("Backup imported", { exact: true }),
    ).toBeVisible();
    await page.goto("/fits");
    await expect(page.getByText("Imported fit")).toBeVisible();
  });

  test("erase everything wipes data and lands on a fresh home", async ({
    page,
  }) => {
    await completeWizardAndSave(page, "Erase me");
    await page.goto("/settings");
    await expect(
      page.getByRole("button", { name: "Erase everything" }),
    ).toBeDisabled();
    await page.getByRole("textbox").first().fill("erase");
    await page.getByRole("button", { name: "Erase everything" }).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("link", { name: "Start your fit" }),
    ).toBeVisible();
    await page.goto("/fits");
    await expect(
      page.getByRole("heading", { name: "No saved fits yet" }),
    ).toBeVisible();
  });
});
