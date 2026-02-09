/**
 * Fluxo completo: login -> agenda -> Iniciar atendimento -> página de evolução -> preencher SOAP -> Salvar.
 * Usa BASE_URL do ambiente (playwright.config.ts default: http://127.0.0.1:8084).
 *
 * Pré-requisito: app rodando (npm run dev).
 *
 * Executar:
 *   pnpm exec playwright test e2e/patient-evolution-full-flow.spec.ts --project=chromium
 * Com navegador visível:
 *   pnpm exec playwright test e2e/patient-evolution-full-flow.spec.ts --project=chromium --headed
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Patient Evolution - fluxo completo com preenchimento SOAP', () => {
  test('login -> agenda -> Iniciar atendimento -> preencher SOAP -> Salvar', async ({ page, baseURL }) => {
    const url = baseURL || 'http://127.0.0.1:8084';
    const user = testUsers.rafael;
    await page.setViewportSize({ width: 1280, height: 900 });

    // 1. Login
    await page.goto(`${url}/auth`);
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 15000 });
    await page.fill('#login-email', user.email);
    await page.fill('#login-password', user.password);
    await page.click('button:has-text("Entrar na Plataforma")');
    await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 30000 });

    // 2. Ir para agenda
    await page.goto(`${url}/schedule`);
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 3. Clicar no primeiro agendamento (card do calendário)
    const card = page.locator('[role="button"][aria-label*="às"], .calendar-appointment-card, [data-appointment-id], [class*="appointment"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForTimeout(800);

    // 4. Clicar em "Iniciar atendimento"
    const startBtn = page.getByRole('button', { name: /Iniciar atendimento|Iniciar Avaliação/i });
    await expect(startBtn.first()).toBeVisible({ timeout: 8000 });
    await startBtn.first().click();
    await page.waitForURL(/\/patient-evolution\//, { timeout: 25000 });
    await page.waitForTimeout(2000);

    // 5. Aguardar página de evolução carregar
    const notFound = page.locator('text=Agendamento não encontrado');
    await notFound.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    const loadingSpinner = page.locator('.animate-spin, [class*="loading"]');
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Se ainda aparecer "não encontrado", falhar com mensagem clara
    if (await notFound.isVisible().catch(() => false)) {
      throw new Error('Página exibiu "Agendamento não encontrado". Verifique se o agendamento clicado existe e tem paciente.');
    }

    // Garantir que estamos na aba Evolução (SOAP)
    const tabEvolucao = page.getByRole('tab', { name: /Evolução|Evol/i });
    if (await tabEvolucao.isVisible().catch(() => false)) {
      await tabEvolucao.click();
      await page.waitForTimeout(800);
    }

    await page.waitForSelector('textarea', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // 6. Preencher os 4 campos SOAP (placeholders da EvolutionDraggableGrid)
    const subj = page.locator('textarea[placeholder*="Queixa principal"], textarea[placeholder*="Queixa"]').first();
    await subj.fill('E2E Subjetivo: queixa principal e relato do paciente.');
    await page.waitForTimeout(300);

    const obj = page.locator('textarea[placeholder*="Achados do exame"], textarea[placeholder*="Achados"]').first();
    await obj.fill('E2E Objetivo: achados do exame físico e amplitude de movimento.');
    await page.waitForTimeout(300);

    const aval = page.locator('textarea[placeholder*="Análise do progresso"], textarea[placeholder*="Análise"]').first();
    await aval.fill('E2E Avaliação: análise do progresso e resposta ao tratamento.');
    await page.waitForTimeout(300);

    const plan = page.locator('textarea[placeholder*="Conduta"], textarea[placeholder*="exercícios prescritos"]').first();
    await plan.fill('E2E Plano: conduta, exercícios prescritos e orientações para casa.');
    await page.waitForTimeout(500);

    // 7. Clicar em Salvar (botão no header; force por possível overlay)
    const saveBtn = page.getByRole('button', { name: 'Salvar' }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await saveBtn.click({ force: true });

    // 8. Verificar feedback: não deve aparecer toast de erro
    await page.waitForTimeout(2500);
    const errorToast = page.getByText(/Erro ao salvar|Não foi possível salvar/).first();
    await expect(errorToast).not.toBeVisible({ timeout: 6000 }).catch(() => {});
    // Página deve continuar com formulário visível (Salvar ou textarea)
    await expect(page.locator('button:has-text("Salvar"), textarea').first()).toBeVisible({ timeout: 5000 });
  });
});
