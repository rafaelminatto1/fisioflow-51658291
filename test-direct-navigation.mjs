import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar erros de console e página
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      errors.push({ type: 'console', message: text });
      console.log(`🔴 CONSOLE ERROR: ${text}`);
    }
  });

  page.on('pageerror', error => {
    errors.push({ type: 'page', message: error.message, stack: error.stack });
    console.log(`\n❌ PAGE ERROR: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });

  // Capturar requests e responses
  page.on('response', async response => {
    if (response.status() >= 400) {
      console.log(`⚠️ HTTP ${response.status()}: ${response.url()}`);
    }
  });

  try {
    console.log('\n=== Teste Direto: Navegação para PatientEvolution ===\n');

    // Primeiro, tentar navegar para a URL diretamente
    // Vamos usar um ID de agendamento fictício para ver como a página se comporta
    const testAppointmentId = '00000000-0000-0000-0000-000000000000';

    console.log(`1. Navegando para /patient-evolution/${testAppointmentId}...`);
    await page.goto(`http://localhost:8080/patient-evolution/${testAppointmentId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(5000);

    // Screenshot
    await page.screenshot({ path: 'screenshots/direct-navigation.avif', fullPage: true });
    console.log('Screenshot salvo: screenshots/direct-navigation.avif');

    // Verificar URL
    console.log(`URL atual: ${page.url()}`);

    // Verificar conteúdo da página
    const bodyText = await page.textContent('body');
    console.log('\nConteúdo da página:');
    console.log(bodyText?.substring(0, 500));

    // Verificar se há mensagem de erro visível
    const errorElements = await page.locator('[class*="error"], [class*="alert"], [role="alert"]').all();
    console.log(`\nElementos de erro/alerta: ${errorElements.length}`);

    for (const el of errorElements) {
      try {
        const text = await el.textContent();
        if (text && text.trim()) {
          console.log(`  - "${text.trim().substring(0, 100)}"`);
        }
      } catch (e) {}
    }

    // Verificar se há INFO DEV
    const devInfo = await page.locator('.bg-amber-50, [class*="INFO"], .text-amber-600').all();
    if (devInfo.length > 0) {
      console.log('\n📋 Informações de debug:');
      for (const info of devInfo) {
        const text = await info.textContent();
        console.log(`  ${text?.substring(0, 150)}`);
      }
    }

    // Listar todos os elementos visíveis na página
    console.log('\nElementos visíveis:');
    const mainElements = await page.locator('h1, h2, h3, p, button').all();
    const visibleTexts = [];
    for (const el of mainElements) {
      try {
        if (await el.isVisible()) {
          const text = await el.textContent();
          if (text && text.trim() && text.trim().length > 0) {
            visibleTexts.push(text.trim().substring(0, 50));
          }
        }
      } catch (e) {}
    }
    console.log(visibleTexts.slice(0, 20).join('\n  '));

    console.log('\n✅ Teste concluído. Aguardando 5s...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
    await page.screenshot({ path: 'screenshots/erro-crash.avif', fullPage: true });
  } finally {
    await browser.close();
  }

  // Resumo dos erros capturados
  console.log('\n=== RESUMO DE ERROS ===');
  if (errors.length === 0) {
    console.log('Nenhum erro capturado!');
  } else {
    console.log(`Total de erros: ${errors.length}`);
    errors.forEach((err, i) => {
      console.log(`\n[${i + 1}] ${err.type.toUpperCase()}`);
      console.log(`  ${err.message}`);
      if (err.stack) {
        console.log(`  Stack: ${err.stack.split('\n')[0]}`);
      }
    });
  }
})();
