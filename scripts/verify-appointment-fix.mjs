#!/usr/bin/env node
/**
 * Verifica correção: fisioterapeuta opcional + conflito por capacidade.
 * Uso: node scripts/verify-appointment-fix.mjs
 * Requer: playwright instalado e usuário rafael válido no Firebase.
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://fisioflow-migration.web.app';
const LOGIN = {
  email: 'rafael.minatto@yahoo.com.br',
  password: 'Yukari30@',
};

async function main() {
  let browser;
  const results = { toastSemFisio: null, semHorarioOcupado: null };
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    // Login
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'load', timeout: 30000 });
    await page.getByText(/Bem-vindo|Entre com suas credenciais|Login/).first().waitFor({ state: 'visible', timeout: 20000 });
    const textboxes = page.getByRole('textbox');
    await textboxes.first().fill(LOGIN.email);
    await textboxes.nth(1).fill(LOGIN.password);
    await page.getByRole('button', { name: /Entrar|submit/i }).click();
    await page.waitForURL(/\/($|eventos|dashboard|schedule)/, { timeout: 25000 });
    await page.goto(`${BASE_URL}/schedule`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Abrir Novo Agendamento (slot amanhã 09:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const testId = `time-slot-${dateStr}-09:00`;
    await page.click('button:has-text("Semana")');
    await page.waitForTimeout(500);
    const slot = page.getByTestId(testId);
    await slot.waitFor({ state: 'visible', timeout: 10000 });
    await slot.click();

    const modal = page.getByRole('dialog').filter({ hasText: 'Agendamento' });
    await modal.waitFor({ state: 'visible', timeout: 8000 });

    // Cenário 1: sem fisioterapeuta -> permitir agendar (não exibir toast de obrigatoriedade)
    await modal.getByRole('combobox').filter({ hasText: /Selecione o paciente|Paciente/i }).first().click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(300);
    await modal.getByRole('button', { name: 'Agendar' }).click();
    await page.waitForTimeout(2000);
    const toastObrigatorio = await page.getByText('Escolha um fisioterapeuta', { exact: false }).isVisible();
    results.toastSemFisio = !toastObrigatorio; // OK quando NÃO aparece o toast
    console.log('[1] Sem fisioterapeuta -> permitir agendar (sem toast obrigatório):', !toastObrigatorio ? 'OK' : 'FALHOU');

    // Cenário 2: com fisioterapeuta em slot livre -> não mostrar "horário ocupado"
    await modal.getByRole('combobox').filter({ hasText: /Escolher fisioterapeuta|Fisioterapeuta/i }).click();
    await page.waitForTimeout(500);
    const firstTherapist = page.locator('[role="option"]').first();
    if (await firstTherapist.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstTherapist.click();
    }
    await page.waitForTimeout(300);
    await modal.getByRole('button', { name: 'Agendar' }).click();
    await page.waitForTimeout(4000);
    const ocupadoVisible = await page.getByText('Este horário já está ocupado para você', { exact: false }).isVisible().catch(() => false);
    results.semHorarioOcupado = !ocupadoVisible;
    console.log('[2] Com fisioterapeuta em slot livre -> NÃO mostrar "horário ocupado":', !ocupadoVisible ? 'OK' : 'FALHOU');

    const ok = results.toastSemFisio && results.semHorarioOcupado;
    console.log(ok ? '\n*** VERIFICAÇÃO OK ***' : '\n*** ALGUM CENÁRIO FALHOU ***');
    process.exit(ok ? 0 : 1);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(2);
  } finally {
    if (browser) await browser.close();
  }
}

main();
