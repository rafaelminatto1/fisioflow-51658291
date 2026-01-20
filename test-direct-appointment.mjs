import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
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

  // Capturar requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') && url.includes('appointments')) {
      console.log(`📤 Request: ${url}`);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase') && url.includes('appointments')) {
      console.log(`📥 Response ${response.status()}: ${url}`);
      try {
        const body = await response.text();
        if (body && body.length < 500) {
          console.log(`Body: ${body.substring(0, 200)}`);
        }
      } catch (e) {}
    }
  });

  try {
    console.log('\n=== Teste: Iniciar Atendimento ===\n');

    console.log('1. Navegando para a agenda...');
    await page.goto('http://localhost:8080/schedule', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Verificar se está logado
    const currentUrl = page.url();
    console.log(`URL atual: ${currentUrl}`);

    if (currentUrl.includes('/auth/login')) {
      console.log('2. Precisa fazer login...');

      // Preencher login
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');

      // Clicar no botão de submit - usar seletores mais específicos
      const submitButton = page.locator('button[type="submit"]').or(
        page.locator('button:has-text("Entrar"), button:has-text("Login"), button:has-text("Sign")')
      ).first();

      await submitButton.click();
      console.log('Botão de login clicado...');

      // Esperar redirecionamento
      await page.waitForTimeout(5000);
      console.log(`URL após login: ${page.url()}`);

      // Se ainda estiver no login, tentar novamente
      if (page.url().includes('/auth/login')) {
        console.log('Login falhou, tentando navegar diretamente...');
        await page.goto('http://localhost:8080/schedule', { waitUntil: 'domcontentloaded' });
      }
    }

    await page.waitForTimeout(3000);

    // Tirar screenshot da agenda
    await page.screenshot({ path: 'screenshots/agenda-atual.avif', fullPage: true });
    console.log('Screenshot salvo: screenshots/agenda-atual.avif');

    // Verificar se há agendamentos na página
    console.log('\n3. Procurando agendamentos...');

    // Tentar múltiplos seletores
    const selectors = [
      'button:has-text("Iniciar")',
      '[data-testid="appointment-card"]',
      '[class*="appointment"]',
      '[role="button"]',
      'button'
    ];

    let foundStartButton = false;
    let clicked = false;

    for (const selector of selectors) {
      try {
        const elements = await page.locator(selector).all();
        console.log(`  Seletor "${selector}": ${elements.length} elementos`);

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          try {
            const text = await el.textContent();
            const isVisible = await el.isVisible();

            if (isVisible && text) {
              console.log(`    [${i}] Texto: "${text?.substring(0, 50)}"`);

              if (text.includes('Iniciar') && (text.includes('atendimento') || text.includes('Atendimento'))) {
                console.log(`    >>> BOTÃO "INICIAR ATENDIMENTO" ENCONTRADO! <<<`);
                foundStartButton = true;

                // Clicar no botão
                await el.click({ timeout: 5000 });
                clicked = true;
                console.log('    Botão clicado!');
                break;
              }
            }
          } catch (e) {
            // Elemento pode não ser visível ou acessível
          }
        }

        if (clicked) break;
      } catch (e) {
        // Continuar para próximo seletor
      }
    }

    if (!clicked) {
      console.log('\n⚠️ Nenhum botão "Iniciar Atendimento" encontrado');
      console.log('Tentando procurar por qualquer botão com texto relacionado...');

      // Busca mais ampla
      const allButtons = await page.locator('button').all();
      console.log(`Total de botões na página: ${allButtons.length}`);

      for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
        try {
          const text = await allButtons[i].textContent();
          if (text && text.trim()) {
            console.log(`  Botão ${i}: "${text.trim().substring(0, 40)}"`);
          }
        } catch (e) {}
      }

      // Se não encontrou botão, pode ser porque a agenda está vazia ou precisa selecionar um dia
      console.log('\nTentando clicar em um dia do calendário...');

      // Procurar elementos clicáveis no calendário
      const calendarElements = await page.locator('[class*="day"], [class*="date"], [class*="cell"]').all();
      console.log(`Elementos de calendário: ${calendarElements.length}`);

      if (calendarElements.length > 0) {
        // Clicar em alguns dias para ver se há agendamentos
        for (let i = Math.min(5, calendarElements.length - 1); i < Math.min(15, calendarElements.length); i++) {
          try {
            await calendarElements[i].click();
            await page.waitForTimeout(1000);

            // Verificar novamente se há botão "Iniciar"
            const startBtn = page.locator('button:has-text("Iniciar")').first();
            if (await startBtn.isVisible()) {
              console.log(`Encontrado botão Iniciar no dia ${i}!`);
              await startBtn.click();
              clicked = true;
              break;
            }
          } catch (e) {}
        }
      }
    }

    await page.waitForTimeout(3000);

    // Verificar URL após o clique
    const finalUrl = page.url();
    console.log(`\n4. URL final: ${finalUrl}`);

    // Screenshot final
    await page.screenshot({ path: 'screenshots/final-state.avif', fullPage: true });
    console.log('Screenshot salvo: screenshots/final-state.avif');

    // Verificar se há erro na página
    const errorSelectors = [
      'text=Ops! Algo deu errado',
      'text=Erro',
      'text=Error',
      '[class*="error"]',
      '[class*="alert"]'
    ];

    console.log('\n5. Verificando erros na página...');
    for (const selector of errorSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ⚠️ Encontrado: ${selector} (${count} ocorrências)`);
        const text = await page.locator(selector).first().textContent();
        console.log(`  Texto: "${text?.substring(0, 200)}"`);
      }
    }

    // Verificar conteúdo INFO DEV
    const devInfo = await page.locator('.bg-amber-50, [class*="INFO"], .text-amber-600').all();
    if (devInfo.length > 0) {
      console.log('\n📋 Informações de debug encontradas:');
      for (const info of devInfo) {
        const text = await info.textContent();
        console.log(`  ${text?.substring(0, 100)}`);
      }
    }

    console.log('\n✅ Teste concluído. Aguardando 10s para inspeção manual...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
    await page.screenshot({ path: 'screenshots/erro-crash.avif', fullPage: true });
  } finally {
    await browser.close();
  }
})();
