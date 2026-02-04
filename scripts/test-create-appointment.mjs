#!/usr/bin/env node
/**
 * Testa criação de agendamento em localhost:8085 (ou BASE_URL).
 * Login -> Agenda -> Novo Agendamento -> preenche -> Agendar -> verifica console.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:8085';
const EMAIL = 'rafael.minatto@yahoo.com.br';
const PASS = 'Yukari30@';
const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    console.log('1. Navegando e fazendo login...');
    await page.goto(BASE + '/auth', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const emailSel = 'input[type="email"], input[name="email"], #email';
    const passSel = 'input[type="password"], input[name="password"], #password';
    if ((await page.locator(emailSel).count()) > 0) {
      await page.fill(emailSel, EMAIL);
      await page.fill(passSel, PASS);
      await page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")').first().click();
      await page.waitForTimeout(5000);
    }

    await page.goto(BASE + '/?view=week&date=2026-02-04', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(6000);

    console.log('2. Clicando em Novo Agendamento...');
    const novoBtn = page.getByRole('button', { name: /novo agendamento|^novo$/i });
    if ((await novoBtn.count()) === 0) {
      console.log('   Botão não encontrado, tentando por texto "Novo"...');
      await page.locator('button:has-text("Novo")').first().click();
    } else {
      await novoBtn.first().click();
    }
    await page.waitForTimeout(2000);

    const modal = page.locator('[role="dialog"], [data-state="open"]').filter({ has: page.locator('text=/paciente|agendar/i') }).first();
    let modalVisible = false;
    if ((await modal.count()) > 0) {
      try {
        modalVisible = await modal.isVisible();
      } catch (_) {}
    }
    if (!modalVisible) {
      const anyDialog = page.locator('[role="dialog"]').first();
      if ((await anyDialog.count()) > 0) await anyDialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    }

    console.log('3. Selecionando paciente...');
    const patientTrigger = page.locator('button[role="combobox"]').filter({ hasText: /paciente|selecione/i }).first();
    if ((await patientTrigger.count()) > 0) {
      await patientTrigger.click();
      await page.waitForTimeout(800);
      const firstOption = page.locator('[role="option"]').first();
      if ((await firstOption.count()) > 0) await firstOption.click();
      await page.waitForTimeout(500);
    } else {
      const selectPatient = page.locator('text=/selecione.*paciente|paciente/i').first();
      if ((await selectPatient.count()) > 0) await selectPatient.click();
      await page.waitForTimeout(500);
      const opt = page.locator('[role="option"], [data-state="checked"]').first();
      if ((await opt.count()) > 0) await opt.click();
    }

    console.log('4. Clicando em Agendar...');
    const agendarBtn = page.getByRole('button', { name: /^agendar$/i });
    if ((await agendarBtn.count()) > 0) {
      await agendarBtn.first().click();
    } else {
      await page.locator('button:has-text("Agendar")').first().click();
    }
    await page.waitForTimeout(4000);

    const corsErrors = consoleErrors.filter((t) => t.includes('CORS') || t.includes('Access-Control'));
    const createErrors = consoleErrors.filter((t) => t.includes('createAppointmentV2') || t.includes('Failed to fetch'));
    let successToast = false;
    try {
      successToast = await page.locator('text=/sucesso|agendamento criado/i').first().isVisible();
    } catch (_) {}
    const modalClosed = (await page.locator('[role="dialog"]').count()) === 0;

    console.log('\n5. Resultado:');
    console.log('   Erros CORS:', corsErrors.length);
    console.log('   Erros createAppointmentV2/Failed to fetch:', createErrors.length);
    console.log('   Toast sucesso visível:', successToast);
    console.log('   Modal fechado:', modalClosed);
    if (createErrors.length > 0) console.log('   Exemplo erro:', createErrors[0]?.slice(0, 120));

    const ok = corsErrors.length === 0 && createErrors.length === 0 && (successToast || modalClosed);
    console.log('\n===', ok ? 'OK: Criação de agendamento sem erros de CORS.' : 'Verificar: pode ter falha na criação.', '===');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
})();
