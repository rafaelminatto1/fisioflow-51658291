import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 800
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Capturar erros
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('va.vercel-scripts.com') && !text.includes('get_slow_queries')) {
        errors.push(text);
      }
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    console.log('=== Teste: Iniciar Atendimento ===\n');

    // 1. Ir para login
    console.log('1. Navegando para login...');
    await page.goto('http://localhost:8080/auth/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 2. Preencher credenciais
    console.log('2. Preenchendo credenciais...');
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="nome@"]').first();
    await emailInput.fill('rafael.minatto@yahoo.com.br');

    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.fill('Yukari30@');

    // 3. Clicar no botão de submit
    console.log('3. Clicando no botão de login...');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
    await submitBtn.click();

    // 4. Esperar navegação - pode redirecionar para dashboard ou schedule
    console.log('4. Aguardando navegação...');
    await page.waitForTimeout(5000);

    let currentUrl = page.url();
    console.log(`   URL após login: ${currentUrl}`);

    // Se ainda estiver no login, tentar novamente
    if (currentUrl.includes('/auth/login')) {
      console.log('   Ainda no login, tentando novamente...');
      await page.waitForTimeout(3000);
      currentUrl = page.url();
    }

    // 5. Ir para agenda
    console.log('\n5. Navegando para agenda...');
    await page.goto('http://localhost:8080/schedule', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Screenshot da agenda
    await page.screenshot({ path: 'screenshots/test-iniciar-01-agenda.avif' });
    console.log('   📸 Screenshot salvo');

    // 6. Procurar botões na agenda
    console.log('\n6. Procurando botões "Iniciar"...');

    // Listar todos os botões visíveis
    const allButtons = await page.locator('button:visible').all();
    console.log(`   Total de botões visíveis: ${allButtons.length}`);

    const startButtons = [];
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent();
      if (text && (text.includes('Iniciar') || text.includes('atendimento'))) {
        startButtons.push({ index: i, text: text.trim(), element: allButtons[i] });
      }
    }

    console.log(`   Botões "Iniciar" encontrados: ${startButtons.length}`);

    if (startButtons.length > 0) {
      const btn = startButtons[0];
      console.log(`   Clicando em: "${btn.text}"`);

      await btn.element.click();
      await page.waitForTimeout(3000);

      currentUrl = page.url();
      console.log(`   URL após clique: ${currentUrl}`);

      // Screenshot após clique
      await page.screenshot({ path: 'screenshots/test-iniciar-02-apos-clique.avif', fullPage: true });
      console.log('   📸 Screenshot salvo');

      // Verificar se há INFO DEV
      const pageText = await page.locator('body').textContent();
      const hasInfoDev = pageText.includes('INFO DEV') || pageText.includes('DEBUG INFO') || pageText.includes('DEV (Debug)');
      const hasErrorTitle = pageText.includes('Ops! Algo deu errado') || pageText.includes('Erro ao Carregar');
      const hasPatientEvolution = currentUrl.includes('/patient-evolution/');

      console.log('\n7. Resultado:');
      console.log(`   - INFO DEV visível: ${hasInfoDev ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   - Título de erro: ${hasErrorTitle ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   - URL patient-evolution: ${hasPatientEvolution ? '✅ SIM' : '❌ NÃO'}`);

      if (hasInfoDev) {
        console.log('\n   ✅ INFO DEV está sendo exibido!');
      } else if (hasPatientEvolution) {
        console.log('\n   ✅ Navegou para PatientEvolution com sucesso!');
      } else if (hasErrorTitle) {
        console.log('\n   ⚠️ Erro genérico sem INFO DEV');
      }

    } else {
      console.log('\n   ❌ Nenhum botão "Iniciar" encontrado');
      console.log('   Listando botões visíveis:');
      for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
        const text = await allButtons[i].textContent();
        console.log(`      [${i}] "${text?.trim().slice(0, 40)}"`);
      }
    }

    console.log('\n=== Teste concluído ===');
    console.log('Aguardando 30 segundos para inspeção visual...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    await page.screenshot({ path: 'screenshots/test-iniciar-erro.avif', fullPage: true });
  } finally {
    await browser.close();
  }

  if (errors.length > 0) {
    console.log('\n=== Erros Capturados (primeiros 5) ===');
    errors.slice(0, 5).forEach((err, i) => console.log(`${i + 1}. ${err}`));
  }
})();