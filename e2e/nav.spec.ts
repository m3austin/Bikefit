import { expect, test } from "@playwright/test";

/*
 * Header IA: the global bar stays sport-agnostic, and each sport's own tools
 * appear in a contextual sub-bar only while you are inside that sport.
 */

test("the global bar carries no per-sport links on the hub", async ({
  page,
}) => {
  await page.goto("/");
  const primary = page.getByRole("navigation", { name: "Primary" });
  for (const label of ["Home", "Saved fits", "Rabbit hole", "Settings"]) {
    await expect(primary.getByRole("link", { name: label })).toBeVisible();
  }
  // The old cycling-specific items are gone from the global bar.
  await expect(primary.getByRole("link", { name: "BikeFit" })).toHaveCount(0);
  await expect(primary.getByRole("link", { name: "Drills" })).toHaveCount(0);
  // No sport sub-bar outside a sport.
  await expect(page.getByRole("navigation", { name: /tools$/ })).toHaveCount(0);
});

test("a sport shows its own tools in a contextual sub-bar", async ({
  page,
}) => {
  await page.goto("/golf");
  const sub = page.getByRole("navigation", { name: "GolfFit tools" });
  await expect(sub).toBeVisible();
  await expect(sub.getByRole("link", { name: "GolfFit" })).toHaveAttribute(
    "href",
    "/golf",
  );
  await expect(sub.getByRole("link", { name: "Swing video" })).toHaveAttribute(
    "href",
    "/golf/video",
  );
  await expect(sub.getByRole("link", { name: "Club fitting" })).toHaveAttribute(
    "href",
    "/golf/clubs",
  );
  await expect(sub.getByRole("link", { name: "Drills" })).toHaveAttribute(
    "href",
    "/golf/drills",
  );

  // Switching sports swaps the sub-bar; it never bleeds cycling into golf.
  await page.goto("/running");
  await expect(
    page.getByRole("navigation", { name: "RunFit tools" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "GolfFit tools" }),
  ).toHaveCount(0);
});
