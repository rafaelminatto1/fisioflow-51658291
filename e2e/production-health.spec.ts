import { test, expect } from '@playwright/test';

/**
 * Production Smoke Test - Verificando saúde básica do sistema pós-deploy.
 * Foca em leitura para ser seguro rodar em produção.
 */
test.describe('Production Health Check', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'https://www.moocafisio.com.br';

  test('deve realizar login e carregar agenda com FullCalendar', async ({ page }) => {
    // 1. Login
    await page.goto(`${baseUrl}/login`);

    // Se já estiver logado, pula
    if (!page.url().includes('/login')) {
      console.log('Já logado ou redirecionado.');
    } else {
      await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || '');
      await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || '');
      await page.click('button[type="submit"]');
    }

    // 2. Verifica Agenda
    await page.waitForURL('**/agenda**', { timeout: 15000 });
    await expect(page).toHaveTitle(/FisioFlow/);

    // Verifica se FullCalendar está ativo (v1.0 migration)
    const fcCount = await page.locator('.fc').count();
    expect(fcCount).toBeGreaterThan(0);

    // Verifica ausência de erro de crash
    const crashText = await page.locator('text=Algo deu errado').count();
    expect(crashText).toBe(0);
  });

  test('deve carregar lista de pacientes', async ({ page }) => {
    await page.goto(`${baseUrl}/patients`);
    await page.waitForLoadState('networkidle');

    // Verifica se a tabela ou lista de pacientes apareceu
    const patientRows = page.locator('table tr, [data-testid="patient-card"]');
    await expect(patientRows.first()).toBeVisible({ timeout: 10000 });
  });

  test('deve carregar configurações sem crash', async ({ page }) => {
    await page.goto(`${baseUrl}/configuracoes/geral`);
    await page.waitForLoadState('networkidle');

    const settingsHeader = page.locator('h1, h2').filter({ hasText: /Configurações/i });
    await expect(settingsHeader.first()).toBeVisible();
  });
});
