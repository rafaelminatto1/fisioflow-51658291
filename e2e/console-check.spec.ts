import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Fisioflow Console Error Check', () => {
  test.setTimeout(120000); // Extend timeout to 2 minutes

  test('check for console errors on fisioflow-migration.web.app', async ({ page }) => {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Listen for console messages
    page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        const errorObj: any = {
          text: text,
          location: msg.location()
        };
        try {
          errorObj.args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        } catch (e) {
          // Ignore args that can't be serialized
        }
        errors.push(errorObj);
        console.log(`[ERROR FOUND] ${text}`);
        if (msg.location()) {
          console.log(`  Location: ${msg.location().url}:${msg.location().lineNumber}`);
        }
      } else if (type === 'warning') {
        warnings.push({
          text: text,
          location: msg.location()
        });
        console.log(`[WARNING] ${text}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
      errors.push({
        text: error.message,
        stack: error.stack
      });
    });

    // Listen for request failures
    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure) {
        console.log(`[REQUEST FAILED] ${request.url()} - ${failure.errorText}`);
        errors.push({
          text: `Request failed: ${request.url()}`,
          errorText: failure.errorText
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
          status: status
        });
      }
    });

    console.log('\n========================================');
    console.log('STEP 1: Navigating to fisioflow-migration.web.app');
    console.log('========================================\n');

    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('\n========================================');
    console.log('STEP 2: Waiting for page to fully load...');
    console.log('========================================\n');

    // Wait additional time for any async operations
    await page.waitForTimeout(5000);

    // Take a screenshot
    await page.screenshot({ path: '/tmp/fisioflow-screenshot.png', fullPage: true });
    console.log('Screenshot saved to /tmp/fisioflow-screenshot.png');

    // Check if there's a login form
    console.log('\n========================================');
    console.log('STEP 3: Checking for login form...');
    console.log('========================================\n');

    const emailLocator = page.locator('input[type="email"], input[name="email"]').first();
    const passwordLocator = page.locator('input[type="password"]').first();

    const hasEmailInput = await emailLocator.count() > 0;
    const hasPasswordInput = await passwordLocator.count() > 0;

    console.log(`Email input found: ${hasEmailInput}`);
    console.log(`Password input found: ${hasPasswordInput}`);

    if (hasEmailInput && hasPasswordInput) {
      console.log('\n========================================');
      console.log('STEP 4: Attempting login...');
      console.log('========================================\n');

      await emailLocator.fill('teste@moocafisio.com.br');
      console.log('Filled email field');

      await passwordLocator.fill('Yukari3030@');
      console.log('Filled password field');

      // Try to find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Entrar")',
        'button:has-text("Login")',
        'button:has-text("Sign")',
        'button:has-text("Logar")',
        'button:has-text("Acessar")',
        'input[type="submit"]',
        '.login-button',
        '.submit-button'
      ];

      for (const selector of submitSelectors) {
        try {
          const submitButton = page.locator(selector).first();
          if (await submitButton.count() > 0 && await submitButton.isVisible()) {
            await submitButton.click();
            console.log(`Clicked submit button using selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      console.log('Login form filled. Waiting for navigation...');

      // Wait for navigation or timeout
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
        console.log('Navigation occurred after login attempt');
      } catch (e) {
        console.log('No navigation detected within timeout - login might have failed or page updated via AJAX');
      }

      // Wait for page to settle
      await page.waitForTimeout(5000);

      // Take another screenshot after login
      await page.screenshot({ path: '/tmp/fisioflow-after-login.png', fullPage: true });
      console.log('After-login screenshot saved to /tmp/fisioflow-after-login.png');
    } else {
      console.log('No standard login form detected. Page might already be loaded or using a different auth method.');
    }

    // Get page title and URL
    const title = await page.title();
    const url = page.url();

    console.log('\n========================================');
    console.log('FINAL PAGE STATE');
    console.log('========================================');
    console.log(`Title: ${title}`);
    console.log(`URL: ${url}`);

    // Final summary
    console.log('\n========================================');
    console.log('ERRORS AND WARNINGS SUMMARY');
    console.log('========================================\n');

    // Categorize errors
    const cspErrors = errors.filter(e =>
      e.text && (e.text.includes('Content Security Policy') || e.text.includes('CSP'))
    );
    const corsErrors = errors.filter(e =>
      e.text && (e.text.includes('CORS') || e.text.includes('Cross-Origin'))
    );
    const ablyErrors = errors.filter(e =>
      e.text && (e.text.toLowerCase().includes('ably') || e.text.toLowerCase().includes('realtime'))
    );

    console.log(`\nTotal Errors: ${errors.length}`);
    console.log(`Total Warnings: ${warnings.length}`);
    console.log(`CSP Errors: ${cspErrors.length}`);
    console.log(`CORS Errors: ${corsErrors.length}`);
    console.log(`Ably/Realtime Errors: ${ablyErrors.length}`);

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
        if (err.stack) {
          console.log(`    Stack: ${err.stack}`);
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

    if (cspErrors.length > 0) {
      console.log('\n--- CSP ERRORS (Content Security Policy) ---');
      cspErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
      });
    }

    if (corsErrors.length > 0) {
      console.log('\n--- CORS ERRORS ---');
      corsErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
      });
    }

    if (ablyErrors.length > 0) {
      console.log('\n--- ABLY/REALTIME ERRORS ---');
      ablyErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
      });
    }

    // Save results to file
    const results = {
      timestamp: new Date().toISOString(),
      finalUrl: url,
      pageTitle: title,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      cspErrors: cspErrors.length,
      corsErrors: corsErrors.length,
      ablyErrors: ablyErrors.length,
      errors: errors,
      warnings: warnings,
      cspErrorsList: cspErrors,
      corsErrorsList: corsErrors,
      ablyErrorsList: ablyErrors
    };

    fs.writeFileSync(
      '/tmp/fisioflow-console-errors.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nResults saved to /tmp/fisioflow-console-errors.json');

    // Log results for Playwright report
    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================');
  });
});
