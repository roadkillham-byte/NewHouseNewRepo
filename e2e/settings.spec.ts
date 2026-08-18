import { expect, test } from "@playwright/test";
import { signIn, signInAndSettle } from "./helpers";

/**
 * These specs share one seeded household, so anything that depends on a
 * member's *initial* state creates its own member rather than borrowing a
 * seeded one another spec may already have settled.
 */
test("a newly added housemate is forced to choose their own password", async ({ page }) => {
  await signInAndSettle(page, 1, "harbour candle ledger");

  const email = `recruit-${Date.now()}@example.com`;
  await page.goto("/settings");
  await page.getByRole("button", { name: "Add a housemate" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Recruit");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByRole("button", { name: "Add housemate" }).click();

  // The generated password is shown once, in the dialog, and has to be read
  // from there — nothing else ever has a copy of it.
  await expect(dialog.getByText("Recruit is in")).toBeVisible();
  const tempPassword = (await dialog.locator("p.font-mono").innerText()).trim();
  expect(tempPassword).toMatch(/^[A-Za-z0-9]{14}$/);
  await dialog.getByRole("button", { name: "Done" }).click();

  // Their first sign-in must land on the forced change and refuse to move on.
  const context = await page.context().browser()!.newContext();
  const fresh = await context.newPage();
  await signIn(fresh, email, tempPassword);
  await expect(fresh).toHaveURL(/\/change-password/);
  await fresh.goto("/chores");
  await expect(fresh).toHaveURL(/\/change-password/);

  await fresh.getByLabel("Current password").fill(tempPassword);
  await fresh.getByLabel("New password", { exact: true }).fill("thicket compass olive");
  await fresh.getByLabel("Confirm new password").fill("thicket compass olive");
  await fresh.getByRole("button", { name: "Set my password" }).click();
  await fresh.waitForURL((u) => !new URL(u).pathname.startsWith("/change-password"));

  await fresh.goto("/");
  await expect(fresh.getByRole("heading", { level: 1 })).toBeVisible();
  await context.close();

  // Put the household back to its seeded size. Bill splits divide across
  // active members, so leaving this recruit behind would quietly change
  // the arithmetic every other spec sees.
  await page.goto("/settings");
  const recruitRow = page.locator("li").filter({ hasText: email });
  await recruitRow.getByRole("button", { name: "Mark moved out" }).click();
  await expect(recruitRow.getByText("Moved out")).toBeVisible({ timeout: 15_000 });
});

test("renaming yourself shows up straight away, without signing out", async ({ page }) => {
  await signInAndSettle(page, 3, "cobble marina thistle");

  await page.goto("/settings");
  await page.getByLabel("Your name").fill("Renamed Person");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Renamed");
});

test("a weak password is refused", async ({ page }) => {
  await signInAndSettle(page, 4, "meadow pylon sixteen");

  await page.goto("/settings");
  await page.getByLabel("Current password").fill("meadow pylon sixteen");
  await page.getByLabel("New password", { exact: true }).fill("short");
  await page.getByLabel("Confirm new password").fill("short");
  await page.getByRole("button", { name: "Change password" }).click();

  await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
});
