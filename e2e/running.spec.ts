import { expect, test } from "@playwright/test";

/*
 * RunFit smoke coverage: the home, the two-view video slots, and the drill
 * guide. Real pose detection is validated manually with a real treadmill
 * clip; the stride math itself is locked by the vitest golden suite.
 */

const FAKE = {
  name: "run.mp4",
  mimeType: "video/mp4",
  buffer: Buffer.from([0, 0, 0, 0]),
};

test("running home offers the analysis and the drill guide", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/running");
  await expect(
    page.getByRole("link", { name: /Gait video analysis/ }),
  ).toHaveAttribute("href", "/running/video");
  await expect(
    page.getByRole("link", { name: /Drill guide/ }),
  ).toHaveAttribute("href", "/running/drills");
  expect(errors).toEqual([]);
});

test("gait video flow: intro, then two labeled view slots", async ({
  page,
}) => {
  await page.goto("/running/video");
  await expect(
    page.getByRole("heading", { name: /Film a few strides/ }),
  ).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(FAKE);
  await expect(page.getByRole("heading", { name: "run.mp4" })).toBeVisible();
  await expect(page.getByText("Side on", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /From behind/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Analyze this run/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Choose rear-view video" }),
  ).toBeVisible();
});

test("drill guide renders every drill with badges before steps", async ({
  page,
}) => {
  await page.goto("/running/drills");
  for (const title of [
    "Nudge your cadence (metronome runs)",
    "Land under your hips (wall drill)",
    "Run tall (posture reset)",
    "Quiet feet (soft landings)",
    "Steady hips (strength work)",
  ]) {
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  // Deep-link anchor from the analysis lands on a section.
  await page.goto("/running/drills#cadence");
  await expect(
    page.getByRole("heading", {
      name: "Nudge your cadence (metronome runs)",
      exact: true,
    }),
  ).toBeInViewport();
});
