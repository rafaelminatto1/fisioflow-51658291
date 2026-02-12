import { test, expect } from '@playwright/test';

test('sanity check - can load auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveTitle(/FisioFlow/i);
});
