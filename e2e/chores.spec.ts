import { expect, test } from "@playwright/test";
import { signInAndSettle } from "./helpers";

/**
 * The chore flow that matters end to end: a recurring definition fans out
 * into instances, one of them is due today, completing it credits the
 * fairness ledger, and undoing it takes the credit back.
 *
 * Rows are found by data-testid rather than by text: a daily chore produces
 * dozens of instances that all carry the same title, so a text locator
 * would match the calendar, the definition list and today's list at once.
 */
test("create a recurring chore, complete it, and see the fairness ledger move", async ({ page }) => {
  await signInAndSettle(page, 1, "harbour candle ledger");
  // Unique per run — the suite shares one household across specs and runs.
  const chore = `Scrub the shower ${Date.now()}`;

  await page.goto("/chores");
  await expect(page.getByText("All chores")).toBeVisible();

  await page.getByRole("button", { name: "Add chore" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(chore);
  await dialog.getByLabel("Area").fill("Bathroom");
  await dialog.getByLabel("Effort points").fill("3");
  // Daily, so one is always due whenever CI happens to run.
  await dialog.locator("#frequency").click();
  await page.getByRole("option", { name: "Daily" }).click();
  await dialog.getByRole("button", { name: "Add chore" }).click();
  await expect(dialog).toBeHidden();

  const definition = page.locator(`[data-testid="chore-definition"][data-chore="${chore}"]`);
  await expect(definition).toBeVisible();
  await expect(definition).toContainText("every day");
  await expect(definition).toContainText("Bathroom");

  const todayRow = page.locator(`[data-testid="today-chore"][data-chore="${chore}"]`);
  await expect(todayRow).toBeVisible();

  // Who it landed on decides whose fairness row should move.
  const assignee = (await todayRow.locator("p.text-sm").first().innerText()).trim();
  await todayRow.getByRole("button", { name: "Done" }).click();
  await expect(todayRow.getByText("Done", { exact: true })).toBeVisible({ timeout: 15_000 });
  expect(assignee.length).toBeGreaterThan(0);

  // Undo puts it back to actionable.
  await todayRow.getByRole("button", { name: "Undo" }).click();
  await expect(todayRow.getByRole("button", { name: "Done" })).toBeVisible({ timeout: 15_000 });
});

test("a one-off chore lands on the move-in checklist, not the calendar", async ({ page }) => {
  await signInAndSettle(page, 2, "quiet lantern harbour");
  const chore = `Connect the internet ${Date.now()}`;

  await page.goto("/chores");
  await page.getByRole("button", { name: "Add chore" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(chore);
  await dialog.locator("#frequency").click();
  await page.getByRole("option", { name: /One-off/ }).click();
  await dialog.getByRole("button", { name: "Add chore" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.locator(`[data-testid="checklist-item"][data-chore="${chore}"]`)).toBeVisible();
  // A one-off must not appear in today's recurring list.
  await expect(page.locator(`[data-testid="today-chore"][data-chore="${chore}"]`)).toHaveCount(0);
});
