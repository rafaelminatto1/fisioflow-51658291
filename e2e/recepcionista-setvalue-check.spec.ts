import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Recepcionista Login - SetValue Error Check', () => {
  test.setTimeout(120000); // Extend timeout to 2 minutes

  test('login as recepcionista and check for setValue error', async ({ page, context }) => {
    const errors: any[] = [];
    const warnings: any[] = [];
    const setValueErrors: any[] = [];

    // Use incognito context (already isolated by Playwright, but we can ensure it)
    console.log('\n========================================');
    console.log('STEP 1: Setting up incognito context');
    console.log('========================================\n');

    // Listen for console messages
    page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        const errorObj: any = {
          text: text,
          location: msg.location(),
          timestamp: new Date().toISOString()
        };
        try {
          errorObj.args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        } catch (e) {
          // Ignore args that can't be serialized
        }
        errors.push(errorObj);

        // Check specifically for setValue error
        if (text.includes('setValue') || text.includes('Cannot access') || text.includes('before initialization')) {
          setValueErrors.push(errorObj);
          console.log(`\n⚠️ [SETVALUE ERROR DETECTED] ${text}`);
          if (msg.location()) {
            console.log(`  Location: ${msg.location().url}:${msg.location().lineNumber}`);
          }
        } else {
          console.log(`[ERROR] ${text}`);
        }
      } else if (type === 'warning') {
        warnings.push({
          text: text,
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
        console.log(`[WARNING] ${text}`);
      } else if (type === 'log') {
        // Optionally log debug messages
        // console.log(`[LOG] ${text}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      const errorMsg = error.message;
      console.log(`\n⚠️ [PAGE ERROR] ${errorMsg}`);
      errors.push({
        text: errorMsg,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Check for setValue error in page errors
      if (errorMsg.includes('setValue') || errorMsg.includes('Cannot access') || errorMsg.includes('before initialization')) {
        setValueErrors.push({
          text: errorMsg,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Listen for request failures
    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure) {
        console.log(`[REQUEST FAILED] ${request.url()} - ${failure.errorText}`);
        errors.push({
          text: `Request failed: ${request.url()}`,
          errorText: failure.errorText,
          timestamp: new Date().toISOString()
        });
      }
    });

    console.log('\n========================================');
    console.log('STEP 2: Navigating to fisioflow-migration.web.app');
    console.log('========================================\n');

    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Page loaded. Waiting for initial rendering...');
    await page.waitForTimeout(3000);

    console.log('\n========================================');
    console.log('STEP 3: Looking for login form');
    console.log('========================================\n');

    // Wait for login form to be visible
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network did not reach idle state, continuing...');
    });

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/recepcionista-initial.png', fullPage: true });
    console.log('Initial screenshot saved to /tmp/recepcionista-initial.png');

    // Try to find email input
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
      'input[placeholder*="e-mail" i]'
    ];

    let emailLocator = null;
    for (const selector of emailSelectors) {
      try {
        const locator = page.locator(selector).first();
        if (await locator.count() > 0) {
          console.log(`Found email input with selector: ${selector}`);
          emailLocator = locator;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!emailLocator) {
      throw new Error('Could not find email input field');
    }

    console.log('\n========================================');
    console.log('STEP 4: Filling in credentials');
    console.log('========================================\n');

    const email = 'recepcionista@moocafisio.com.br';
    const password = 'teste123';

    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    // Fill email
    await emailLocator.fill(email);
    console.log('✓ Email field filled');

    await page.waitForTimeout(500);

    // Find and fill password
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[name="pass"]',
      'input[id*="password" i]'
    ];

    let passwordLocator = null;
    for (const selector of passwordSelectors) {
      try {
        const locator = page.locator(selector).first();
        if (await locator.count() > 0) {
          console.log(`Found password input with selector: ${selector}`);
          passwordLocator = locator;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!passwordLocator) {
      throw new Error('Could not find password input field');
    }

    await passwordLocator.fill(password);
    console.log('✓ Password field filled');

    await page.waitForTimeout(500);

    // Screenshot before clicking login
    await page.screenshot({ path: '/tmp/recepcionista-before-login.png', fullPage: true });
    console.log('Pre-login screenshot saved to /tmp/recepcionista-before-login.png');

    console.log('\n========================================');
    console.log('STEP 5: Clicking login button');
    console.log('========================================\n');

    // Try to find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Entrar")',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'button:has-text("Logar")',
      'button:has-text("Acessar")',
      'input[type="submit"]',
      '[data-testid="login-button"]',
      '.login-button',
      '.submit-button'
    ];

    let loginClicked = false;
    for (const selector of submitSelectors) {
      try {
        const submitButton = page.locator(selector).first();
        if (await submitButton.count() > 0 && await submitButton.isVisible({ timeout: 2000 })) {
          await submitButton.click();
          console.log(`✓ Clicked login button using selector: ${selector}`);
          loginClicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!loginClicked) {
      console.log('Could not find login button with known selectors');
      console.log('Attempting to press Enter in password field...');
      await passwordLocator.press('Enter');
      console.log('✓ Pressed Enter in password field');
    }

    console.log('\n========================================');
    console.log('STEP 6: Waiting for login to process');
    console.log('========================================\n');

    // Wait for navigation or page update
    try {
      await page.waitForNavigation({
        waitUntil: 'networkidle',
        timeout: 15000
      });
      console.log('✓ Navigation occurred');
    } catch (e) {
      console.log('No navigation detected within timeout - checking if login succeeded anyway...');
    }

    // Wait additional time for any delayed errors
    console.log('Waiting 10 seconds for any delayed errors to appear...');
    await page.waitForTimeout(10000);

    // Screenshot after login
    await page.screenshot({ path: '/tmp/recepcionista-after-login.png', fullPage: true });
    console.log('Post-login screenshot saved to /tmp/recepcionista-after-login.png');

    console.log('\n========================================');
    console.log('STEP 7: Checking final page state');
    console.log('========================================\n');

    // Get page title and URL
    const title = await page.title();
    const url = page.url();

    console.log(`Final URL: ${url}`);
    console.log(`Page Title: ${title}`);

    // Check for success indicators
    const successIndicators = [
      'dashboard',
      'agenda',
      'pacientes',
      'recepcionista',
      'fisioflow'
    ];

    const pageContent = await page.content();
    const hasSuccessIndicator = successIndicators.some(indicator =>
      pageContent.toLowerCase().includes(indicator)
    );

    console.log('\n========================================');
    console.log('RESULTS SUMMARY');
    console.log('========================================\n');

    console.log(`Total Console Errors: ${errors.length}`);
    console.log(`Total Warnings: ${warnings.length}`);
    console.log(`SetValue Errors Found: ${setValueErrors.length}`);
    console.log(`Login appears successful: ${hasSuccessIndicator || url.includes('/dashboard') || url.includes('/agenda')}`);

    if (setValueErrors.length > 0) {
      console.log('\n⚠️⚠️⚠️ SETVALUE ERRORS DETECTED ⚠️⚠️⚠️\n');
      setValueErrors.forEach((err, idx) => {
        console.log(`\n[SetValue Error ${idx + 1}]`);
        console.log(`  Message: ${err.text}`);
        if (err.location) {
          console.log(`  Location: ${err.location.url}:${err.location.lineNumber}`);
        }
        if (err.stack) {
          console.log(`  Stack: ${err.stack.substring(0, 200)}...`);
        }
        console.log(`  Timestamp: ${err.timestamp}`);
      });
    } else {
      console.log('\n✅ No setValue errors detected!');
    }

    if (errors.length > 0) {
      console.log('\n--- ALL ERRORS ---');
      errors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
        if (err.location) {
          console.log(`    Location: ${err.location.url}:${err.location.lineNumber}`);
        }
      });
    }

    // Save detailed results
    const results = {
      timestamp: new Date().toISOString(),
      test: 'recepcionista-login-setvalue-check',
      credentials: {
        email: email,
        role: 'recepcionista'
      },
      finalUrl: url,
      pageTitle: title,
      loginSuccessful: hasSuccessIndicator || url.includes('/dashboard') || url.includes('/agenda'),
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      setValueErrorsCount: setValueErrors.length,
      setValueErrors: setValueErrors,
      allErrors: errors,
      allWarnings: warnings
    };

    fs.writeFileSync(
      '/tmp/recepcionista-setvalue-check-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nDetailed results saved to /tmp/recepcionista-setvalue-check-results.json');

    // Assert that there are no setValue errors
    expect(setValueErrors.length).toBe(0);

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');
  });
});
