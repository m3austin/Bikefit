import { expect, test } from "@playwright/test";

/*
 * GolfFit smoke coverage: the two-tool home, the club-fit calculator's
 * deterministic math, the two-view video slots, and the drill guide. Real
 * pose detection is validated manually with a real swing clip.
 */

const FAKE = {
  name: "swing.mp4",
  mimeType: "video/mp4",
  buffer: Buffer.from([0, 0, 0, 0]),
};

test("golf home offers both tools and the drill guide", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/golf");
  await expect(
    page.getByRole("link", { name: /Swing video analysis/ }),
  ).toHaveAttribute("href", "/golf/video");
  await expect(
    page.getByRole("link", { name: /Club fitting starting points/ }),
  ).toHaveAttribute("href", "/golf/clubs");
  await expect(page.getByRole("link", { name: "drill guide" })).toHaveAttribute(
    "href",
    "/golf/drills",
  );
  expect(errors).toEqual([]);
});

test("club-fit calculator computes a starting length", async ({ page }) => {
  await page.goto("/golf/clubs");
  await expect(
    page.getByText("Enter both measurements above"),
  ).toBeVisible();

  const height = page.getByRole("textbox", { name: /Height/i });
  await height.click();
  await height.fill("178");
  await height.press("Enter");

  const wtf = page.getByRole("textbox", { name: /Wrist to floor/i });
  await wtf.click();
  await wtf.fill("84");
  await wtf.press("Enter");

  await expect(page.getByText("Standard length")).toBeVisible();

  // A long wrist-to-floor moves the suggestion up the chart.
  await wtf.click();
  await wtf.fill("92");
  await wtf.press("Enter");
  await expect(page.getByText("+1/2 inch from standard")).toBeVisible();
});

test("swing video flow: intro, then two labeled view slots", async ({
  page,
}) => {
  await page.goto("/golf/video");
  await expect(
    page.getByRole("heading", { name: /Film one swing/ }),
  ).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(FAKE);
  await expect(page.getByRole("heading", { name: "swing.mp4" })).toBeVisible();
  await expect(page.getByText("Down the line", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Face on/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Analyze this swing/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Choose face-on video" }),
  ).toBeVisible();
});

test("drill guide renders every drill with badges before steps", async ({
  page,
}) => {
  await page.goto("/golf/drills");
  for (const title of [
    "Hold your posture (chair drill)",
    "Quiet head",
    "Count your tempo",
    "Fill the turn",
    "Turn, not sway (bump drill)",
    "Wide and calm (structure drill)",
  ]) {
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  // Deep-link anchor from the analysis lands on a section.
  await page.goto("/golf/drills#tempo");
  await expect(
    page.getByRole("heading", { name: "Count your tempo", exact: true }),
  ).toBeInViewport();
});
