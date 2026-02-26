import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log('=== Teste: Forçar ErrorBoundary ===\n');

    // 1. Navegar para a página inicial
    console.log('1. Navegando para home...');
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 2. Injetar código para forçar um erro React
    console.log('2. Injetando erro para testar ErrorBoundary...');

    await page.evaluate(() => {
      // Tentar acessar um elemento que causa erro
      const rootElement = document.querySelector('#root');
      if (rootElement) {
        // Disparar um erro no React
        throw new Error('TESTE DE ERRO - Verificando INFO DEV');
      }
    });

    await page.waitForTimeout(2000);

    // Screenshot
    await page.screenshot({ path: 'screenshots/test-forcar-error.avif', fullPage: true });
    console.log('   📸 Screenshot salvo');

    // 3. Verificar se o ErrorBoundary apareceu
    const pageText = await page.locator('body').textContent();
    const hasInfoDev = pageText.includes('INFO DEV') || pageText.includes('DEBUG INFO');
    const hasErrorTitle = pageText.includes('Ops! Algo deu errado') || pageText.includes('Erro');

    console.log('\n3. Resultado:');
    console.log(`   - INFO DEV: ${hasInfoDev ? '✅' : '❌'}`);
    console.log(`   - Erro visível: ${hasErrorTitle ? '✅' : '❌'}`);

    // 4. Tentar navegar para uma rota que pode ter erro
    console.log('\n4. Navegando para rota potencialmente problemática...');
    await page.goto('http://localhost:8080/patient-evolution/test-123', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`   URL atual: ${currentUrl}`);

    // Screenshot
    await page.screenshot({ path: 'screenshots/test-rota-invalida.avif', fullPage: true });

    const pageText2 = await page.locator('body').textContent();
    const hasInfoDev2 = pageText2.includes('INFO DEV') || pageText2.includes('DEBUG INFO');
    const hasErrorTitle2 = pageText2.includes('Ops!') || pageText2.includes('Erro');

    console.log('\n5. Resultado rota inválida:');
    console.log(`   - INFO DEV: ${hasInfoDev2 ? '✅' : '❌'}`);
    console.log(`   - Erro visível: ${hasErrorTitle2 ? '✅' : '❌'}`);

    console.log('\n=== Aguardando 30 segundos ===');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    await page.screenshot({ path: 'screenshots/test-forcar-erro-exception.avif', fullPage: true });
  } finally {
    await browser.close();
  }
})();
