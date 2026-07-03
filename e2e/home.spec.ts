import { expect, test } from "@playwright/test";

test("home renders with wordmark, heading, and primary CTA", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start your fit" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Theme" })).toBeVisible();

  expect(errors).toEqual([]);
});
