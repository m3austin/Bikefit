import { expect, test, type Page } from "@playwright/test";

/*
 * Drives the measurement wizard end to end, exercising every branch of Flow 1
 * and Flow 2: golden path, unparseable input, challenge-confirm, skip foot,
 * refresh-resume, and back-preserves-data. Runs against the production build.
 */

function textbox(page: Page, name: string) {
  return page.getByRole("textbox", { name: new RegExp(name, "i") });
}

async function fillAndEnter(page: Page, name: string, value: string) {
  const input = textbox(page, name);
  await input.click();
  await input.fill(value);
  await input.press("Enter");
}

async function fitCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open("bikefit");
        req.onsuccess = () => {
          const db = req.result;
          try {
            const store = db
              .transaction("fits", "readonly")
              .objectStore("fits");
            const countReq = store.count();
            countReq.onsuccess = () => resolve(countReq.result);
            countReq.onerror = () => reject(countReq.error);
          } catch {
            resolve(-1);
          }
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

test.describe("measurement wizard", () => {
  test("golden path: answer every step, skip foot, calculate, route + store", async ({
    page,
  }) => {
    await page.goto("/fit/new");

    // Bike type (choice) -> Continue.
    await page.getByRole("radio", { name: /Road/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Priority defaults to Balanced -> Continue.
    await page.getByRole("button", { name: "Continue" }).click();

    // Measurements: advance with Enter.
    await fillAndEnter(page, "Height", "178");
    // Advance one step with the Continue button to prove the click path works.
    const inseam = textbox(page, "Inseam");
    await inseam.click();
    await inseam.fill("82");
    await page.getByRole("button", { name: "Continue" }).click();
    await fillAndEnter(page, "Torso", "60");
    await fillAndEnter(page, "Arm", "64");
    await fillAndEnter(page, "Shoulder", "42");

    // Flexibility (choice) -> Continue.
    await page.getByRole("radio", { name: /Fingertips reach your toes/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Foot: skip it.
    await page.getByRole("button", { name: "Skip this step" }).click();

    // Review.
    await expect(
      page.getByRole("heading", { name: "Review your answers" }),
    ).toBeVisible();
    await expect(page.getByText("Skipped")).toBeVisible();

    // Calculate -> route to /fit/<uuid> with the fit stored.
    await page.getByRole("button", { name: "Calculate my fit" }).click();
    await page.waitForURL(/\/fit\/[0-9a-f-]{36}$/);
    expect(await fitCount(page)).toBeGreaterThan(0);
  });

  test("unparseable input keeps you on the step, then a valid value advances", async ({
    page,
  }) => {
    await page.goto("/fit/new");
    await page.getByRole("radio", { name: /Road/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click(); // priority

    const height = textbox(page, "Height");
    await height.click();
    await height.fill("abc");
    await height.press("Enter");
    await expect(page.getByText(/could not read that/i)).toBeVisible();
    // Still on the height step.
    await expect(textbox(page, "Height")).toBeVisible();

    await height.fill("178");
    await height.press("Enter");
    // Advanced to inseam.
    await expect(textbox(page, "Inseam")).toBeVisible();
  });

  test("out-of-range value is challenged, never hard-blocked, then confirmed", async ({
    page,
  }) => {
    await page.goto("/fit/new");
    await page.getByRole("radio", { name: /Road/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click(); // priority
    await fillAndEnter(page, "Height", "178");

    // Inseam 120 cm is above the plausible range.
    const inseam = textbox(page, "Inseam");
    await inseam.click();
    await inseam.fill("120");
    await inseam.press("Enter");
    await expect(page.getByText(/unusually large/i)).toBeVisible();
    // Did not advance.
    await expect(textbox(page, "Inseam")).toBeVisible();

    await page.getByRole("button", { name: /yes, that's right/i }).click();
    await expect(page.getByText(/flagged as unusual/i)).toBeVisible();
    // Now continue is possible.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(textbox(page, "Torso")).toBeVisible();
  });

  test("refresh mid-wizard resumes at the same step with data intact", async ({
    page,
  }) => {
    await page.goto("/fit/new");
    await page.getByRole("radio", { name: /Gravel/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click(); // priority
    await fillAndEnter(page, "Height", "178");
    // Now on the inseam step (index 3).
    await expect(textbox(page, "Inseam")).toBeVisible();

    // Wait until the draft is actually persisted before reloading, so the
    // async IndexedDB write is not raced by the reload under parallel load.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              const req = indexedDB.open("bikefit");
              req.onsuccess = () => {
                try {
                  const store = req.result
                    .transaction("drafts", "readonly")
                    .objectStore("drafts");
                  const get = store.get("active");
                  get.onsuccess = () => resolve(get.result?.stepIndex ?? -1);
                  get.onerror = () => resolve(-1);
                } catch {
                  resolve(-1);
                }
              };
              req.onerror = () => resolve(-1);
            }),
        ),
      )
      .toBe(3);

    await page.reload();

    // Resumes on the inseam step (not back at bike type).
    await expect(textbox(page, "Inseam")).toBeVisible();
    // Going back shows the height value preserved.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(textbox(page, "Height")).toHaveValue("178.0");
  });

  test("back preserves entered data", async ({ page }) => {
    await page.goto("/fit/new");
    await page.getByRole("radio", { name: /Road/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click(); // priority
    await fillAndEnter(page, "Height", "178");
    await fillAndEnter(page, "Inseam", "82");
    // On torso now; go back twice.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(textbox(page, "Inseam")).toHaveValue("82.0");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(textbox(page, "Height")).toHaveValue("178.0");
  });
});
