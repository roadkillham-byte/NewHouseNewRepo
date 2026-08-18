import { expect, type Page } from "@playwright/test";

/**
 * Shared steps for the DB-backed E2E specs.
 *
 * These run against one real Postgres shared by the whole suite, seeded by
 * `npm run db:seed`. Two consequences shape everything here:
 *
 * - The suite runs serially (see playwright.config.ts). The specs create
 *   household-wide chores and bills, so running them in parallel would have
 *   them reading each other's rows.
 * - Sign-in has to be idempotent. A seeded member starts flagged
 *   `mustChangePassword`, and the first spec to use them clears it — so a
 *   later spec, or a re-run against a database that wasn't re-seeded, must
 *   cope with the password already being the new one.
 */

export const SEED_PASSWORD_PREFIX = "change-me-";

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
}

function isSignedOut(page: Page): boolean {
  return new URL(page.url()).pathname.startsWith("/login");
}

/**
 * Signs in a seeded member and leaves them on the dashboard with
 * `mustChangePassword` cleared, whether or not a previous spec already did
 * that. Returns their email.
 */
export async function signInAndSettle(page: Page, index: number, newPassword: string) {
  const email = `housemate${index}@example.com`;

  // Try the settled password first. After the first spec touches a member
  // that's the common case, and every wrong guess burns one of their five
  // rate-limit attempts — so guessing in the likelier order keeps the suite
  // clear of its own lockout.
  await signIn(page, email, newPassword);
  if (isSignedOut(page)) {
    await signIn(page, email, `${SEED_PASSWORD_PREFIX}${index}`);
  }
  expect(isSignedOut(page), `could not sign in as ${email}`).toBe(false);

  if (new URL(page.url()).pathname === "/change-password") {
    await page.getByLabel("Current password").fill(`${SEED_PASSWORD_PREFIX}${index}`);
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Set my password" }).click();
    await page.waitForURL((u) => new URL(u).pathname !== "/change-password", { timeout: 15_000 });
  }

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return email;
}
