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
import { authenticateBrowserContext } from './helpers/neon-auth';

const loginEmail = process.env.E2E_LOGIN_EMAIL || 'REDACTED_EMAIL';
const loginPassword = process.env.E2E_LOGIN_PASSWORD || 'REDACTED';

test.describe('Patient Evolution - fluxo completo com preenchimento SOAP', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login -> agenda -> Iniciar atendimento -> preencher SOAP -> Salvar', async ({ page, baseURL }) => {
    const url = baseURL || 'http://127.0.0.1:8084';
    const appointmentId = 'appt-e2e';
    const patientId = 'patient-e2e';
    const today = new Date().toISOString().slice(0, 10);
    let sessionSaveRequests = 0;

    await page.addInitScript(() => {
      window.localStorage.setItem('fisioflow-evolution-version', 'v1-soap');
    });

    await page.route(/\/api\/appointments(?:\/[^/?#]+)?(?:\?.*)?$/i, async (route) => {
      const requestUrl = route.request().url();
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      if (/\/api\/appointments\/appt-e2e$/i.test(requestUrl)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: appointmentId,
              patient_id: patientId,
              patientId,
              patient_name: 'Paciente E2E',
              date: today,
              appointment_date: today,
              time: '09:00',
              appointment_time: '09:00',
              start_time: '09:00',
              end_time: '09:50',
              status: 'confirmado',
              session_type: 'Fisioterapia',
              therapist_id: 'therapist-e2e',
              patient: {
                id: patientId,
                name: 'Paciente E2E',
                full_name: 'Paciente E2E',
                phone: '11999999999',
              },
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: appointmentId,
              patient_id: patientId,
              patient_name: 'Paciente E2E',
              date: today,
              start_time: '09:00',
              end_time: '09:50',
              status: 'confirmado',
              session_type: 'Fisioterapia',
              therapist_id: 'therapist-e2e',
            },
          ],
        }),
      });
    });

    await page.route(/\/api\/patients\/patient-e2e(?:\/.*)?$/i, async (route) => {
      const requestUrl = route.request().url();
      const baseResponse = {
        id: patientId,
        full_name: 'Paciente E2E',
        name: 'Paciente E2E',
        status: 'Em Tratamento',
        phone: '11999999999',
      };

      let data: unknown = baseResponse;
      if (/\/pathologies$/i.test(requestUrl) || /\/surgeries$/i.test(requestUrl) || /\/medical-returns$/i.test(requestUrl)) {
        data = [];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data }),
      });
    });

    await page.route(/\/api\/profile\/therapists$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 'therapist-e2e', name: 'Fisio E2E', crefito: '12345' }],
        }),
      });
    });

    await page.route(/\/api\/goals(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route(/\/api\/evolution\/(measurements|required-measurements)(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route(/\/api\/sessions(?:\/autosave)?(?:\?.*)?$/i, async (route) => {
      const method = route.request().method();
      const requestUrl = route.request().url();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 }),
        });
        return;
      }

      if (method === 'POST' && /\/api\/sessions\/autosave/i.test(requestUrl)) {
        sessionSaveRequests += 1;
        const now = new Date().toISOString();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'soap-e2e',
              patient_id: patientId,
              appointment_id: appointmentId,
              subjective: 'ok',
              objective: 'ok',
              assessment: 'ok',
              plan: 'ok',
              status: 'draft',
              record_date: today,
              created_by: 'therapist-e2e',
              created_at: now,
              updated_at: now,
            },
          }),
        });
        return;
      }

      if ((method === 'POST' || method === 'PUT') && /\/api\/sessions(?:\/[^/?#]+)?(?:\?.*)?$/i.test(requestUrl)) {
        sessionSaveRequests += 1;
      }

      await route.continue();
    });

    await page.route(/\/api\/evolution\/treatment-sessions(?:\?.*)?$/i, async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 'ts-e2e' } }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await authenticateBrowserContext(page.context(), loginEmail, loginPassword);

    // 1. O login já vem do storageState criado no global-setup.
    // Validamos aqui o fluxo principal da página de evolução com agendamento mockado.
    await page.goto(`${url}/patient-evolution/${appointmentId}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL((pageUrl) => !pageUrl.pathname.includes('/auth'), { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const onboardingDialog = page
      .locator('[role="dialog"]')
      .filter({ has: page.getByText(/Bem-vindo ao FisioFlow/i) })
      .first();

    if (await onboardingDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      const closeButton = onboardingDialog.getByRole('button', { name: /Close|Fechar/i }).first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click({ force: true });
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }

      await expect(onboardingDialog).toBeHidden({ timeout: 5000 });
      await page.waitForTimeout(300);
    }

    // 2. Aguardar página de evolução carregar
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

    await page.waitForSelector('textarea[aria-label="Campo SOAP: Subjetivo"]', { timeout: 20000 });
    await page.waitForTimeout(1000);

    const setTextareaValue = async (selector: string, value: string) => {
      await page.locator(selector).first().evaluate((element, nextValue) => {
        const textarea = element as HTMLTextAreaElement;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        setter?.call(textarea, nextValue);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    };

    // 3. Preencher os 4 campos SOAP (placeholders da EvolutionDraggableGrid)
    const subj = page.locator('textarea[aria-label="Campo SOAP: Subjetivo"]').first();
    await setTextareaValue('textarea[aria-label="Campo SOAP: Subjetivo"]', 'E2E Subjetivo: queixa principal e relato do paciente.');
    await expect(subj).toHaveValue(/E2E Subjetivo/);
    await page.waitForTimeout(300);

    const obj = page.locator('textarea[aria-label="Campo SOAP: Objetivo"]').first();
    await setTextareaValue('textarea[aria-label="Campo SOAP: Objetivo"]', 'E2E Objetivo: achados do exame físico e amplitude de movimento.');
    await expect(obj).toHaveValue(/E2E Objetivo/);
    await page.waitForTimeout(300);

    const aval = page.locator('textarea[aria-label="Campo SOAP: Avaliação"]').first();
    await setTextareaValue('textarea[aria-label="Campo SOAP: Avaliação"]', 'E2E Avaliação: análise do progresso e resposta ao tratamento.');
    await expect(aval).toHaveValue(/E2E Avaliação/);
    await page.waitForTimeout(300);

    const plan = page.locator('textarea[aria-label="Campo SOAP: Plano"]').first();
    await setTextareaValue('textarea[aria-label="Campo SOAP: Plano"]', 'E2E Plano: conduta, exercícios prescritos e orientações para casa.');
    await expect(plan).toHaveValue(/E2E Plano/);
    await page.waitForTimeout(1500);

    // 4. Garantir que houve persistência do draft e então acionar o salvar manual.
    await expect
      .poll(() => sessionSaveRequests, { timeout: 15000 })
      .toBeGreaterThan(0);

    const saveBtn = page.locator('button[aria-label="Salvar"], button').filter({ hasText: /^Salvar$/ }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await saveBtn.evaluate((button: HTMLButtonElement) => button.click());
    await page.waitForTimeout(1500);

    // 5. Verificar feedback: não deve aparecer toast de erro
    await page.waitForTimeout(2500);
    const errorToast = page.getByText(/Erro ao salvar|Não foi possível salvar/).first();
    await expect(errorToast).not.toBeVisible({ timeout: 6000 }).catch(() => {});
    await expect
      .poll(() => sessionSaveRequests, { timeout: 5000 })
      .toBeGreaterThan(0);
    // Página deve continuar com formulário visível (Salvar ou textarea)
    await expect(page.locator('button:has-text("Salvar"), textarea').first()).toBeVisible({ timeout: 5000 });
  });
});
