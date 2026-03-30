import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Deploy Gate', () => {
  test('should serve the core public entrypoints', async ({ page }) => {
    for (const path of ['/', '/auth', '/welcome', '/pre-cadastro']) {
      const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
      expect(response?.ok(), `expected ${path} to respond with success`).toBeTruthy();
      await expect(page).toHaveTitle(/FisioFlow/i);
    }
  });
});
