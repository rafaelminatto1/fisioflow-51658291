import { expect, test } from '@playwright/test';
import { ensureScheduleSettingsReady } from './helpers/schedule-settings';

test.describe('Schedule Settings Stability', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: { cookies: [], origins: [] } });

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
    const criticalResponses: string[] = [];
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

    page.on('response', (response) => {
      if (!response.url().includes('/api/')) return;
      if (response.status() >= 500) {
        criticalResponses.push(`[response ${response.status()}] ${response.request().method()} ${response.url()}`);
      }
    });

    await ensureScheduleSettingsReady(page);

    await expect(page).toHaveURL(/\/agenda\/settings/, { timeout: 30000 });
    await expect(page.getByText('Configurações da Agenda')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Carregando configurações...')).toHaveCount(0, { timeout: 20000 });
    await expect(page.getByText('Capacidade da Agenda')).toBeVisible({ timeout: 20000 });

    await page.waitForTimeout(5000);
    expect(criticalErrors).toEqual([]);
    expect(criticalResponses).toEqual([]);
  });
});
