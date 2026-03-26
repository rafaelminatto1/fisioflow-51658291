const { chromium } = require('playwright');
const fs = require('fs');

async function testSmartDashboard() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Navegando para o site...');
    await page.goto('https://moocafisio.com.br', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('📸 Tirando screenshot inicial...');
    await page.screenshot({ path: '/tmp/smartdash_initial.png', fullPage: true });

    // Tentar encontrar e preencher formulário de login
    console.log('🔐 Tentando fazer login...');
    await page.waitForTimeout(3000); // Aguardar loading

    // Tentar múltiplos seletores para email
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]',
      'input[placeholder*="E-mail"]',
      '#email',
      '[data-testid="email-input"]'
    ];

    let emailField = null;
    for (const selector of emailSelectors) {
      try {
        emailField = await page.locator(selector).first();
        if (await emailField.isVisible()) {
          console.log(`✅ Campo de email encontrado com seletor: ${selector}`);
          break;
        }
      } catch  {
        // Continuar para próximo seletor
      }
    }

    if (!emailField) {
      console.log('⚠️ Campo de email não encontrado. Tirando screenshot do estado atual...');
      await page.screenshot({ path: '/tmp/smartdash_no_email_field.png', fullPage: true });
      const html = await page.content();
      fs.writeFileSync('/tmp/smartdash_state.html', html);
      console.log('💾 HTML salvo em /tmp/smartdash_state.html');
    } else {
      await emailField.fill('rafael.minatto@yahoo.com.br');
      console.log('✅ Email preenchido');

      // Tentar múltiplos seletores para senha
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="senha"]',
        'input[placeholder*="Senha"]',
        '#password',
        '[data-testid="password-input"]'
      ];

      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await page.locator(selector).first();
          if (await passwordField.isVisible()) {
            console.log(`✅ Campo de senha encontrado com seletor: ${selector}`);
            break;
          }
        } catch  {
          // Continuar para próximo seletor
        }
      }

      if (!passwordField) {
        console.log('⚠️ Campo de senha não encontrado');
      } else {
        await passwordField.fill('Yukari30@');
        console.log('✅ Senha preenchida');

        // Tentar clicar em botão de login
        const loginButtonSelectors = [
          'button[type="submit"]',
          'button:has-text("Entrar")',
          'button:has-text("Login")',
          'button:has-text("Log in")',
          'button:has-text("Acessar")',
          'button:has-text("Sign in")',
          '[data-testid="login-button"]',
          '#login-button',
          '.login-button'
        ];

        let loginButton = null;
        for (const selector of loginButtonSelectors) {
          try {
            loginButton = await page.locator(selector).first();
            if (await loginButton.isVisible()) {
              console.log(`✅ Botão de login encontrado com seletor: ${selector}`);
              break;
            }
          } catch  {
            // Continuar para próximo seletor
          }
        }

        if (!loginButton) {
          console.log('⚠️ Botão de login não encontrado');
        } else {
          console.log('🔑 Clicando no botão de login...');
          await loginButton.click();

          // Aguardar redirecionamento para dashboard
          console.log('⏳ Aguardando redirecionamento...');
          await page.waitForURL(/\/(agenda|dashboard|smart-dashboard)/, { timeout: 30000 });

          console.log('✅ Login realizado com sucesso!');

          // Navegar para SmartDashboard
          console.log('📊 Navegando para SmartDashboard...');
          await page.goto('https://moocafisio.com.br/smart-dashboard', { waitUntil: 'networkidle', timeout: 30000 });

          console.log('📸 Tirando screenshot do SmartDashboard...');
          await page.screenshot({ path: '/tmp/smartdash_loaded.png', fullPage: true });

          // Testar mudança de viewMode
          console.log('🔄 Testando mudança para "Semana"...');
          const weekButton = await page.locator('button:has-text("Semana")').first();
          if (await weekButton.isVisible({ timeout: 5000 })) {
            await weekButton.click();
            console.log('✅ Botão "Semana" clicado');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: '/tmp/smartdash_week_view.png', fullPage: true });
            console.log('📸 Screenshot da visão de semana salvo');
          } else {
            console.log('⚠️ Botão "Semana" não encontrado');
          }

          // Testar mudança para "Mês"
          console.log('🔄 Testando mudança para "Mês"...');
          const monthButton = await page.locator('button:has-text("Mês")').first();
          if (await monthButton.isVisible({ timeout: 5000 })) {
            await monthButton.click();
            console.log('✅ Botão "Mês" clicado');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: '/tmp/smartdash_month_view.png', fullPage: true });
            console.log('📸 Screenshot da visão de mês salvo');
          } else {
            console.log('⚠️ Botão "Mês" não encontrado');
          }

          // Testar botão de gerar insights
          console.log('✨ Testando botão de gerar insights...');
          let genkitButton = page.locator('button:has([data-testid="wand2"]):has([data-testid="sparkles"])').first();
          if (!await genkitButton.isVisible({ timeout: 3000 })) {
            // Tentar outros seletores
            const wandButtons = await page.locator('button').all();
            for (const btn of wandButtons) {
              const html = await btn.innerHTML();
              if (html.includes('wand') || html.includes('sparkles') || html.includes('magic')) {
                genkitButton = btn;
                break;
              }
            }
          }

          if (await genkitButton.isVisible({ timeout: 5000 })) {
            await genkitButton.click();
            console.log('✅ Botão de gerar insights clicado');
            await page.waitForTimeout(5000); // Aguardar geração
            await page.screenshot({ path: '/tmp/smartdash_insights.png', fullPage: true });
            console.log('📸 Screenshot dos insights gerados salvo');
          } else {
            console.log('⚠️ Botão de gerar insights não encontrado');
          }

          console.log('✅ Testes concluídos com sucesso!');
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    await page.screenshot({ path: '/tmp/smartdash_error.png', fullPage: true });
    const html = await page.content();
    fs.writeFileSync('/tmp/smartdash_error.html', html);
    console.log('💾 HTML de erro salvo em /tmp/smartdash_error.html');
  } finally {
    await browser.close();
  }
}

testSmartDashboard().catch(console.error);
