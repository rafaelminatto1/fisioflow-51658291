import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

    // Wait for SPA to fully load
    console.log('Waiting for page to load...');
    await page.waitForTimeout(8000);

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/login-initial.png', fullPage: true });
    console.log('Screenshot saved: /tmp/login-initial.png');

    // Try to find email input
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="e-mail" i]',
      '#email',
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        emailInput = selector;
        console.log(`Found email input with selector: ${selector}`);
        break;
      }
    }

    if (!emailInput) {
      const title = await page.title();
      console.log('Page title:', title);
      console.log('Current URL:', page.url());

      const inputs = await page.$$eval('input', els => els.map(e => ({
        type: e.type,
        name: e.name,
        id: e.id,
        placeholder: e.placeholder,
      })));
      console.log('Found inputs:', JSON.stringify(inputs, null, 2));
      throw new Error('Email input not found');
    }

    // Fill email
    await page.fill(emailInput, 'rafael.minatto@yahoo.com.br');
    console.log('Email filled: rafael.minatto@yahoo.com.br');

    // Find password input
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[name="senha"]',
      'input[placeholder*="senha" i]',
      'input[placeholder*="password" i]',
      '#password',
    ];

    let passwordInput = null;
    for (const selector of passwordSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        passwordInput = selector;
        console.log(`Found password input with selector: ${selector}`);
        break;
      }
    }

    if (!passwordInput) {
      throw new Error('Password input not found');
    }

    await page.fill(passwordInput, 'Yukari30@');
    console.log('Password filled');

    // Screenshot before login
    await page.screenshot({ path: '/tmp/login-before-click.png', fullPage: true });
    console.log('Screenshot saved: /tmp/login-before-click.png');

    // Find and click login button
    const buttonSelectors = [
      'button[type="submit"]',
      'button:has-text("Entrar")',
      'button:has-text("Login")',
      'button:has-text("Acessar")',
    ];

    let buttonClicked = false;
    for (const selector of buttonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.click(selector);
        console.log(`Clicked button with selector: ${selector}`);
        buttonClicked = true;
        break;
      }
    }

    if (!buttonClicked) {
      console.log('Login button not found, trying Enter key');
      await page.keyboard.press('Enter');
    }

    // Wait for navigation/processing
    console.log('Waiting for response...');
    await page.waitForTimeout(10000);

    // Final screenshot
    await page.screenshot({ path: '/tmp/login-after.png', fullPage: true });
    console.log('Screenshot saved: /tmp/login-after.png');

    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    const pageContent = await page.content();
    const hasError = /erro|error|falhou|failed|incorrect|invalid/i.test(pageContent);
    console.log('Has error:', hasError);

    const hasDashboard = /dashboard|painel|agenda|pacientes/i.test(pageContent);
    console.log('Has dashboard elements:', hasDashboard);

    console.log('=== TEST SUMMARY ===');
    console.log('URL Changed:', currentUrl !== 'http://localhost:8080/');
    console.log('Has Errors:', hasError);
    console.log('Has Dashboard:', hasDashboard);
    console.log('Test completed!');

  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: '/tmp/login-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
