import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== TESTE DE LOGIN FISIOFLOW ===');
    console.log('Credenciais: rafael.minatto@yahoo.com.br / Yukari30@');

    // Navigate to auth page (not root)
    console.log('\n1. Navegando para /auth...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/login-v2-01-auth-page.png', fullPage: true });
    console.log('Screenshot salvo: /tmp/login-v2-01-auth-page.png');

    // Check current URL
    console.log('URL atual:', page.url());

    // Try to find login form elements using specific IDs
    const emailId = '#login-email';
    const passwordId = '#login-password';

    const emailCount = await page.locator(emailId).count();
    const passwordCount = await page.locator(passwordId).count();

    console.log(`\n2. Procurando elementos:`);
    console.log(`   #login-email: ${emailCount} encontrado(s)`);
    console.log(`   #login-password: ${passwordCount} encontrado(s)`);

    if (emailCount === 0) {
      // Try generic selectors
      const genericEmail = await page.locator('input[type="email"]').count();
      console.log(`   input[type="email"]: ${genericEmail} encontrado(s)`);

      if (genericEmail === 0) {
        // Get page text to debug
        const bodyText = await page.locator('body').textContent();
        console.log('\nConteúdo da página (primeiros 500 chars):');
        console.log(bodyText?.substring(0, 500));
        throw new Error('Formulário de login não encontrado');
      }
    }

    // Fill email
    console.log('\n3. Preenchendo email...');
    if (emailCount > 0) {
      await page.fill(emailId, 'rafael.minatto@yahoo.com.br');
    } else {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    }

    // Fill password
    console.log('4. Preenchendo senha...');
    if (passwordCount > 0) {
      await page.fill(passwordId, 'Yukari30@');
    } else {
      await page.fill('input[type="password"]', 'Yukari30@');
    }

    // Screenshot before click
    await page.screenshot({ path: '/tmp/login-v2-02-filled.png', fullPage: true });
    console.log('Screenshot salvo: /tmp/login-v2-02-filled.png');

    // Find and click login button - try multiple selectors
    console.log('\n5. Procurando botão de login...');

    const buttonSelectors = [
      'button:has-text("Entrar na Plataforma")',
      'button:has-text("Entrar")',
      'button:has-text("Login")',
      'button[type="submit"]',
    ];

    let buttonClicked = false;
    for (const selector of buttonSelectors) {
      const count = await page.locator(selector).count();
      console.log(`   ${selector}: ${count} encontrado(s)`);
      if (count > 0) {
        await page.click(selector);
        console.log(`   ✓ Clicou em: ${selector}`);
        buttonClicked = true;
        break;
      }
    }

    if (!buttonClicked) {
      console.log('   Botão não encontrado, tentando Enter...');
      await page.keyboard.press('Enter');
    }

    // Wait for response
    console.log('\n6. Aguardando resposta do servidor...');
    await page.waitForTimeout(10000);

    // Final screenshot
    await page.screenshot({ path: '/tmp/login-v2-03-after.png', fullPage: true });
    console.log('Screenshot salvo: /tmp/login-v2-03-after.png');

    const finalUrl = page.url();
    console.log('\n7. Resultados:');
    console.log(`   URL final: ${finalUrl}`);
    console.log(`   URL mudou: ${finalUrl !== 'http://localhost:8080/auth'}`);

    // Check for error messages
    const pageText = await page.locator('body').textContent();
    const errorPatterns = [
      /erro|error|falhou|failed|incorrect|invalid|senha|password/i,
      /usuário|user|não encontrado|not found/i,
      /permissão|permission|acesso|access/i
    ];

    const errors = [];
    for (const pattern of errorPatterns) {
      const matches = pageText?.match(pattern);
      if (matches) {
        errors.push(...matches);
      }
    }

    if (errors.length > 0) {
      console.log(`   Erros encontrados: ${errors.join(', ')}`);
    } else {
      console.log('   Nenhum erro detectado no texto');
    }

    // Check for success indicators
    const successPatterns = [/dashboard|agenda|sair|logout|perfil/i];
    const hasSuccess = successPatterns.some(p => p.test(pageText || ''));
    console.log(`   Indicadores de sucesso: ${hasSuccess}`);

    console.log('\n=== TESTE CONCLUÍDO ===');

  } catch (error) {
    console.error('\nERRO NO TESTE:', error.message);
    await page.screenshot({ path: '/tmp/login-v2-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
