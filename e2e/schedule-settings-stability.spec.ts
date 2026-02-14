import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const EMAIL_INPUT_SELECTOR = 'input[type="email"], input[name="email"], #login-email';
const PASSWORD_INPUT_SELECTOR = 'input[type="password"], input[name="password"], #login-password';
const LOGIN_BUTTON_NAME = /Entrar na Plataforma|Entrar/i;
const LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL || testUsers.fisio.email;
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || testUsers.fisio.password;

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 45000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await page.waitForTimeout(attempt * 1000);
      }
    }
  }

  throw lastError;
}

async function isAuthScreen(page: Page): Promise<boolean> {
  const emailInput = page.locator(EMAIL_INPUT_SELECTOR).first();
  const isLoginScreen = await emailInput.isVisible().catch(() => false);
  return isLoginScreen || page.url().includes('/auth');
}

async function doLogin(page: Page) {
  if (!page.url().includes('/auth')) {
    await gotoWithRetry(page, '/auth/login');
  }

  const emailInput = page.locator(EMAIL_INPUT_SELECTOR).first();
  const passwordInput = page.locator(PASSWORD_INPUT_SELECTOR).first();

  await expect(emailInput).toBeVisible({ timeout: 30000 });
  await expect(passwordInput).toBeVisible({ timeout: 30000 });
  await emailInput.fill(LOGIN_EMAIL);
  await passwordInput.fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: LOGIN_BUTTON_NAME }).first().click();
  await expect.poll(() => page.url(), { timeout: 45000 }).not.toContain('/auth');
}

async function ensureScheduleSettingsReady(page: Page) {
  await gotoWithRetry(page, '/auth/login');
  await doLogin(page);
  await gotoWithRetry(page, '/schedule/settings');

  await expect.poll(() => page.url(), { timeout: 30000 }).not.toContain('/auth');
  await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
}

test.describe('Schedule Settings Stability', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await ensureScheduleSettingsReady(page);
  });

  test('deve carregar /schedule/settings sem travar e sem erros críticos de console', async ({ page }) => {
    const criticalPatterns = [
      /failed-precondition/i,
      /internal assertion failed/i,
      /maximum update depth exceeded/i,
      /has already been declared/i,
      /unhandled promise rejection/i,
      /missing or insufficient permissions/i,
      /\bca9\b/i,
      /\bb815\b/i,
    ];

    const criticalErrors: string[] = [];
    const shouldIgnore = (text: string) => !text || text.includes('Download the React DevTools') || text.includes('[vite]');

    page.on('console', (msg) => {
      const text = msg.text();
      if (shouldIgnore(text)) return;
      if (msg.type() === 'error' && criticalPatterns.some((pattern) => pattern.test(text))) {
        criticalErrors.push(`[console.error] ${text}`);
      }
    });

    page.on('pageerror', (error) => {
      const text = error.message || '';
      if (shouldIgnore(text)) return;
      if (criticalPatterns.some((pattern) => pattern.test(text))) {
        criticalErrors.push(`[pageerror] ${text}`);
      }
    });

    await expect(page).toHaveURL(/\/schedule\/settings/, { timeout: 30000 });
    await expect(page.getByText('Configurações da Agenda')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Carregando configurações...')).toHaveCount(0, { timeout: 20000 });
    await expect(page.getByText('Capacidade da Agenda')).toBeVisible({ timeout: 20000 });

    await page.waitForTimeout(5000);
    expect(criticalErrors).toEqual([]);
  });
});
