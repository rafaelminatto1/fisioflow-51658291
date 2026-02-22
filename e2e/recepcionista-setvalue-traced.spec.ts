import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Recepcionista SetValue - Full Trace', () => {
  test.setTimeout(180000); // 3 minutes for thorough testing

  test('complete login flow with full console trace and stack traces', async ({ page, context }) => {
    const allErrors: any[] = [];
    const criticalErrors: any[] = [];

    // Enable more detailed error capture
    page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        const errorDetails: any = {
          text,
          location: msg.location(),
          timestamp: new Date().toISOString(),
          stackTrace: null
        };

        // Try to get stack trace
        try {
          const args = msg.args();
          for (const arg of args) {
            try {
              const jsonVal = await arg.jsonValue();
              if (jsonVal && typeof jsonVal === 'object') {
                errorDetails.details = jsonVal;
              }
            } catch (e) {}
          }
        } catch (e) {}

        // Check for specific error patterns
        const isCriticalError =
          text.includes('setValue') ||
          text.includes('Cannot access') ||
          text.includes('before initialization') ||
          text.includes('ReferenceError') ||
          text.includes('TDZ') ||
          text.includes('temporal dead zone');

        if (isCriticalError) {
          criticalErrors.push(errorDetails);
          console.log('\n🚨 [CRITICAL ERROR DETECTED]');
          console.log(`   Message: ${text}`);
          if (msg.location()) {
            console.log(`   URL: ${msg.location().url}`);
            console.log(`   Line: ${msg.location().lineNumber}:${msg.location().columnNumber}`);
          }
        }

        allErrors.push(errorDetails);
      }
    });

    // Capture page errors with full stack
    page.on('pageerror', error => {
      const errorObj = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };

      console.log(`\n🚨 [PAGE ERROR] ${error.name}: ${error.message}`);

      const isCritical =
        error.message.includes('setValue') ||
        error.message.includes('Cannot access') ||
        error.message.includes('before initialization') ||
        error.message.includes('ReferenceError');

      if (isCritical) {
        criticalErrors.push(errorObj);
      }

      allErrors.push(errorObj);
    });

    // Also capture response errors
    page.on('response', response => {
      if (response.status() >= 400) {
        allErrors.push({
          type: 'http_error',
          url: response.url(),
          status: response.status(),
          statusText: response.status().toString(),
          timestamp: new Date().toISOString()
        });
      }
    });

    console.log('\n========================================');
    console.log('STEP 1: Navigate to production');
    console.log('========================================\n');

    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('✓ Page loaded');
    console.log('Waiting 5 seconds for initialization...');

    await page.waitForTimeout(5000);

    const errorsAfterLoad = allErrors.length;
    console.log(`Errors after page load: ${errorsAfterLoad}`);

    // Capture page content for analysis
    const content = await page.content();
    const scriptTags = content.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    console.log(`Found ${scriptTags.length} script tags`);

    // Check for inline scripts that might have setValue issues
    let hasInlineSetValueIssues = false;
    scriptTags.forEach((script, idx) => {
      if (script.includes('setValue') &&
          (script.includes('const setValue') || script.includes('let setValue'))) {
        hasInlineSetValueIssues = true;
        console.log(`⚠️  Script tag ${idx} contains setValue declaration`);
      }
    });

    console.log('\n========================================');
    console.log('STEP 2: Login attempt');
    console.log('========================================\n');

    // Try to find and fill the form
    const emailInput = page.locator('input[name="email"]').first();
    const passwordInput = page.locator('input[name="password"]').first();

    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      console.log('Found login form');

      await emailInput.fill('recepcionista@moocafisio.com.br');
      await page.waitForTimeout(300);
      await passwordInput.fill('teste123');
      await page.waitForTimeout(300);

      const errorsBeforeSubmit = allErrors.length;

      // Try clicking submit
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        console.log('✓ Submit clicked');
      }

      // Wait for any response
      console.log('Waiting 10 seconds for response...');
      await page.waitForTimeout(10000);

      const errorsAfterSubmit = allErrors.length;
      console.log(`Errors during/after submit: ${errorsAfterSubmit - errorsBeforeSubmit}`);

      // Check if we navigated away
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);

      // If still on login page, check for error messages
      if (currentUrl.includes('/login')) {
        const errorMessages = await page.locator('.error, .error-message, [role="alert"]').allTextContents();
        if (errorMessages.length > 0) {
          console.log('\nError messages on page:');
          errorMessages.forEach(msg => console.log(`  - ${msg}`));
        }
      }
    }

    console.log('\n========================================');
    console.log('STEP 3: Final analysis');
    console.log('========================================\n');

    // Try navigating to dashboard directly if possible
    console.log('Attempting to navigate to dashboard...');
    try {
      await page.goto('https://fisioflow-migration.web.app/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      await page.waitForTimeout(5000);
      console.log('✓ Navigated to dashboard (or attempted)');

      // Take screenshot
      await page.screenshot({ path: '/tmp/setvalue-dashboard-screenshot.png', fullPage: true });
    } catch (e) {
      console.log('Could not navigate to dashboard');
    }

    // Final console check
    console.log('Waiting 5 more seconds for any delayed errors...');
    await page.waitForTimeout(5000);

    console.log('\n========================================');
    console.log('RESULTS');
    console.log('========================================\n');

    console.log(`Total Errors Captured: ${allErrors.length}`);
    console.log(`Critical setValue/Init Errors: ${criticalErrors.length}`);

    // Categorize errors
    const httpErrors = allErrors.filter(e => e.type === 'http_error');
    const consoleErrors = allErrors.filter(e => !e.type && e.text);
    const pageErrors = allErrors.filter(e => e.name);

    console.log(`  - HTTP Errors: ${httpErrors.length}`);
    console.log(`  - Console Errors: ${consoleErrors.length}`);
    console.log(`  - Page Errors: ${pageErrors.length}`);

    if (criticalErrors.length > 0) {
      console.log('\n🚨🚨🚨 CRITICAL ERRORS FOUND 🚨🚨🚨\n');
      criticalErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.name || 'Error'}`);
        console.log(`  Message: ${err.message || err.text}`);
        if (err.location) {
          console.log(`  Location: ${err.location.url}:${err.location.lineNumber}`);
        }
        if (err.stack) {
          console.log(`  Stack: ${err.stack.substring(0, 400)}`);
        }
      });
    } else {
      console.log('\n✅ No critical setValue or initialization errors found!');
    }

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: allErrors.length,
        criticalErrors: criticalErrors.length,
        httpErrors: httpErrors.length,
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length
      },
      criticalErrors,
      allErrors,
      hasInlineSetValueIssues
    };

    fs.writeFileSync(
      '/tmp/setvalue-full-trace-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nFull results saved to /tmp/setvalue-full-trace-results.json');

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');

    // The test passes if no critical errors were found
    expect(criticalErrors.length).toBe(0);
  });
});
