import { expect, test } from "@playwright/test";

/*
 * SwimFit smoke coverage: the beta-led home, the single-view video slot, and
 * the drill guide. Real pose detection is validated manually with a real
 * pool clip (the whole module is beta until then); the stroke math is locked
 * by the vitest golden suite.
 */

const FAKE = {
  name: "swim.mp4",
  mimeType: "video/mp4",
  buffer: Buffer.from([0, 0, 0, 0]),
};

test("swimming home leads with the beta note and offers both tools", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/swimming");
  await expect(page.getByText("SwimFit is in beta")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Stroke video analysis/ }),
  ).toHaveAttribute("href", "/swimming/video");
  await expect(
    page.getByRole("link", { name: /Drill guide/ }),
  ).toHaveAttribute("href", "/swimming/drills");
  expect(errors).toEqual([]);
});

test("stroke video flow: intro with beta note, then the workspace", async ({
  page,
}) => {
  await page.goto("/swimming/video");
  await expect(
    page.getByRole("heading", { name: /Film a few strokes/ }),
  ).toBeVisible();
  await expect(page.getByText("SwimFit is in beta")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(FAKE);
  await expect(page.getByRole("heading", { name: "swim.mp4" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Analyze this swim/ }),
  ).toBeVisible();
});

test("drill guide renders every drill with badges before steps", async ({
  page,
}) => {
  await page.goto("/swimming/drills");
  for (const title of [
    "Look down (head position)",
    "High elbow (recovery and catch)",
    "Roll hip to hip",
    "Lengthen the stroke (catch-up)",
  ]) {
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  // Deep-link anchor from the analysis lands on a section.
  await page.goto("/swimming/drills#head-position");
  await expect(
    page.getByRole("heading", { name: "Look down (head position)", exact: true }),
  ).toBeInViewport();
});
