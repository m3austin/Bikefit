import { expect, test } from "@playwright/test";

/*
 * LiftFit smoke coverage: the lift picker with its safety note, each lift's
 * analysis page (upload slot + cues), and the cues guide. Real pose
 * detection is validated manually; the per-lift math is locked by the
 * vitest golden suite, including the fourth-lift config-only proof.
 */

const FAKE = {
  name: "lift.mp4",
  mimeType: "video/mp4",
  buffer: Buffer.from([0, 0, 0, 0]),
};

test("lifting home lists the three lifts and leads with safety", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/lifting");
  // Scope to main: the header sub-bar also carries per-lift links.
  const main = page.getByRole("main");
  await expect(
    main.getByRole("link", { name: /Back squat/ }),
  ).toHaveAttribute("href", "/lifting/squat");
  await expect(
    main.getByRole("link", { name: /Bench press/ }),
  ).toHaveAttribute("href", "/lifting/bench");
  await expect(
    main.getByRole("link", { name: /Deadlift/ }),
  ).toHaveAttribute("href", "/lifting/deadlift");
  // The safety note is present, not buried.
  await expect(page.getByText(/not a spotter and not a coach/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("a lift page shows the upload slot and its cues", async ({ page }) => {
  await page.goto("/lifting/deadlift");
  await expect(
    page.getByRole("heading", { name: "Deadlift", exact: true }),
  ).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(FAKE);
  await expect(page.getByRole("heading", { name: "lift.mp4" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Analyze this set/ }),
  ).toBeVisible();
});

test("an unknown lift 404s", async ({ page }) => {
  const res = await page.goto("/lifting/curl");
  expect(res?.status()).toBe(404);
});

test("cues guide renders every drill with badges before steps", async ({
  page,
}) => {
  await page.goto("/lifting/drills");
  for (const title of [
    "Brace first, hinge second (deadlift back)",
    "Find your setup height (deadlift start)",
    "Own your depth (box squat)",
    "Heels stay down (squat stance)",
    "Find your groove (bench path)",
    "Finish the rep (lockout)",
  ]) {
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  // Deep-link anchor from the analysis lands on a section.
  await page.goto("/lifting/drills#brace-and-hinge");
  await expect(
    page.getByRole("heading", {
      name: "Brace first, hinge second (deadlift back)",
      exact: true,
    }),
  ).toBeInViewport();
});
