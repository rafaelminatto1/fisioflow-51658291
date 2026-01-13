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

  // Capturar erros
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('va.vercel-scripts.com') && !text.includes('get_slow_queries')) {
        errors.push(text);
        console.log(`🔴 ${text}`);
      }
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  try {
    console.log('=== Teste: ErrorBoundary com ID inválido ===\n');

    // Tentar navegar diretamente para patient-evolution com ID inválido
    console.log('1. Navegando para /patient-evolution/invalid-id-12345...');
    await page.goto('http://localhost:8080/patient-evolution/invalid-id-12345', {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`   URL atual: ${currentUrl}`);

    // Screenshot
    await page.screenshot({ path: 'screenshots/test-error-boundary-01.png', fullPage: true });
    console.log('   📸 Screenshot: test-error-boundary-01.png');

    // Verificar elementos na tela
    const hasInfoDev = await page.locator('text=INFO DEV, text=DEBUG INFO, text=DEV (Debug)').count();
    const hasErrorTitle = await page.locator('text=Ops! Algo deu errado, text=Erro ao Carregar, text=Erro').count();
    const hasAppointmentId = await page.locator('text=invalid-id-12345, text=appointmentId').count();
    const hasVoltarBtn = await page.locator('text=Voltar para Agenda, text=Voltar').count();

    console.log('\n2. Verificando elementos na tela:');
    console.log(`   - INFO DEV / DEBUG INFO: ${hasInfoDev > 0 ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   - Título de erro: ${hasErrorTitle > 0 ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   - ID visível: ${hasAppointmentId > 0 ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   - Botão Voltar: ${hasVoltarBtn > 0 ? '✅ SIM' : '❌ NÃO'}`);

    // Tentar extrair texto da tela
    const bodyText = await page.locator('body').textContent();
    if (bodyText) {
      if (bodyText.includes('INFO DEV') || bodyText.includes('DEBUG INFO')) {
        console.log('\n   ✅ INFO DEV encontrado na página!');
      }
      if (bodyText.includes('appointmentId') || bodyText.includes('patientId')) {
        console.log('   ✅ IDs de contexto encontrados!');
      }
    }

    // Aguardar para inspeção
    console.log('\n=== Aguardando 30 segundos para inspeção ===');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    await page.screenshot({ path: 'screenshots/test-error-boundary-erro.png', fullPage: true });
  } finally {
    await browser.close();
  }

  if (errors.length > 0) {
    console.log('\n=== Resumo de Erros ===');
    errors.slice(0, 5).forEach((err, i) => console.log(`${i + 1}. ${err}`));
  }
})();
