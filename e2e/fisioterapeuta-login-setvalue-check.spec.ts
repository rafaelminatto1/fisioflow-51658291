import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import * as fs from 'fs';

test.describe('Fisioterapeuta Login - setValue Error Check', () => {
  test.setTimeout(180000); // Extend timeout to 3 minutes

  test('login as fisioterapeuta and check for setValue error', async ({ page }) => {
    const errors: any[] = [];
    const warnings: any[] = [];
    const consoleMessages: string[] = [];

    // Listen for ALL console messages (not just errors)
    page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      // Log all console messages
      consoleMessages.push(`[${type.toUpperCase()}] ${text}`);

      // Check specifically for setValue error
      if (text.toLowerCase().includes('setvalue') || text.toLowerCase().includes('referenceerror')) {
        console.log(`!!! SETVALUE/REFERENCE ERROR FOUND: ${text}`);
        if (msg.location()) {
          console.log(`    Location: ${msg.location().url}:${msg.location().lineNumber}`);
        }
      }

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
        console.log(`[ERROR] ${text}`);
        if (msg.location()) {
          console.log(`  Location: ${msg.location().url}:${msg.location().lineNumber}`);
        }
      } else if (type === 'warning') {
        warnings.push({
          text: text,
          location: msg.location()
        });
        console.log(`[WARNING] ${text}`);
      } else if (type === 'log') {
        console.log(`[LOG] ${text}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
      errors.push({
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
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

    // Listen for responses with errors
    page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        console.log(`[HTTP ERROR] ${response.url()} - ${status}`);
        errors.push({
          text: `HTTP ${status}: ${response.url()}`,
          status: status,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Use incognito-like context (fresh browser context)
    console.log('\n========================================');
    console.log('Starting Fisioterapeuta Login Test');
    console.log('========================================\n');

    console.log('\n========================================');
    console.log('STEP 1: Navigating to fisioflow-migration.web.app');
    console.log('========================================\n');

    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Page loaded. Waiting for initial JavaScript to execute...');
    await page.waitForTimeout(5000);

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/fisio-fisioterapeuta-initial.png', fullPage: true });
    console.log('Screenshot saved: /tmp/fisio-fisioterapeuta-initial.png');

    console.log('\n========================================');
    console.log('STEP 2: Checking for login form...');
    console.log('========================================\n');

    const emailLocator = page.locator('input[type="email"], input[name="email"]').first();
    const passwordLocator = page.locator('input[type="password"]').first();

    const hasEmailInput = await emailLocator.count() > 0;
    const hasPasswordInput = await passwordLocator.count() > 0;

    console.log(`Email input found: ${hasEmailInput}`);
    console.log(`Password input found: ${hasPasswordInput}`);

    console.log('\n========================================');
    console.log('STEP 3: Logging in...');
    console.log('========================================\n');
    console.log(`Email: ${testUsers.fisio.email}`);
    console.log('Password: ***');

    await emailLocator.fill(testUsers.fisio.email);
    console.log('Filled email field');

    await passwordLocator.fill(testUsers.fisio.password);
    console.log('Filled password field');

    // Screenshot before login
    await page.screenshot({ path: '/tmp/fisio-fisioterapeuta-before-login.png', fullPage: true });
    console.log('Screenshot saved: /tmp/fisio-fisioterapeuta-before-login.png');

    // Find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Entrar")',
      'button:has-text("Login")',
      'button:has-text("Sign")',
      'button:has-text("Logar")',
      'button:has-text("Acessar")',
      'input[type="submit"]'
    ];

    let buttonClicked = false;
    for (const selector of submitSelectors) {
      try {
        const submitButton = page.locator(selector).first();
        if (await submitButton.count() > 0 && await submitButton.isVisible()) {
          await submitButton.click();
          console.log(`Clicked submit button using selector: ${selector}`);
          buttonClicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!buttonClicked) {
      console.log('No submit button found, trying Enter key...');
      await page.keyboard.press('Enter');
    }

    console.log('\n========================================');
    console.log('STEP 4: Waiting for login to complete...');
    console.log('========================================\n');

    // Wait for navigation with a longer timeout
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      console.log('Navigation detected');
    } catch (e) {
      console.log('No navigation within timeout - this might be normal for SPA login');
    }

    // Wait extensively for any deferred JavaScript execution
    console.log('Waiting 15 seconds for all JavaScript to execute and errors to appear...');
    await page.waitForTimeout(15000);

    // Take screenshot after login
    await page.screenshot({ path: '/tmp/fisio-fisioterapeuta-after-login.png', fullPage: true });
    console.log('Screenshot saved: /tmp/fisio-fisioterapeuta-after-login.png');

    console.log('\n========================================');
    console.log('STEP 5: Additional wait for deferred errors...');
    console.log('========================================\n');

    // Wait even more - some errors might be triggered by timers or user interactions
    console.log('Waiting another 10 seconds...');
    await page.waitForTimeout(10000);

    // Try to trigger interactions that might reveal setValue errors
    console.log('\n========================================');
    console.log('STEP 6: Testing UI interactions that might trigger setValue errors...');
    console.log('========================================\n');

    // Click on different menu items to trigger lazy-loaded components
    const menuSelectors = [
      'a:has-text("Agenda")',
      'button:has-text("Agenda")',
      'a:has-text("Pacientes")',
      'button:has-text("Pacientes")',
      'a:has-text("Dashboard")',
      '[data-testid="agenda"]',
      '[href*="/agenda"]',
      '[href*="/pacientes"]'
    ];

    for (const selector of menuSelectors) {
      try {
        const menuBtn = page.locator(selector).first();
        if (await menuBtn.count() > 0 && await menuBtn.isVisible()) {
          console.log(`Clicking menu item: ${selector}`);
          await menuBtn.click();
          await page.waitForTimeout(5000); // Wait for any errors to appear
          break; // Only click one menu item
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Final screenshot
    await page.screenshot({ path: '/tmp/fisio-fisioterapeuta-final.png', fullPage: true });
    console.log('Final screenshot saved: /tmp/fisio-fisioterapeuta-final.png');

    // Get final page state
    const title = await page.title();
    const url = page.url();

    console.log('\n========================================');
    console.log('FINAL PAGE STATE');
    console.log('========================================');
    console.log(`Title: ${title}`);
    console.log(`URL: ${url}`);

    console.log('\n========================================');
    console.log('ERRORS AND WARNINGS SUMMARY');
    console.log('========================================\n');

    // Look specifically for setValue errors
    const setValueErrors = errors.filter(e =>
      e.text && (
        e.text.toLowerCase().includes('setvalue') ||
        e.text.toLowerCase().includes('referenceerror') ||
        e.text.toLowerCase().includes('initialization')
      )
    );

    // Categorize other errors
    const cspErrors = errors.filter(e =>
      e.text && (e.text.includes('Content Security Policy') || e.text.includes('CSP'))
    );
    const corsErrors = errors.filter(e =>
      e.text && (e.text.includes('CORS') || e.text.includes('Cross-Origin'))
    );

    console.log(`\nTotal Console Messages: ${consoleMessages.length}`);
    console.log(`Total Errors: ${errors.length}`);
    console.log(`Total Warnings: ${warnings.length}`);
    console.log(`setValue/Reference Errors: ${setValueErrors.length}`);
    console.log(`CSP Errors: ${cspErrors.length}`);
    console.log(`CORS Errors: ${corsErrors.length}`);

    if (setValueErrors.length > 0) {
      console.log('\n!!! SETVALUE/REFERENCE ERRORS FOUND !!!');
      setValueErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
        if (err.location) {
          console.log(`    Location: ${err.location.url}:${err.location.lineNumber}`);
        }
        if (err.stack) {
          console.log(`    Stack: ${err.stack}`);
        }
      });
    }

    if (errors.length > 0) {
      console.log('\n--- ALL ERRORS ---');
      errors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text || err}`);
        if (err.location) {
          console.log(`    Location: ${err.location.url}:${err.location.lineNumber}`);
        }
        if (err.errorText) {
          console.log(`    Details: ${err.errorText}`);
        }
      });
    }

    if (warnings.length > 0) {
      console.log('\n--- ALL WARNINGS ---');
      warnings.forEach((warn, idx) => {
        console.log(`\n[${idx + 1}] ${warn.text}`);
        if (warn.location) {
          console.log(`    Location: ${warn.location.url}:${warn.location.lineNumber}`);
        }
      });
    }

    // Save detailed results
    const results = {
      timestamp: new Date().toISOString(),
      test: 'Fisioterapeuta Login - setValue Error Check',
      credentials: {
        email: testUsers.fisio.email,
        role: 'professional'
      },
      finalUrl: url,
      pageTitle: title,
      totalConsoleMessages: consoleMessages.length,
      consoleMessages: consoleMessages,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      setValueErrors: setValueErrors.length,
      cspErrors: cspErrors.length,
      corsErrors: corsErrors.length,
      errors: errors,
      warnings: warnings,
      setValueErrorsList: setValueErrors,
      cspErrorsList: cspErrors,
      corsErrorsList: corsErrors,
      setValueErrorDetected: setValueErrors.length > 0
    };

    fs.writeFileSync(
      '/tmp/fisio-fisioterapeuta-setvalue-check.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nDetailed results saved to /tmp/fisio-fisioterapeuta-setvalue-check.json');

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================');

    if (setValueErrors.length > 0) {
      console.log('\n!!! CRITICAL: setValue/ReferenceError detected !!!');
    } else {
      console.log('\nNo setValue errors detected during login.');
    }

    // Don't fail the test - we're just checking
    // expect(setValueErrors.length).toBe(0);
  });
});
