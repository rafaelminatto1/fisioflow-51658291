import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar erros de console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`\n🔴 CONSOLE ERROR: ${msg.text()}`);
    }
  });

  // Capturar erros de página
  page.on('pageerror', error => {
    console.log(`\n❌ PAGE ERROR: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });

  // Capturar respostas com erro
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`\n⚠️ HTTP ${response.status()}: ${response.url()}`);
    }
  });

  try {
    console.log('1. Navegando para login...');
    await page.goto('http://localhost:8080/auth/login', { waitUntil: 'networkidle' });

    console.log('2. Preenchendo credenciais...');
    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');

    console.log('3. Fazendo login...');
    await page.click('button[type="submit"]');

    // Esperar navegação
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log(`URL após login: ${page.url()}`);

    // Ir para agenda se necessário
    if (!page.url().includes('/schedule')) {
      console.log('4. Navegando para agenda...');
      await page.goto('http://localhost:8080/schedule', { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(2000);
    console.log(`URL na agenda: ${page.url()}`);

    // Screenshot da agenda
    await page.screenshot({ path: 'screenshots/agenda-debug.avif' });
    console.log('Screenshot salvo: screenshots/agenda-debug.avif');

    // Procurar agendamentos
    console.log('5. Procurando agendamentos...');

    // Tentar diferentes seletores
    const selectors = [
      '[data-appointment-id]',
      '.appointment-card',
      '[class*="appointment"]',
      '[class*="agendamento"]'
    ];

    let foundAppointment = false;
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      console.log(`  Seletor "${selector}": ${count} elementos`);
      if (count > 0) {
        foundAppointment = true;
        // Clicar no primeiro
        await page.locator(selector).first().click();
        console.log('Clicou no primeiro agendamento');
        break;
      }
    }

    if (!foundAppointment) {
      console.log('Nenhum agendamento encontrado, tentando navegar diretamente...');

      // Vamos tentar criar um teste simples navegando diretamente
      // Primeiro, precisamos pegar um ID de agendamento válido
      console.log('Buscando agendamentos na API...');
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/appointments');
          if (!res.ok) return { error: res.status };
          return await res.json();
        } catch (e) {
          return { error: String(e) };
        }
      });
      console.log('Resposta da API:', response);
    }

    await page.waitForTimeout(2000);

    // Procurar botão de iniciar atendimento
    console.log('6. Procurando botão "Iniciar"...');
    const startSelectors = [
      'button:has-text("Iniciar")',
      'button:has-text("atendimento")',
      '[class*="iniciar"]',
      'button[class*="attendance"]'
    ];

    for (const selector of startSelectors) {
      const count = await page.locator(selector).count();
      console.log(`  Seletor "${selector}": ${count} elementos`);
      if (count > 0) {
        const text = await page.locator(selector).first().textContent();
        console.log(`  Texto do botão: "${text}"`);

        // Clicar
        await page.locator(selector).first().click();
        console.log('Clicou no botão iniciar');
        break;
      }
    }

    await page.waitForTimeout(3000);

    // Verificar se houve erro
    const currentUrl = page.url();
    console.log(`7. URL após click: ${currentUrl}`);

    // Screenshot final
    await page.screenshot({ path: 'screenshots/apos-iniciar-debug.avif', fullPage: true });
    console.log('Screenshot salvo: screenshots/apos-iniciar-debug.avif');

    // Verificar se há mensagem de erro
    const hasErrorTitle = await page.locator('text=Ops! Algo deu errado').count();
    const hasGenericError = await page.locator('text=erro, text=Erro, text=Error').count();

    console.log(`\n8. Verificação de erros:`);
    console.log(`  - "Ops! Algo deu errado": ${hasErrorTitle}`);
    console.log(`  - Erro genérico: ${hasGenericError}`);

    if (hasErrorTitle > 0 || hasGenericError > 0) {
      // Capturar detalhes do erro
      const errorDetails = await page.locator('.bg-amber-50, [class*="error"], [class*="ERROR"]').first().textContent();
      console.log(`\nDetalhes do erro:\n${errorDetails}`);
    }

    console.log('\n✅ Teste concluído. Mantendo navegador aberto para inspeção...');
    console.log('Pressione Ctrl+C para sair');

    // Manter aberto
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
    await page.screenshot({ path: 'screenshots/erro-teste.avif' });
  } finally {
    // Não fechar o navegador para inspeção manual
    // await browser.close();
  }
})();
