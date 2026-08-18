import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // The suite shares one database and creates household-wide rows, so
  // running specs in parallel would have them reading each other's chores
  // and bills. It's a small suite; serial is the honest trade.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Unset by default — Playwright resolves its normal installed
        // browser. Set PLAYWRIGHT_CHROMIUM_PATH locally only if your
        // installed browser binary doesn't match what @playwright/test
        // expects (e.g. a sandboxed environment with a pre-baked browser
        // from a different version); never commit a real path here.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
