import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Recepcionista SetValue Error - Deep Check', () => {
  test.setTimeout(120000);

  test('detailed check for setValue error on page load and after login attempt', async ({ page }) => {
    const allConsoleMessages: any[] = [];
    const setValueErrors: any[] = [];
    const initializationErrors: any[] = [];

    // Capture ALL console messages with detailed info
    page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      const messageObj = {
        type,
        text,
        location: msg.location(),
        timestamp: new Date().toISOString()
      };

      allConsoleMessages.push(messageObj);

      // Check for setValue-related errors
      if (type === 'error') {
        const isSetValueError = text.includes('setValue') ||
                               text.includes('Cannot access') ||
                               text.includes('before initialization') ||
                               text.includes('ReferenceError') ||
                               text.includes('let');

        if (isSetValueError) {
          setValueErrors.push(messageObj);
          console.log(`\n🔴 [SETVALUE/INIT ERROR DETECTED]`);
          console.log(`   Message: ${text}`);
          if (msg.location()) {
            console.log(`   Location: ${msg.location().url}:${msg.location().lineNumber}`);
          }
        } else {
          console.log(`[ERROR] ${text}`);
        }
      } else if (type === 'warning') {
        console.log(`[WARNING] ${text}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      const errorMsg = error.message;
      const errorObj = {
        message: errorMsg,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };

      console.log(`\n🔴 [PAGE ERROR] ${errorMsg}`);

      if (errorMsg.includes('setValue') ||
          errorMsg.includes('Cannot access') ||
          errorMsg.includes('before initialization') ||
          errorMsg.includes('ReferenceError')) {
        setValueErrors.push(errorObj);
        initializationErrors.push(errorObj);
      }
    });

    console.log('\n========================================');
    console.log('STEP 1: Navigating to production site');
    console.log('========================================\n');

    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('✓ Page loaded');
    console.log('Waiting 5 seconds to capture any initialization errors...');

    // Wait for initial scripts to execute
    await page.waitForTimeout(5000);

    // Check console so far
    console.log(`\nConsole messages captured on initial load: ${allConsoleMessages.length}`);

    // Take screenshot of initial state
    await page.screenshot({ path: '/tmp/setvalue-initial-load.png', fullPage: true });

    console.log('\n========================================');
    console.log('STEP 2: Checking page source for setValue references');
    console.log('========================================\n');

    const pageContent = await page.content();

    // Check if there are any inline scripts or error messages
    const hasSetValueInHTML = pageContent.includes('setValue');
    const hasReferenceError = pageContent.includes('ReferenceError');
    const hasCannotAccess = pageContent.includes('Cannot access');

    console.log(`setValue in HTML: ${hasSetValueInHTML}`);
    console.log(`ReferenceError in HTML: ${hasReferenceError}`);
    console.log(`"Cannot access" in HTML: ${hasCannotAccess}`);

    console.log('\n========================================');
    console.log('STEP 3: Looking for login form');
    console.log('========================================\n');

    const emailLocator = page.locator('input[type="email"]').first();
    const passwordLocator = page.locator('input[type="password"]').first();

    const hasEmailInput = await emailLocator.count() > 0;
    const hasPasswordInput = await passwordLocator.count() > 0;

    console.log(`Email input found: ${hasEmailInput}`);
    console.log(`Password input found: ${hasPasswordInput}`);

    if (hasEmailInput && hasPasswordInput) {
      console.log('\n========================================');
      console.log('STEP 4: Filling credentials and monitoring console');
      console.log('========================================\n');

      // Clear previous console messages count to focus on login-time errors
      const messagesBeforeFill = allConsoleMessages.length;

      await emailLocator.fill('recepcionista@moocafisio.com.br');
      console.log('✓ Email filled');
      await page.waitForTimeout(500);

      await passwordLocator.fill('teste123');
      console.log('✓ Password filled');
      await page.waitForTimeout(500);

      const messagesAfterFill = allConsoleMessages.length;
      console.log(`New console messages during fill: ${messagesAfterFill - messagesBeforeFill}`);

      // Screenshot before login
      await page.screenshot({ path: '/tmp/setvalue-before-click.png', fullPage: true });

      console.log('\n========================================');
      console.log('STEP 5: Clicking login button');
      console.log('========================================\n');

      const messagesBeforeClick = allConsoleMessages.length;

      // Click submit button
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        console.log('✓ Login button clicked');
      }

      // Wait and monitor for errors
      console.log('Waiting 15 seconds for navigation and any delayed errors...');
      await page.waitForTimeout(15000);

      const messagesAfterClick = allConsoleMessages.length;
      console.log(`New console messages after click: ${messagesAfterClick - messagesBeforeClick}`);

      // Screenshot after login attempt
      await page.screenshot({ path: '/tmp/setvalue-after-click.png', fullPage: true });

      const finalUrl = page.url();
      const finalTitle = await page.title();

      console.log('\n========================================');
      console.log('FINAL STATE');
      console.log('========================================\n');
      console.log(`Final URL: ${finalUrl}`);
      console.log(`Final Title: ${finalTitle}`);
    }

    console.log('\n========================================');
    console.log('DETAILED CONSOLE ANALYSIS');
    console.log('========================================\n');

    // Categorize all messages
    const errors = allConsoleMessages.filter(m => m.type === 'error');
    const warnings = allConsoleMessages.filter(m => m.type === 'warning');
    const logs = allConsoleMessages.filter(m => m.type === 'log');

    console.log(`Total Console Messages: ${allConsoleMessages.length}`);
    console.log(`  - Errors: ${errors.length}`);
    console.log(`  - Warnings: ${warnings.length}`);
    console.log(`  - Logs: ${logs.length}`);
    console.log(`\nSetValue/Init Errors: ${setValueErrors.length}`);

    if (setValueErrors.length > 0) {
      console.log('\n🔴🔴🔴 SETVALUE/INITIALIZATION ERRORS FOUND 🔴🔴🔴\n');
      setValueErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] Type: ${err.type || 'pageerror'}`);
        console.log(`    Message: ${err.text || err.message}`);
        if (err.location) {
          console.log(`    Location: ${err.location.url}`);
          console.log(`    Line: ${err.location.lineNumber}`);
        }
        if (err.stack) {
          console.log(`    Stack: ${err.stack.substring(0, 300)}`);
        }
        console.log(`    Time: ${err.timestamp}`);
      });
    } else {
      console.log('\n✅ No setValue or initialization errors detected!');
    }

    if (errors.length > 0) {
      console.log('\n--- ALL ERROR MESSAGES ---');
      errors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
        if (err.location && err.location.url) {
          console.log(`    URL: ${err.location.url}`);
          console.log(`    Line: ${err.location.lineNumber}`);
        }
      });
    }

    // Save comprehensive results
    const results = {
      timestamp: new Date().toISOString(),
      test: 'recepcionista-setvalue-detailed-check',
      summary: {
        totalMessages: allConsoleMessages.length,
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        setValueErrors: setValueErrors.length,
        initializationErrors: initializationErrors.length
      },
      setValueErrors: setValueErrors,
      initializationErrors: initializationErrors,
      allErrors: errors,
      allWarnings: warnings,
      recentLogs: logs.slice(-20), // Last 20 log messages
      allConsoleMessages: allConsoleMessages
    };

    fs.writeFileSync(
      '/tmp/recepcionista-setvalue-detailed-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nDetailed results saved to /tmp/recepcionista-setvalue-detailed-results.json');

    // Also save just the console messages for easier inspection
    fs.writeFileSync(
      '/tmp/console-messages-dump.json',
      JSON.stringify(allConsoleMessages, null, 2)
    );
    console.log('All console messages saved to /tmp/console-messages-dump.json');

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');

    // This test should pass if there are no setValue errors
    // (we're not checking if login succeeds, just checking for the specific error)
    expect(setValueErrors.length).toBe(0);
  });
});
