import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Log de console
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('va.vercel-scripts') && !text.includes('get_slow_queries')) {
      console.log(`🔴 ${text}`);
    }
  });

  try {
    console.log('=== Teste: Verificar Agenda ===\n');

    // Tentar acessar diretamente a agenda
    console.log('1. Navegando para agenda...');
    await page.goto('http://localhost:8080/schedule', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log(`   URL: ${url}`);

    // Screenshot
    await page.screenshot({ path: 'screenshots/test-agenda-01.png', fullPage: true });
    console.log('   📸 Screenshot salvo');

    // Verificar se estamos na agenda ou no login
    const pageText = await page.locator('body').textContent();
    const isLogin = pageText.includes('Bem-vindo de volta') || pageText.includes('Entrar na Plataforma');
    const isAgenda = pageText.includes('Agenda') || pageText.includes('agendamento');

    console.log('\n2. Estado da página:');
    console.log(`   - Página de login: ${isLogin ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   - Página de agenda: ${isAgenda ? '✅ SIM' : '❌ NÃO'}`);

    if (isLogin) {
      console.log('\n   ⚠️ A agenda está protegida - requer login');
      console.log('   Tentando fazer login...');

      // Preencher login
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill('rafael.minatto@yahoo.com.br');

      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill('Yukari30@');

      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();

      console.log('   Aguardando navegação...');
      await page.waitForTimeout(5000);

      const newUrl = page.url();
      console.log(`   Nova URL: ${newUrl}`);

      // Screenshot após login
      await page.screenshot({ path: 'screenshots/test-agenda-02.png', fullPage: true });

      // Se ainda no login, o Supabase está com problema
      if (newUrl.includes('/auth/login')) {
        console.log('\n   ❌ Login falhou - Supabase pode estar com problema');
      } else {
        console.log('\n   ✅ Login bem-sucedido! Navegando para agenda...');

        await page.goto('http://localhost:8080/schedule', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        await page.screenshot({ path: 'screenshots/test-agenda-03.png', fullPage: true });

        // Procurar botões
        const allButtons = await page.locator('button:visible').all();
        console.log(`\n   Total de botões: ${allButtons.length}`);

        const iniciarButtons = [];
        for (let i = 0; i < Math.min(allButtons.length, 30); i++) {
          const text = await allButtons[i].textContent();
          if (text) {
            const cleanText = text.trim();
            console.log(`   [${i}] "${cleanText.slice(0, 35)}"`);
            if (cleanText.includes('Iniciar') || cleanText.includes('atendimento')) {
              iniciarButtons.push({ index: i, text: cleanText, element: allButtons[i] });
            }
          }
        }

        console.log(`\n   Botões "Iniciar": ${iniciarButtons.length}`);

        if (iniciarButtons.length > 0) {
          console.log('\n   Clicando no primeiro botão "Iniciar"...');
          await iniciarButtons[0].element.click();
          await page.waitForTimeout(3000);

          await page.screenshot({ path: 'screenshots/test-agenda-04.png', fullPage: true });

          const finalUrl = page.url();
          console.log(`   URL final: ${finalUrl}`);

          const finalPageText = await page.locator('body').textContent();
          const hasInfoDev = finalPageText.includes('INFO DEV') || finalPageText.includes('DEBUG INFO');
          const hasError = finalPageText.includes('Ops!') || finalPageText.includes('Erro');

          console.log('\n   Resultado final:');
          console.log(`   - INFO DEV: ${hasInfoDev ? '✅' : '❌'}`);
          console.log(`   - Erro: ${hasError ? '✅' : '❌'}`);
          console.log(`   - PatientEvolution: ${finalUrl.includes('patient-evolution') ? '✅' : '❌'}`);
        }
      }
    }

    console.log('\n=== Aguardando 30 segundos para inspeção ===');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    await page.screenshot({ path: 'screenshots/test-agenda-erro.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
