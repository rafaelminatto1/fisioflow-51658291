import { test, expect, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

async function login(page: Page): Promise<void> {
  const email = process.env.E2E_LOGIN_EMAIL || testUsers.rafael.email;
  const password = process.env.E2E_LOGIN_PASSWORD || testUsers.rafael.password;

  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-email, input[type="email"]', email);
  await page.fill('#login-password, input[type="password"]', password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 45000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function openDefaultSmartDashboard(page: Page): Promise<void> {
  await page.goto('/smart-dashboard', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('dashboard_layout_v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('smart-dashboard-page')).toBeVisible({ timeout: 30000 });
}

test.describe('Smart Dashboard Layout', () => {
  test('desktop: stats cards align on a single row without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await login(page);
    await openDefaultSmartDashboard(page);

    const hasHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return Math.max(root.scrollWidth, body.scrollWidth) > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    const ids = ['stat-appointments', 'stat-revenue', 'stat-patients', 'stat-occupancy'] as const;
    const boxes = await Promise.all(
      ids.map(async (id) => {
        const locator = page.getByTestId(id);
        await expect(locator).toBeVisible();
        return locator.boundingBox();
      }),
    );

    for (const box of boxes) {
      expect(box).not.toBeNull();
    }

    const safeBoxes = boxes.filter((box): box is NonNullable<typeof box> => Boolean(box));
    const topValues = safeBoxes.map((box) => box.y);
    const xValues = safeBoxes.map((box) => box.x);
    const topVariance = Math.max(...topValues) - Math.min(...topValues);

    expect(topVariance).toBeLessThan(16);
    expect(xValues[0]).toBeLessThan(xValues[1]);
    expect(xValues[1]).toBeLessThan(xValues[2]);
    expect(xValues[2]).toBeLessThan(xValues[3]);
  });

  test('mobile: keeps two-column event stats and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await openDefaultSmartDashboard(page);

    const hasHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return Math.max(root.scrollWidth, body.scrollWidth) > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    const eventCards = [
      page.getByTestId('stats-events-total'),
      page.getByTestId('stats-events-completion'),
      page.getByTestId('stats-events-revenue'),
      page.getByTestId('stats-events-participants'),
    ];

    for (const card of eventCards) {
      await expect(card).toBeVisible();
    }

    const columnCount = await page.getByTestId('stats-events-grid').evaluate((element) => {
      const template = window.getComputedStyle(element).gridTemplateColumns;
      return template.split(' ').filter(Boolean).length;
    });

    expect(columnCount).toBe(2);
  });
});
