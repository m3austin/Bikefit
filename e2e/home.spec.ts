import { expect, test } from "@playwright/test";

test("hub renders with wordmark, heading, and primary CTA", async ({ page }) => {
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

test("hub lists every sport as a live link, swimming as beta", async ({
  page,
}) => {
  await page.goto("/");

  // Every sport routes to its module (scoped to main: the header nav also
  // carries a BikeFit link).
  const links: Array<[RegExp, string]> = [
    [/BikeFit/, "/cycling"],
    [/GolfFit/, "/golf"],
    [/RunFit/, "/running"],
    [/LiftFit/, "/lifting"],
    [/SwimFit/, "/swimming"],
  ];
  for (const [name, href] of links) {
    await expect(
      page.getByRole("main").getByRole("link", { name }),
    ).toHaveAttribute("href", href);
  }

  // Nothing is coming soon anymore; swimming carries a Beta chip.
  await expect(page.getByText("Coming soon")).toHaveCount(0);
  await expect(page.getByText("Beta", { exact: true })).toHaveCount(1);

  // The maker's signature is present.
  await expect(page.getByText(/A Marshmallow Labs experiment/)).toBeVisible();
});
