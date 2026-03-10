import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: 'https://moocafisio.com.br',
    trace: 'on',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'production',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
