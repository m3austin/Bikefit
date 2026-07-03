import { expect, test } from "@playwright/test";

import { completeWizardAndSave } from "./helpers";

/*
 * Flow 4 (saved fits) and the landing welcome-back variant (§4.1). Each test
 * gets a fresh browser context, so IndexedDB starts empty.
 */

test.describe("garage", () => {
  test("empty garage shows the empty state", async ({ page }) => {
    await page.goto("/fits");
    await expect(
      page.getByRole("heading", { name: "No saved fits yet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start your first fit" }),
    ).toBeVisible();
  });

  test("rename, duplicate, and delete + undo", async ({ page }) => {
    await completeWizardAndSave(page, "My road bike");
    await page.goto("/fits");
    await expect(page.getByText("My road bike")).toBeVisible();

    // Rename inline.
    await page.getByRole("button", { name: "Actions for My road bike" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const nameInput = page.getByRole("textbox", { name: "Fit name" });
    await nameInput.fill("Sunday racer");
    await nameInput.press("Enter");
    await expect(page.getByText("Sunday racer", { exact: true })).toBeVisible();

    // Delete, then undo restores it.
    await page.getByRole("button", { name: "Actions for Sunday racer" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete fit" }).click();
    await expect(page.getByText("Sunday racer", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Sunday racer", { exact: true })).toBeVisible();

    // Duplicate and edit opens the wizard at the review step.
    await page.getByRole("button", { name: "Actions for Sunday racer" }).click();
    await page.getByRole("menuitem", { name: "Duplicate and edit" }).click();
    await page.waitForURL(/\/fit\/new$/);
    await expect(
      page.getByRole("heading", { name: "Review your answers" }),
    ).toBeVisible();
  });

  test("landing shows welcome-back when a fit exists", async ({ page }) => {
    await completeWizardAndSave(page, "My road bike");
    await page.goto("/");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pick up where you left off" }),
    ).toBeVisible();
    await expect(page.getByText("My road bike")).toBeVisible();
  });
});
