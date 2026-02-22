import { test, expect, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

async function login(page: Page): Promise<void> {
  const email = process.env.E2E_LOGIN_EMAIL || testUsers.rafael.email;
  const password = process.env.E2E_LOGIN_PASSWORD || testUsers.rafael.password;

  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-email, input[name="email"]', email);
  await page.fill('#login-password, input[name="password"]', password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 45000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function selectPeriod(page: Page, label: 'Hoje' | 'Esta Semana' | 'Este Mês'): Promise<void> {
  await page.getByTestId('occupancy-period-select').click({ force: true });
  await page.getByRole('option', { name: label }).click({ force: true });
}

async function getActiveTherapistsCount(page: Page): Promise<number> {
  const text = (await page.getByTestId('occupancy-stat-active-therapists-value').textContent()) || '';
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

test.describe('Therapist Occupancy - Real Data', () => {
  test('loads organization real data and stays consistent across periods', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await login(page);

    await page.goto('/ocupacao-fisioterapeutas', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/ocupacao-fisioterapeutas/);
    await expect(page.getByTestId('therapist-occupancy-page')).toBeVisible({ timeout: 30000 });

    await expect.poll(async () => getActiveTherapistsCount(page), { timeout: 30000 }).toBeGreaterThan(0);
    const activeTherapists = await getActiveTherapistsCount(page);

    await expect.poll(async () => page.getByTestId('therapist-occupancy-row').count(), { timeout: 30000 }).toBeGreaterThan(0);
    const todayRows = await page.getByTestId('therapist-occupancy-row').count();
    expect(todayRows).toBe(activeTherapists);

    await selectPeriod(page, 'Esta Semana');
    await expect.poll(async () => page.getByTestId('therapist-occupancy-row').count(), { timeout: 30000 }).toBeGreaterThan(0);
    const weekRows = await page.getByTestId('therapist-occupancy-row').count();
    expect(weekRows).toBe(activeTherapists);

    await selectPeriod(page, 'Este Mês');
    await expect.poll(async () => page.getByTestId('therapist-occupancy-row').count(), { timeout: 30000 }).toBeGreaterThan(0);
    const monthRows = await page.getByTestId('therapist-occupancy-row').count();
    expect(monthRows).toBe(activeTherapists);
  });
});
