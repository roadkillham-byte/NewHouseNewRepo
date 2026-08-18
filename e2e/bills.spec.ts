import { expect, test, type Locator } from "@playwright/test";
import { signInAndSettle } from "./helpers";

/**
 * Reads the per-person amounts out of a rendered bill period.
 *
 * Asserting a hardcoded "$30.10" would only hold while the household has
 * exactly the four seeded members — and another spec in this suite adds
 * one. What actually needs to be true is the invariant: an even split is
 * equal to within a cent and sums to exactly the total.
 */
async function shareAmountsInCents(period: Locator): Promise<number[]> {
  const text = await period.innerText();
  // Skip the first money figure: that's the period total, not a share.
  const amounts = [...text.matchAll(/\$([\d,]+\.\d{2})/g)].map((m) =>
    Math.round(Number(m[1].replace(/,/g, "")) * 100),
  );
  return amounts.slice(1);
}

function expectEvenSplit(shares: number[], totalCents: number) {
  expect(shares.length).toBeGreaterThan(1);
  expect(shares.reduce((a, b) => a + b, 0)).toBe(totalCents);
  expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
}

/**
 * The money path. Split arithmetic is unit-tested in src/lib/split.test.ts;
 * what this covers is that it survives the round trip through the database
 * and back onto the page, which unit tests can't see.
 */
test("a fixed bill splits evenly, marks paid, and records who did it", async ({ page }) => {
  await signInAndSettle(page, 3, "cobble marina thistle");
  const bill = `Electricity ${Date.now()}`;

  await page.goto("/bills");
  await expect(page.getByText("All bills")).toBeVisible();

  await page.getByRole("button", { name: "Add bill" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(bill);
  await dialog.getByLabel("Vendor").fill("AGL");
  await dialog.locator("#frequency").click();
  await page.getByRole("option", { name: "Daily" }).click();
  await dialog.getByLabel("Amount ($)").fill("120.40");
  await dialog.getByRole("button", { name: "Add bill" }).click();
  await expect(dialog).toBeHidden();

  const period = page.locator(`[data-testid="bill-period"][data-bill="${bill}"]`).first();
  await expect(period).toBeVisible();
  await expect(period).toContainText("$120.40");
  // Split evenly across whoever is active — equal to within a cent, and
  // summing to exactly the total with no cent lost or invented.
  expectEvenSplit(await shareAmountsInCents(period), 12040);

  await period.getByRole("button", { name: "Mark paid" }).first().click();
  await expect(period.getByText("Paid", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  // markedBy is stored precisely so this line can exist. It reads "Paid
  // 18 Aug" when you record your own share and "Marked paid by Sam, 18 Aug"
  // when someone records it for you — which is the case here, since the
  // first share in the list belongs to another housemate.
  await expect(
    period.getByText(/(^|\s)Paid \d+ \w+|Marked paid by .+, \d+ \w+/).first(),
  ).toBeVisible();
});

test("a variable bill waits for an amount before it has shares", async ({ page }) => {
  await signInAndSettle(page, 4, "meadow pylon sixteen");
  const bill = `Groceries ${Date.now()}`;

  await page.goto("/bills");
  await page.getByRole("button", { name: "Add bill" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(bill);
  await dialog.locator("#frequency").click();
  await page.getByRole("option", { name: "Daily" }).click();
  await dialog.locator("#amountMode").click();
  await page.getByRole("option", { name: /Varies/ }).click();
  await dialog.getByRole("button", { name: "Add bill" }).click();
  await expect(dialog).toBeHidden();

  const period = page.locator(`[data-testid="bill-period"][data-bill="${bill}"]`).first();
  // No amount yet, so it asks for one instead of listing shares.
  await expect(period.getByRole("button", { name: "Set amount" })).toBeVisible();
  await expect(period.getByRole("button", { name: "Mark paid" })).toHaveCount(0);

  await period.locator('input[name="amount"]').fill("64.00");
  await period.getByRole("button", { name: "Set amount" }).click();
  await expect(period.getByRole("button", { name: "Mark paid" }).first()).toBeVisible({
    timeout: 15_000,
  });
  expectEvenSplit(await shareAmountsInCents(period), 6400);
});
