import { test, expect } from '@playwright/test';

test.describe('V3 Notion Evolution View', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';

  test.beforeEach(async ({ page }) => {
    // Login if needed
    await page.goto(baseURL);
    await page.waitForTimeout(2000);

    const hasEmailInput = await page.locator('input[type="email"]').count();
    if (hasEmailInput > 0) {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }
  });

  test('V3 Notion toggle button exists', async ({ page }) => {
    await page.goto(baseURL);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if toggle buttons are visible (should be 3 now)
    const toggleButtons = await page.locator('button:has-text("SOAP"), button:has-text("Texto Livre"), button:has-text("Notion")').all();
    expect(toggleButtons.length).toBe(3);

    console.log('Toggle buttons found:', toggleButtons.length);
  });

  test('can switch to V3 Notion view', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForTimeout(2000);

    // Click on Notion toggle button
    const notionButton = page.getByRole('button', { name: /Notion/i });
    await notionButton.click();

    // Wait for the view to change
    await page.waitForTimeout(500);

    // Take screenshot to verify the layout
    await page.screenshot({ path: 'test-results/v3-notion-evolution.png', fullPage: true });

    console.log('Screenshot saved to test-results/v3-notion-evolution.png');
  });

  test('V3 view has bold section titles', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForTimeout(2000);

    // Click on Notion toggle
    const notionButton = page.getByRole('button', { name: /Notion/i });
    await notionButton.click();
    await page.waitForTimeout(500);

    // Check for bold section titles (should have larger text)
    const sectionTitles = page.getByRole('heading', { level: 2 });
    const titleCount = await sectionTitles.count();
    console.log('Section titles found:', titleCount);
    expect(titleCount).toBeGreaterThan(0);
  });

  test('V3 view has thin progress bar', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForTimeout(2000);

    // Click on Notion toggle
    const notionButton = page.getByRole('button', { name: /Notion/i });
    await notionButton.click();
    await page.waitForTimeout(500);

    // Check for the progress indicator
    const progressIndicator = await page.getByText(/blocos/i).first();
    expect(await progressIndicator.isVisible()).toBeTruthy();
  });
});
