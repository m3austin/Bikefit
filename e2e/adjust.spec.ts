import { expect, test } from "@playwright/test";

/*
 * The adjustment guide (/adjust): structure, the glossary popover's full
 * interaction contract (tap to open, Escape to dismiss), and the
 * proof-of-reuse wiring in the Quick Fit results.
 */

test("guide renders every adjustment with badges before steps", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/adjust");
  await expect(
    page.getByRole("heading", { name: "You can do this" }),
  ).toBeVisible();

  for (const title of [
    "Saddle height",
    "Saddle setback (fore-aft)",
    "Saddle tilt",
    "Reach (stem and bar position)",
    "Handlebar height",
    "Cleat position",
  ]) {
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }

  // Shop-job boundary and the disclaimer are page-level requirements.
  await expect(
    page.getByRole("heading", { name: /shop job, not a driveway job/ }),
  ).toBeVisible();
  await expect(page.getByText(/not medical advice/)).toBeVisible();

  expect(errors).toEqual([]);
});

test("table of contents anchors jump to sections", async ({ page }) => {
  await page.goto("/adjust");
  await page
    .getByRole("navigation", { name: "Adjustments" })
    .getByRole("link", { name: "Cleat position" })
    .click();
  await expect(page).toHaveURL(/#cleats$/);
  await expect(
    page.getByRole("heading", { name: "Cleat position", exact: true }),
  ).toBeInViewport();
});

test("glossary term opens on tap and dismisses with Escape", async ({
  page,
}) => {
  await page.goto("/adjust");
  // "seatpost" also appears in the jargon chips, so scope to the intro.
  await page
    .locator("header")
    .getByRole("button", { name: "seatpost", exact: true })
    .click();
  const definition = page.getByText(/tube your saddle sits on/i);
  await expect(definition).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(definition).not.toBeVisible();
});

test("variants render conditionally by bike type, others stay reachable", async ({
  page,
}) => {
  await page.goto("/adjust");
  const saddle = page.locator("section#saddle-height");

  // Variant card titles, matched exactly so step prose ("...a small bolt or
  // a quick-release lever") can't collide. (.first() because a hidden
  // print-only copy of collapsed variants exists in the DOM.)
  const variant = (title: string) =>
    saddle.getByText(title, { exact: true }).first();

  // Road is the default without a saved fit: bolt clamp up front, the
  // quick-release lever tucked behind the collapsible.
  await expect(variant("Bolt clamp")).toBeVisible();
  await expect(variant("Quick-release lever")).not.toBeVisible();

  // Mountain flips the defaults and flags the likely setup.
  await page.getByRole("radio", { name: "Mountain" }).click();
  await expect(variant("Quick-release lever")).toBeVisible();
  await expect(variant("Dropper post")).toBeVisible();
  await expect(saddle.getByText("Likely your setup").first()).toBeVisible();
  await expect(variant("Bolt clamp")).not.toBeVisible();

  // Nothing is hidden for good: the collapsible reveals the rest.
  await saddle.getByRole("button", { name: /Show other setups/ }).click();
  await expect(variant("Bolt clamp")).toBeVisible();
});

test("fit results deep-link into the matching procedure", async ({ page }) => {
  const { completeWizard } = await import("./helpers");
  await completeWizard(page);
  await page.getByRole("heading", { name: "Saddle height" }).waitFor();

  const link = page.getByRole("link", { name: /How do I do this/ }).first();
  await expect(link).toHaveAttribute("href", "/cycling/drills#saddle-height");
  await link.click();
  await expect(page).toHaveURL(/\/cycling\/drills#saddle-height$/);
  await expect(
    page.getByRole("heading", { name: "Saddle height", exact: true }),
  ).toBeInViewport();
});

test("Quick Fit results reuse the glossary (setback card)", async ({ page }) => {
  // Drive the wizard quickly via the shared helper's route.
  const { completeWizard } = await import("./helpers");
  await completeWizard(page);
  await page.getByRole("heading", { name: "Saddle height" }).waitFor();
  await page.getByRole("button", { name: "setback", exact: true }).click();
  await expect(page.getByText(/behind the pedals/i).first()).toBeVisible();
});
