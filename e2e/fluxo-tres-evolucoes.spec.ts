/**
 * Fluxo E2E: login -> agenda -> iniciar 3 atendimentos -> preencher 3 evoluções SOAP.
 *
 * Pré-requisitos:
 * - Aplicação rodando em http://localhost:8084 (ou BASE_URL)
 * - Pelo menos 3 agendamentos na agenda (confirmados/agendados)
 *
 * Executar: BASE_URL=http://localhost:8084 pnpm exec playwright test e2e/fluxo-tres-evolucoes.spec.ts
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8084';

test.describe('Fluxo: login, agenda, 3 evoluções SOAP', () => {
  test('faz login, abre agenda, inicia 3 atendimentos e preenche 3 evoluções', async ({ page }) => {
    const user = testUsers.rafael;
    const evolutionsToFill = 3;

    await page.goto(`${BASE_URL}/auth`);
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 15000 });
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.click('button:has-text("Entrar na Plataforma")');
    await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 30000 });

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    let anyCard = page.locator('[role="button"][aria-label*="às"], .calendar-appointment-card, .appointment-card').first();
    if ((await anyCard.count()) === 0) {
      await page.locator('button:has-text("Mês")').first().click().catch(() => {});
      await page.waitForTimeout(2000);
      anyCard = page.locator('[role="button"][aria-label*="às"], .calendar-appointment-card, .appointment-card').first();
    }
    if ((await anyCard.count()) === 0) {
      throw new Error('Nenhum agendamento encontrado na agenda. Garanta que a aplicação está rodando em ' + BASE_URL + ' e que existem agendamentos.');
    }

    const filledCount = { current: 0 };

    for (let i = 0; i < evolutionsToFill; i++) {
      await page.waitForTimeout(1500);

      const card = page.locator('[role="button"][aria-label*="às"], .calendar-appointment-card, .appointment-card').first();
      if ((await card.count()) === 0) {
        await page.goto(`${BASE_URL}/`);
        await page.waitForTimeout(2000);
        const cardAgain = page.locator('[role="button"][aria-label*="às"], .calendar-appointment-card, .appointment-card').first();
        if ((await cardAgain.count()) === 0) {
          throw new Error(`Nenhum agendamento encontrado na agenda para evolução ${i + 1}/${evolutionsToFill}.`);
        }
        await cardAgain.click();
      } else {
        await card.click();
      }

      await page.waitForTimeout(800);

      const startButton = page.locator('button[aria-label="Iniciar atendimento"], button:has-text("Iniciar atendimento"), button:has-text("Iniciar Avaliação")').first();
      await expect(startButton).toBeVisible({ timeout: 5000 });
      await startButton.evaluate((el: HTMLElement) => el.click());

      await page.waitForURL(/\/session-evolution\//, { timeout: 15000 });
      await page.waitForTimeout(4000);

      const bodyText = await page.locator('body').textContent().catch(() => '');
      if (bodyText && (bodyText.includes('Sem permissão') || bodyText.includes('Não foi possível carregar a evolução'))) {
        throw new Error(`Evolução ${i + 1}: página retornou erro de permissão. Execute: firebase deploy --only firestore:rules. Verifique também o perfil do usuário (admin/fisioterapeuta).`);
      }

      const h1Evolution = page.locator('h1:has-text("Evolução de Sessão")');
      await expect(h1Evolution).toBeVisible({ timeout: 20000 });
      await page.waitForSelector('textarea', { timeout: 15000 });

      const soapTexts = [
        `Evolução ${i + 1} - Subjetivo: paciente relatou melhora.`,
        `Evolução ${i + 1} - Objetivo: amplitude preservada, sem edema.`,
        `Evolução ${i + 1} - Avaliação: evolução favorável.`,
        `Evolução ${i + 1} - Plano: manter exercícios domiciliares.`,
      ];

      const placeholders = [
        'Queixas do paciente',
        'Achados clínicos',
        'Análise clínica',
        'Conduta, exercícios',
      ];

      for (let j = 0; j < placeholders.length; j++) {
        const textarea = page.locator(`textarea[placeholder*="${placeholders[j]}"]`).first();
        await textarea.waitFor({ state: 'visible', timeout: 5000 });
        await textarea.fill(soapTexts[j]);
        await page.waitForTimeout(200);
      }

      const saveBtn = page.locator('button:has-text("Salvar Evolução")').last();
      await saveBtn.click();

      await page.waitForTimeout(2000);

      const hasError = await page.locator('text=Sem permissão para acessar esta sessão').count() > 0;
      if (hasError) {
        throw new Error(`Evolução ${i + 1}: página retornou erro de permissão. Verifique regras Firestore e perfil.`);
      }

      filledCount.current++;
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    }

    expect(filledCount.current).toBe(evolutionsToFill);
  });
});
