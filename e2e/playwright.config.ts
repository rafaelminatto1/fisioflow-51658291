import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for FisioFlow E2E Tests
 */
export default defineConfig({
  testDir: "./flows",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://app.moocafisio.com.br",
    storageState: "e2e/state.json",
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
