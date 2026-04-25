import { test, expect } from '@playwright/test';

test.describe('Premium Theme & Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a public route that doesn't require login
    await page.goto('/pre-cadastro');
  });

  test('should toggle dark mode via the premium switcher', async ({ page }) => {
    const toggle = page.locator('#premium-theme-toggle');

    // Debug: Take screenshot to see if it's there
    await page.screenshot({ path: 'test-results/debug-toggle.png' });

    await expect(toggle).toBeVisible({ timeout: 10000 });

    // Reset theme to light if it's dark
    const html = page.locator('html');
    const classList = await html.evaluate(el => Array.from(el.classList));
    if (classList.includes('premium-dark')) {
      await toggle.click();
      await expect(html).not.toHaveClass(/premium-dark/);
    }

    // Toggle to Dark Mode
    await toggle.click();

    // Check for premium-dark class
    await expect(html).toHaveClass(/premium-dark/);

    // Check for custom tokens (teal accent)
    const accentColor = await html.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-accent').trim()
    );
    expect(accentColor).toBe('#13ecc8');
  });

  test('theme should persist across navigation and reload', async ({ page }) => {
    const toggle = page.locator('#premium-theme-toggle');

    // Set to Dark Mode
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/premium-dark/);

    // Reload page
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/premium-dark/);

    // Navigate to another public page
    await page.goto('/welcome');
    await expect(page.locator('html')).toHaveClass(/premium-dark/);
  });
});
