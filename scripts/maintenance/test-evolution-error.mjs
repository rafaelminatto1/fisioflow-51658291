import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar erros
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 CONSOLE: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  try {
    console.log('1. Navegando para login...');
    await page.goto('http://localhost:8080/auth/login', { waitUntil: 'domcontentloaded' });

    console.log('2. Preenchendo credenciais...');
    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');

    console.log('3. Fazendo login...');
    await Promise.all([
      page.waitForURL(/\/schedule|\/dashboard/, { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    console.log(`✅ Login成功! URL: ${page.url()}`);

    // Ir para agenda se não estiver lá
    if (!page.url().includes('/schedule')) {
      console.log('4. Navegando para agenda...');
      await page.goto('http://localhost:8080/schedule', { waitUntil: 'domcontentloaded' });
    }

    await page.waitForTimeout(2000);

    // Screenshot da agenda
    await page.screenshot({ path: 'screenshots/test-agenda.avif' });
    console.log('📸 Screenshot salvo: screenshots/test-agenda.avif');

    // Procurar botões "Iniciar"
    console.log('5. Procurando botão "Iniciar Atendimento"...');
    const startButtons = await page.locator('button:has-text("Iniciar")').count();
    console.log(`   Botões encontrados: ${startButtons}`);

    if (startButtons > 0) {
      const firstBtn = page.locator('button:has-text("Iniciar")').first();
      const btnText = await firstBtn.textContent();
      console.log(`   Clicando em: "${btnText}"`);

      await firstBtn.click();
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      console.log(`6. URL após clique: ${currentUrl}`);

      // Screenshot após clicar
      await page.screenshot({ path: 'screenshots/test-after-click.avif', fullPage: true });
      console.log('📸 Screenshot salvo: screenshots/test-after-click.avif');

      // Verificar se há erro
      const hasError = await page.locator('text=Ops! Algo deu errado, text=INFO DEV').count();
      console.log(`   Elementos de erro encontrados: ${hasError}`);

      if (hasError > 0) {
        console.log('✅ INFO DEV detectado! O erro está sendo exibido com debug info.');
      } else if (currentUrl.includes('/patient-evolution/')) {
        console.log('✅ Navegou para PatientEvolution com sucesso!');
      }
    } else {
      console.log('⚠️ Nenhum botão "Iniciar" encontrado');
    }

    console.log('\n✅ Teste concluído. Navegador permanecerá aberto por 30 segundos...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    await page.screenshot({ path: 'screenshots/test-error.avif' });
  } finally {
    await browser.close();
  }
})();
