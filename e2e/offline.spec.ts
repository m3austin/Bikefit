import { expect, test } from "@playwright/test";

import { completeWizard, fillEnter } from "./helpers";

/*
 * Flow 8: after the app has loaded once (service worker warm), an airplane-mode
 * walkthrough of wizard-to-results still works, and the offline chip shows.
 */
test("airplane-mode wizard to results works after first load", async ({
  page,
  context,
}) => {
  // Warm the cache online: visit the main routes and view one result, so the
  // service worker caches the shells, chunks, and a /fit/* shell.
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.goto("/method");
  await page.goto("/fits");
  await completeWizard(page); // caches the results route + a /fit/* shell
  await page.getByRole("heading", { name: "Saddle height" }).waitFor();

  // Ensure the service worker controls the page before going offline.
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);

  await context.setOffline(true);

  // Do a full wizard to results while offline (canonical route; the old
  // /fit/new also works via the service worker's offline mapping).
  await page.goto("/cycling/fit/new");
  await page.getByRole("radio", { name: /Gravel/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await fillEnter(page, "Height", "175");
  await fillEnter(page, "Inseam", "80");
  await fillEnter(page, "Torso", "58");
  await fillEnter(page, "Arm", "62");
  await fillEnter(page, "Shoulder", "40");
  await page.getByRole("radio", { name: /cannot reach/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip this step" }).click();

  // The offline chip is visible.
  await expect(
    page.getByText("Offline, everything still works"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Calculate my fit" }).click();
  await page.waitForURL(/\/fit\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { name: "Saddle height" })).toBeVisible();
});

test("IndexedDB unavailable: banner shows and the fit still works in-memory", async ({
  page,
}) => {
  // Simulate a private-mode edge case where IndexedDB is absent (Flow 8).
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { get: () => undefined });
  });

  await page.goto("/fit/new");
  await expect(page.getByText(/will not be saved on this device/i)).toBeVisible();

  await page.getByRole("radio", { name: /Road/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await fillEnter(page, "Height", "178");
  await fillEnter(page, "Inseam", "82");
  await fillEnter(page, "Torso", "60");
  await fillEnter(page, "Arm", "64");
  await fillEnter(page, "Shoulder", "42");
  await page.getByRole("radio", { name: /Fingertips/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip this step" }).click();
  await page.getByRole("button", { name: "Calculate my fit" }).click();

  // Results render from the in-memory store within the session.
  await page.waitForURL(/\/fit\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { name: "Saddle height" })).toBeVisible();
});
