import { expect, test, type Page } from "@playwright/test";

/*
 * Smoke coverage for Video Fit Analysis. Deliberately does not exercise real
 * pose detection: that needs a genuine trainer video and a first-time fetch
 * of the MediaPipe model from Google's CDN, which is best verified manually.
 * This checks the parts that are deterministic in CI: the mode choice,
 * client-side file validation, the two-slot (side + optional front) layout,
 * and the discomfort question.
 */

const SIDE_FILE = {
  name: "trainer-ride.mp4",
  mimeType: "video/mp4",
  buffer: Buffer.from([0, 0, 0, 0]),
};

const FRONT_FILE = {
  name: "front-ride.mp4",
  mimeType: "video/mp4",
  buffer: Buffer.from([0, 0, 0, 0]),
};

async function uploadSide(page: Page) {
  await page.goto("/fit/video");
  await page.locator('input[type="file"]').setInputFiles(SIDE_FILE);
  await expect(
    page.getByRole("heading", { name: "trainer-ride.mp4" }),
  ).toBeVisible();
}

test("mode choice links to Quick Fit and Video Fit Analysis", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/fit");
  // Scope to main: the header sub-bar also carries a Quick Fit / Video link.
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /Quick Fit/ })).toHaveAttribute(
    "href",
    "/cycling/fit/new",
  );
  await expect(
    main.getByRole("link", { name: /Video Fit Analysis/ }),
  ).toHaveAttribute("href", "/cycling/video");

  expect(errors).toEqual([]);
});

test("video upload rejects an unsupported file type", async ({ page }) => {
  await page.goto("/fit/video");
  await expect(
    page.getByRole("heading", { name: /Record yourself pedaling/ }),
  ).toBeVisible();

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a video"),
  });

  // Next's own route announcer also carries role="alert", so match by text.
  await expect(page.getByText(/isn.t supported/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Record yourself pedaling/ }),
  ).toBeVisible();
});

test("side upload opens the workspace with the optional front slot and discomfort question", async ({
  page,
}) => {
  await uploadSide(page);

  // Side workspace with its analysis affordance (disabled until the pose
  // tracker and video are ready, but always present for the side view).
  await expect(
    page.getByRole("button", { name: /Analyze pedal strokes/ }),
  ).toBeVisible();

  // The optional front slot and the discomfort question are part of the flow.
  await expect(
    page.getByRole("heading", { name: /Front or rear view/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Any discomfort when you ride/ }),
  ).toBeVisible();

  // Multi-select with None exclusivity, both directions.
  const knee = page.getByRole("button", { name: "Knee", exact: true });
  const none = page.getByRole("button", { name: "None", exact: true });
  await knee.click();
  await expect(knee).toHaveAttribute("aria-pressed", "true");
  await none.click();
  await expect(none).toHaveAttribute("aria-pressed", "true");
  await expect(knee).toHaveAttribute("aria-pressed", "false");
  await knee.click();
  await expect(knee).toHaveAttribute("aria-pressed", "true");
  await expect(none).toHaveAttribute("aria-pressed", "false");

  // Clearing the side video with nothing else selected returns to the intro.
  await page.getByRole("button", { name: "Choose a different video" }).click();
  await expect(
    page.getByRole("heading", { name: /Record yourself pedaling/ }),
  ).toBeVisible();
});

test("adding a front video opens a second workspace without side analysis", async ({
  page,
}) => {
  await uploadSide(page);

  // With the side slot occupied, the only file input left is the front slot.
  await page.locator('input[type="file"]').setInputFiles(FRONT_FILE);
  await expect(
    page.getByRole("heading", { name: "front-ride.mp4" }),
  ).toBeVisible();

  // Each view gets its own analysis: sagittal on the side video, frontal
  // (knee tracking) on the straight-on video.
  await expect(
    page.getByRole("button", { name: /Analyze pedal strokes/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /Analyze knee tracking/ }),
  ).toHaveCount(1);

  // Removing the front video restores its dropzone; the side stays put.
  await page.getByRole("button", { name: "Remove front video" }).click();
  await expect(
    page.getByRole("button", { name: "Choose front video" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "trainer-ride.mp4" }),
  ).toBeVisible();
});
