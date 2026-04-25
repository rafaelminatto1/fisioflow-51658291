import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  testDir: path.resolve(repoRoot, "e2e"),
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm exec vite apps/web --config apps/web/vite.config.ts",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
