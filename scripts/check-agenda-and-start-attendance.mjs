#!/usr/bin/env node
/**
 * Navega até a agenda, verifica erros no console e tenta iniciar um atendimento.
 * Uso: node scripts/check-agenda-and-start-attendance.mjs
 *      BASE_URL=https://fisioflow-migration.web.app node scripts/check-agenda-and-start-attendance.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:8085';
const EMAIL = 'rafael.minatto@yahoo.com.br';
const PASS = 'Yukari30@';

const consoleLogs = [];
const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') consoleErrors.push(text);
    consoleLogs.push({ type, text: text.slice(0, 200) });
  });

  try {
    console.log('1. Navegando para', BASE + '/auth');
    await page.goto(BASE + '/auth', { waitUntil: 'domcontentloaded', timeout: 15000 });

    await page.waitForTimeout(2000);

    const emailSel = 'input[type="email"], input[name="email"], #email';
    const passSel = 'input[type="password"], input[name="password"], #password';
    if ((await page.locator(emailSel).count()) === 0) {
      console.log('   Já logado ou página diferente. Indo para agenda.');
      await page.goto(BASE + '/?view=week&date=2026-02-04', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } else {
      await page.fill(emailSel, EMAIL);
      await page.fill(passSel, PASS);
      const btn = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")').first();
      await btn.click();
      await page.waitForTimeout(5000);
      await page.goto(BASE + '/?view=week&date=2026-02-04', { waitUntil: 'domcontentloaded', timeout: 15000 });
    }

    await page.waitForTimeout(6000);

    const corsErrors = consoleErrors.filter((t) => t.includes('CORS') || t.includes('Access-Control'));
    const otherErrors = consoleErrors.filter((t) => !t.includes('CORS') && !t.includes('Access-Control'));

    console.log('\n2. Console (erros):');
    if (consoleErrors.length === 0) console.log('   Nenhum erro no console.');
    else {
      if (corsErrors.length) console.log('   CORS:', corsErrors.length, '–', corsErrors[0]?.slice(0, 120));
      if (otherErrors.length) console.log('   Outros:', otherErrors.length, '–', otherErrors[0]?.slice(0, 120));
    }

    console.log('\n3. Procurando card de agendamento e botão "Iniciar atendimento"...');

    let startBtn = page.getByRole('button', { name: /iniciar atendimento/i });
    let startCount = await startBtn.count();
    if (startCount > 0) {
      console.log('   Encontrado(s)', startCount, 'botão(ões) "Iniciar atendimento" visível(is). Clicando no primeiro.');
      await startBtn.first().click();
      await page.waitForTimeout(3000);
      console.log('   Clique executado.');
    } else {
      const cardSelectors = [
        '[data-appointment-id]',
        '[data-slot]',
        'button[aria-label*=" - "]',
        '[role="button"][aria-label*=" - "]',
        'button[class*="border"]',
        '[class*="emerald"]',
        '[class*="sky-100"]',
        'a[href*="patient-evolution"]',
      ];
      let clicked = false;
      for (const sel of cardSelectors) {
        const el = page.locator(sel).first();
        if ((await el.count()) > 0) {
          await el.click();
          await page.waitForTimeout(2000);
          clicked = true;
          console.log('   Clicou em elemento:', sel);
          break;
        }
      }
      if (clicked) {
        startBtn = page.getByRole('button', { name: /iniciar atendimento/i });
        if ((await startBtn.count()) > 0) {
          await startBtn.first().click();
          await page.waitForTimeout(3000);
          console.log('   Clicou em "Iniciar atendimento".');
        } else {
          const inDrawer = page.locator('[role="dialog"], [data-state="open"]').getByRole('button', { name: /iniciar atendimento/i });
          if ((await inDrawer.count()) > 0) {
            await inDrawer.first().click();
            await page.waitForTimeout(3000);
            console.log('   Clicou em "Iniciar atendimento" (dentro do drawer).');
          } else {
            console.log('   Popover/drawer aberto; botão "Iniciar atendimento" não encontrado.');
          }
        }
      } else {
        const bodyText = await page.locator('body').innerText();
        const hasAgenda = /agenda|semana|paciente/i.test(bodyText);
        console.log('   Nenhum card clicável encontrado. Página contém "agenda/paciente":', hasAgenda);
      }
    }

    const urlFinal = page.url();
    console.log('\n4. URL final:', urlFinal);
    if (urlFinal.includes('evolution') || urlFinal.includes('atendimento') || urlFinal.includes('patient-evolution')) {
      console.log('   OK: Redirecionado para página de atendimento/evolução.');
    }

    console.log('\n=== Resumo ===');
    console.log('Erros CORS no console:', corsErrors.length);
    console.log('Outros erros:', otherErrors.length);
    console.log('Teste concluído.');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
})();
