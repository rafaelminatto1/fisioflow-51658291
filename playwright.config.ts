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

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    storageState: 'playwright/.auth/user.json',
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* OTIMIZAÇÃO: Reduzindo projetos para evitar explosão de testes */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
      },
    },
    /* Outros navegadores desativados por padrão para velocidade. 
       Ative apenas quando necessário validar cross-browser. */
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  webServer: process.env.CI ? undefined : {
    // Frontend Vite
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000,
    env: {
      ...process.env,
      // Use production Worker URL for E2E tests so they go through the real deployed Worker.
      // This avoids Miniflare/Hyperdrive SSL connectivity issues with Neon in local dev.
      VITE_WORKERS_API_URL: process.env.VITE_WORKERS_API_URL || 'https://fisioflow-api.rafalegollas.workers.dev',
    }
  },

});
