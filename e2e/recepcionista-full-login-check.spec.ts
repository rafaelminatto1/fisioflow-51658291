import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Recepcionista Full Login - SetValue Comprehensive Check', () => {
  test.setTimeout(180000);

  test('complete login with valid credentials and monitor for setValue errors', async ({ page }) => {
    const allConsoleMessages: any[] = [];
    const setValueErrors: any[] = [];
    const initializationErrors: any[] = [];

    // Comprehensive console monitoring
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

      if (type === 'error') {
        // Check for any setValue-related or initialization errors
        const isSetValueError =
          text.toLowerCase().includes('setvalue') ||
          text.toLowerCase().includes('cannot access') ||
          text.toLowerCase().includes('before initialization') ||
          text.toLowerCase().includes('referenceerror') ||
          text.toLowerCase().includes('tdz') ||
          text.toLowerCase().includes('temporal dead zone') ||
          text.toLowerCase().includes('is not defined') ||
          (text.toLowerCase().includes('setvalue') && text.toLowerCase().includes('let'));

        if (isSetValueError) {
          setValueErrors.push(messageObj);
          console.log('\n🔴 [SETVALUE ERROR DETECTED]');
          console.log(`   Message: ${text}`);
          if (msg.location()) {
            console.log(`   Location: ${msg.location().url}:${msg.location().lineNumber}`);
          }
        } else {
          console.log(`[ERROR] ${text}`);
        }
      }
    });

    // Page errors
    page.on('pageerror', error => {
      const errorMsg = error.message;
      console.log(`\n🔴 [PAGE ERROR] ${errorMsg}`);

      if (errorMsg.toLowerCase().includes('setvalue') ||
          errorMsg.toLowerCase().includes('cannot access') ||
          errorMsg.toLowerCase().includes('before initialization')) {
        setValueErrors.push({
          type: 'pageerror',
          message: errorMsg,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      }
    });

    console.log('\n========================================');
    console.log('STEP 1: Navigate to production site');
    console.log('========================================\n');

    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('✓ Page loaded');
    await page.waitForTimeout(3000);

    const errorsAfterLoad = allConsoleMessages.filter(m => m.type === 'error').length;
    console.log(`Errors on initial load: ${errorsAfterLoad}`);

    console.log('\n========================================');
    console.log('STEP 2: Login with valid credentials');
    console.log('========================================\n');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      // Use valid test credentials from fixtures
      await emailInput.fill('rafael.minatto@yahoo.com.br');
      console.log('✓ Email filled');
      await page.waitForTimeout(300);

      await passwordInput.fill('Yukari30@');
      console.log('✓ Password filled');
      await page.waitForTimeout(300);

      const errorsBeforeLogin = allConsoleMessages.filter(m => m.type === 'error').length;

      // Submit login
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      console.log('✓ Login button clicked');

      console.log('Waiting for navigation...');
      try {
        await page.waitForNavigation({
          waitUntil: 'networkidle',
          timeout: 15000
        });
        console.log('✓ Navigation successful');
      } catch (e) {
        console.log('Note: No navigation detected or timeout');
      }

      console.log('Waiting 10 seconds for page to fully load...');
      await page.waitForTimeout(10000);

      const errorsAfterLogin = allConsoleMessages.filter(m => m.type === 'error').length;
      console.log(`New errors during/after login: ${errorsAfterLogin - errorsBeforeLogin}`);

      const finalUrl = page.url();
      const finalTitle = await page.title();

      console.log('\n========================================');
      console.log('STEP 3: Post-login analysis');
      console.log('========================================\n');
      console.log(`Final URL: ${finalUrl}`);
      console.log(`Page Title: ${finalTitle}`);

      // Check if login was successful
      const loginSuccess = !finalUrl.includes('/login') &&
                          (finalUrl.includes('/dashboard') ||
                           finalUrl.includes('/agenda') ||
                           finalUrl.includes('/patients'));

      console.log(`Login successful: ${loginSuccess}`);

      if (loginSuccess) {
        console.log('\n========================================');
        console.log('STEP 4: Navigate around to trigger potential errors');
        console.log('========================================\n');

        // Try navigating to different pages to trigger any lazy-loaded components
        const pagesToTest = [
          '/dashboard',
          '/agenda',
          '/patients'
        ];

        for (const testPath of pagesToTest) {
          console.log(`\nNavigating to ${testPath}...`);
          const errorsBeforeNav = allConsoleMessages.filter(m => m.type === 'error').length;

          try {
            await page.goto(`https://fisioflow-migration.web.app${testPath}`, {
              waitUntil: 'domcontentloaded',
              timeout: 15000
            });
            await page.waitForTimeout(5000);

            const errorsAfterNav = allConsoleMessages.filter(m => m.type === 'error').length;
            console.log(`  Errors on this page: ${errorsAfterNav - errorsBeforeNav}`);

            // Take screenshot
            await page.screenshot({
              path: `/tmp/setvalue-check-${testPath.replace('/', '-')}.png`,
              fullPage: true
            });
          } catch (e) {
            console.log(`  Could not navigate to ${testPath}: ${e.message}`);
          }
        }
      }

      // Final screenshot
      await page.screenshot({ path: '/tmp/setvalue-final-state.png', fullPage: true });
    }

    console.log('\n========================================');
    console.log('FINAL RESULTS');
    console.log('========================================\n');

    const allErrors = allConsoleMessages.filter(m => m.type === 'error');
    const allWarnings = allConsoleMessages.filter(m => m.type === 'warning');

    console.log(`Total Console Messages: ${allConsoleMessages.length}`);
    console.log(`Total Errors: ${allErrors.length}`);
    console.log(`Total Warnings: ${allWarnings.length}`);
    console.log(`SetValue/Init Errors: ${setValueErrors.length}`);

    if (setValueErrors.length > 0) {
      console.log('\n🔴🔴🔴 SETVALUE ERRORS DETECTED 🔴🔴🔴\n');
      setValueErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.type || 'console'}`);
        console.log(`  Message: ${err.text || err.message}`);
        if (err.location) {
          console.log(`  Location: ${err.location.url}:${err.location.lineNumber}`);
        }
        if (err.stack) {
          console.log(`  Stack: ${err.stack.substring(0, 200)}`);
        }
      });
    } else {
      console.log('\n✅ No setValue or initialization errors detected!');
    }

    if (allErrors.length > 0 && allErrors.length < 20) {
      console.log('\n--- ALL ERRORS ---');
      allErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
      });
    }

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      test: 'recepcionista-full-login-setvalue-check',
      summary: {
        totalMessages: allConsoleMessages.length,
        totalErrors: allErrors.length,
        totalWarnings: allWarnings.length,
        setValueErrors: setValueErrors.length
      },
      setValueErrors,
      allErrors: allErrors.slice(0, 50), // Limit to first 50
      allWarnings: allWarnings.slice(0, 50)
    };

    fs.writeFileSync(
      '/tmp/recepcionista-full-login-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nResults saved to /tmp/recepcionista-full-login-results.json');

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');

    // Test passes if no setValue errors
    expect(setValueErrors.length).toBe(0);
  });
});
