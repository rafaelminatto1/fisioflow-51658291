import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { patientLogin, PATIENT_CREDENTIALS } from './auth-flow.spec';

const MOBILE_SNAPSHOT = 'playwright-report/mobile-login.png';
const MOBILE_SNAPSHOT_DIR = 'test-results/mobile';
mkdirSync(MOBILE_SNAPSHOT_DIR, { recursive: true });

test.describe('Mobile visual checks', () => {
  test('renders login screen at mobile viewport', async ({ page }) => {
    await page.goto('/(auth)/login', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('text=FisioFlow')).toBeVisible();
    await expect(page.locator('text=Portal do Paciente')).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();

    await page.screenshot({ path: MOBILE_SNAPSHOT, fullPage: true });
  });

  test('captures logged-in tabs on narrow viewport', async ({ page }) => {
    await patientLogin(page, PATIENT_CREDENTIALS);

    const tabs = [
      { route: '/(tabs)', name: 'home', verifyText: 'Feitos hoje' },
      { route: '/(tabs)/exercises', name: 'exercises', verifyText: 'Meus Exercícios' },
      { route: '/(tabs)/appointments', name: 'appointments', verifyText: 'Próxima Consulta' },
    ];

    for (const tab of tabs) {
      await page.goto(tab.route, { waitUntil: 'domcontentloaded' });
      if (tab.verifyText) {
        await expect(page.locator(`text=${tab.verifyText}`)).toBeVisible();
      }
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${MOBILE_SNAPSHOT_DIR}/${tab.name}.png`,
        fullPage: true,
      });
    }
  });

  test('protected tabs redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/(tabs)/exercises');

    await expect(page).toHaveURL(/\/(auth)\/login/);

    await page.goto('/(tabs)/appointments');
    await expect(page).toHaveURL(/\/(auth)\/login/);

    await page.goto('/(tabs)/progress');
    await expect(page).toHaveURL(/\/(auth)\/login/);
  });
});
