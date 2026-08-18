import { expect, test } from "@playwright/test";
import { signInAndSettle } from "./helpers";

/**
 * Settle-up reads only from ledger_entries, so this covers the seam between
 * two modules: marking a bill share paid has to reach the ledger and come
 * back out as a net position. Unit tests exercise each side separately and
 * would never catch the write going missing.
 */
test("marking a share paid reaches the settle-up ledger", async ({ page }) => {
  await signInAndSettle(page, 1, "harbour candle ledger");
  const bill = `Water ${Date.now()}`;

  await page.goto("/bills");
  await page.getByRole("button", { name: "Add bill" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(bill);
  await dialog.locator("#frequency").click();
  await page.getByRole("option", { name: "Daily" }).click();
  await dialog.getByLabel("Amount ($)").fill("40.00");
  await dialog.getByRole("button", { name: "Add bill" }).click();
  await expect(dialog).toBeHidden();

  const period = page.locator(`[data-testid="bill-period"][data-bill="${bill}"]`).first();
  await period.getByRole("button", { name: "Mark paid" }).first().click();
  await expect(period.getByText("Paid", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  await page.goto("/settle");
  await expect(page.getByText("Who pays whom")).toBeVisible();
  await expect(page.getByText("Nothing recorded yet.")).toHaveCount(0);
  await expect(page.getByText("Bill payment").first()).toBeVisible();
  // Someone has now paid more than their share, so a transfer must be owed.
  await expect(page.getByText(/pays/).first()).toBeVisible();
});
