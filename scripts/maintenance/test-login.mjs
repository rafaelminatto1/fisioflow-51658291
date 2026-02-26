import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

async function testLogin() {
  const browser = await chromium.launch({
    headless: true, // Run in headless mode
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Collect console logs
  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const logEntry = { type, text, timestamp: new Date().toISOString() };

    consoleLogs.push(logEntry);

    if (type === 'error') {
      consoleErrors.push(logEntry);
      console.error(`[Browser Console Error]: ${text}`);
    } else if (type === 'warning') {
      consoleWarnings.push(logEntry);
      console.warn(`[Browser Console Warning]: ${text}`);
    } else {
      console.log(`[Browser Console ${type}]: ${text}`);
    }
  });

  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    const errorEntry = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    pageErrors.push(errorEntry);
    console.error('[Page Error]:', error.message);
  });

  // Collect network errors
  const networkErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      const errorEntry = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      };
      networkErrors.push(errorEntry);
      console.error(`[Network Error]: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('🌐 Navigating to https://fisioflow-migration.web.app');
    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ path: '/tmp/fisioflow-initial.png', fullPage: true });

    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);

    // Try to find login form elements using multiple selectors
    console.log('🔍 Looking for login form elements...');

    let emailInput, passwordInput, loginButton;

    // Try various selectors for email input
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
      'input[placeholder*="e-mail" i]',
      'input[autocomplete="email"]',
      '#email',
      '.email input',
      '[data-testid="email"]'
    ];

    for (const selector of emailSelectors) {
      try {
        emailInput = await page.$(selector);
        if (emailInput) {
          console.log(`✅ Found email input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Try various selectors for password input
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="password" i]',
      'input[placeholder*="password" i]',
      'input[autocomplete="current-password"]',
      '#password',
      '.password input',
      '[data-testid="password"]'
    ];

    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.$(selector);
        if (passwordInput) {
          console.log(`✅ Found password input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Try various selectors for login button
    const loginButtonSelectors = [
      'button[type="submit"]',
      'button[type="submit"]',
      'button:has-text("Entrar")',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'button:has-text("Entrar")',
      'input[type="submit"]',
      '[data-testid="login-button"]',
      '.login-button',
      '#login-button',
      'form button',
      'button:has-text("Continuar")'
    ];

    for (const selector of loginButtonSelectors) {
      try {
        loginButton = await page.$(selector);
        if (loginButton) {
          const text = await loginButton.textContent();
          console.log(`✅ Found login button with selector: ${selector} (text: "${text?.trim()}")`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!emailInput) {
      console.error('❌ Could not find email input field');
      await page.screenshot({ path: '/tmp/fisioflow-no-email-field.png', fullPage: true });
    } else if (!passwordInput) {
      console.error('❌ Could not find password input field');
      await page.screenshot({ path: '/tmp/fisioflow-no-password-field.png', fullPage: true });
    } else if (!loginButton) {
      console.error('❌ Could not find login button');
      await page.screenshot({ path: '/tmp/fisioflow-no-login-button.png', fullPage: true });
    } else {
      console.log('✅ All login elements found');

      // Fill in the form
      console.log('📝 Filling in email: rafael.minatto@yahoo.com.br');
      await emailInput.fill('rafael.minatto@yahoo.com.br');
      await page.waitForTimeout(500);

      console.log('📝 Filling in password: ********');
      await passwordInput.fill('Yukari30@');
      await page.waitForTimeout(500);

      console.log('📸 Taking screenshot before clicking login...');
      await page.screenshot({ path: '/tmp/fisioflow-before-login.png', fullPage: true });

      console.log('🖱️ Clicking login button...');
      await loginButton.click();

      console.log('⏳ Waiting 20 seconds for page to load after login...');
      await page.waitForTimeout(20000);

      console.log('📸 Taking screenshot after login...');
      await page.screenshot({ path: '/tmp/fisioflow-after-login.png', fullPage: true });

      // Check current URL
      const currentUrl = page.url();
      console.log(`📍 Current URL after login: ${currentUrl}`);

      // Check page title
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);

      // Try to detect if we're on a dashboard or main page
      const pageContent = await page.content();
      const dashboardIndicators = [
        'dashboard',
        'painel',
        'bem-vindo',
        'welcome',
        'menu',
        'navegação',
        'logout',
        'sair',
        'perfil',
        'profile'
      ];

      const foundIndicators = dashboardIndicators.filter(indicator =>
        pageContent.toLowerCase().includes(indicator)
      );

      console.log(`📊 Dashboard indicators found: ${foundIndicators.join(', ') || 'none'}`);
    }

    // Wait a bit more to catch any delayed console errors
    console.log('⏳ Waiting 5 more seconds to catch any delayed errors...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: '/tmp/fisioflow-error.png', fullPage: true });
  } finally {
    console.log('📸 Taking final screenshot...');
    await page.screenshot({ path: '/tmp/fisioflow-final.png', fullPage: true });

    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('TEST REPORT');
    console.log('='.repeat(80));

    console.log('\n📊 Console Errors:');
    if (consoleErrors.length === 0) {
      console.log('  ✅ No console errors found');
    } else {
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.text}`);
        console.log(`     Time: ${err.timestamp}`);
      });
    }

    console.log('\n⚠️  Console Warnings:');
    if (consoleWarnings.length === 0) {
      console.log('  ✅ No console warnings found');
    } else {
      consoleWarnings.forEach((warn, i) => {
        console.log(`  ${i + 1}. [${warn.type}] ${warn.text}`);
        console.log(`     Time: ${warn.timestamp}`);
      });
    }

    console.log('\n🔴 Page Errors:');
    if (pageErrors.length === 0) {
      console.log('  ✅ No page errors found');
    } else {
      pageErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.message}`);
        console.log(`     Stack: ${err.stack}`);
        console.log(`     Time: ${err.timestamp}`);
      });
    }

    console.log('\n🌐 Network Errors:');
    if (networkErrors.length === 0) {
      console.log('  ✅ No network errors found');
    } else {
      networkErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.status} ${err.statusText} - ${err.url}`);
        console.log(`     Time: ${err.timestamp}`);
      });
    }

    console.log('\n📸 Screenshots saved to:');
    console.log('  - /tmp/fisioflow-initial.png');
    console.log('  - /tmp/fisioflow-before-login.png');
    console.log('  - /tmp/fisioflow-after-login.png');
    console.log('  - /tmp/fisioflow-final.png');

    // Save detailed report to file
    const report = {
      timestamp: new Date().toISOString(),
      consoleLogs,
      consoleErrors,
      consoleWarnings,
      pageErrors,
      networkErrors,
      finalUrl: page.url(),
      pageTitle: await page.title()
    };

    writeFileSync('/tmp/fisioflow-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: /tmp/fisioflow-test-report.json');

    console.log('\n' + '='.repeat(80));

    await browser.close();
  }
}

testLogin().catch(console.error);
