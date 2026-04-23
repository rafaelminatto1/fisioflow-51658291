import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: ["prod-audit.spec.ts"],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "scripts/audit-html-report", open: "never" }]],
  timeout: 90000,
  use: {
    baseURL: "https://moocafisio.com.br",
    ignoreHTTPSErrors: true,
    trace: "off",
    screenshot: "only-on-failure",
    actionTimeout: 20000,
    navigationTimeout: 45000,
    video: "off",
  },
  projects: [
    {
      name: "chromium-audit",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
