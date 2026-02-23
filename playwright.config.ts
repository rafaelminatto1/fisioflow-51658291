import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carregar .env.test para credenciais E2E (não commitado)
const envTestPath = path.resolve(__dirname, '.env.test');
if (existsSync(envTestPath)) {
  const content = readFileSync(envTestPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) process.env[key] = value;
      }
    }
  }
}

// Global setup - executa seed data automaticamente se E2E_AUTO_SEED=true

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : 4, // Aumentado de 2 para 4 para mais paralelização
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  timeout: 120000, // Aumentado para 120s
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173?e2e=true',
    storageState: 'playwright/.auth/user.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 30000, // Aumentado para 30s
    navigationTimeout: 60000, // Aumentado para 60s
  },

  projects: process.env.CI ? [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ] : [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // webServer configuration is disabled in CI to avoid issues
  // In CI, we expect the tests to run without a running dev server
  webServer: process.env.CI ? undefined : {
    command: 'pnpm preview --port 5173 --host 127.0.0.1',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
