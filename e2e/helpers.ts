import { expect, type Page } from "@playwright/test";

export async function fillEnter(page: Page, name: string, value: string) {
  const input = page.getByRole("textbox", { name: new RegExp(name, "i") });
  await input.click();
  await input.fill(value);
  await input.press("Enter");
}

/** Drive the wizard to the results page (road bike, foot skipped). */
export async function completeWizard(page: Page) {
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

/** Complete the wizard and save the resulting fit under `name`. */
export async function completeWizardAndSave(page: Page, name: string) {
  await completeWizard(page);
  await page.getByRole("button", { name: "Save fit" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Fit name" }).fill(name);
  await dialog.getByRole("button", { name: "Save fit" }).click();
  await expect(page.getByRole("button", { name: "Rename fit" })).toBeVisible();
}
