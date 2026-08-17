import { expect, test } from "@playwright/test";

// Phase 0 smoke test: the auth *gate*, which needs no database — proxy.ts
// only decodes the session cookie. A credentials round-trip (wrong
// password -> error message, right password -> dashboard) needs a real,
// seeded database and belongs in its own spec once Supabase is wired up in
// CI; see the verification section of the project plan.

test("unauthenticated visitors are redirected to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "House OS" })).toBeVisible();
});

test("the login form is fully present", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
