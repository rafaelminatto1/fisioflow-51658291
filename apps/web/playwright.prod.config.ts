import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  testDir: path.resolve(repoRoot, 'e2e'),
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
