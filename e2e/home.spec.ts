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

test("hub lists the live sport and marks the rest coming soon", async ({
  page,
}) => {
  await page.goto("/");

  // BikeFit is live and routes to its module (scoped to main: the header
  // nav also carries a BikeFit link).
  await expect(
    page.getByRole("main").getByRole("link", { name: /BikeFit/ }),
  ).toHaveAttribute("href", "/cycling");

  // GolfFit and RunFit are live too.
  await expect(
    page.getByRole("main").getByRole("link", { name: /GolfFit/ }),
  ).toHaveAttribute("href", "/golf");
  await expect(
    page.getByRole("main").getByRole("link", { name: /RunFit/ }),
  ).toHaveAttribute("href", "/running");

  // Coming-soon sports are visible but deliberately not links.
  for (const brand of ["LiftFit", "SwimFit"]) {
    await expect(page.getByText(brand, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(brand) })).toHaveCount(0);
  }
  await expect(page.getByText("Coming soon")).toHaveCount(2);

  // The maker's signature is present.
  await expect(page.getByText(/A Marshmallow Labs experiment/)).toBeVisible();
});
