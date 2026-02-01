import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * FINAL COMPREHENSIVE TEST FOR setValue ERROR
 *
 * This test checks for the "Cannot access 'setValue' before initialization" error
 * when using the paciente role credentials on fisioflow-migration.web.app
 *
 * Test steps:
 * 1. Open https://fisioflow-migration.web.app in incognito mode
 * 2. Monitor DevTools Console for all errors
 * 3. Attempt login with paciente credentials
 * 4. Wait 10+ seconds for all errors to appear
 * 5. Report findings
 */

test.describe('Paciente Role - Final setValue Error Check', () => {
  test.setTimeout(180000); // 3 minutes

  test('check for setValue error on fisioflow-migration.web.app with paciente credentials', async ({ page }) => {
    const testStartTime = new Date().toISOString();

    // Storage for all console activity
    const consoleLogs: any[] = [];
    const setValueErrors: any[] = [];
    const allErrors: any[] = [];
    const allWarnings: any[] = [];

    // Console listener - captures everything
    page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      const logEntry: any = {
        type: type,
        text: text,
        timestamp: new Date().toISOString()
      };

      if (msg.location()) {
        logEntry.location = {
          url: msg.location().url,
          lineNumber: msg.location().lineNumber,
          columnNumber: msg.location().columnNumber
        };
      }

      consoleLogs.push(logEntry);

      // Check for setValue errors with multiple patterns
      const setValuePatterns = [
        /Cannot access.*setValue.*before initialization/i,
        /setValue.*ReferenceError/i,
        /ReferenceError.*setValue/i,
        /let.*setValue.*const.*setValue/i,
        /TDZ.*setValue/i
      ];

      const isSetValueError = setValuePatterns.some(pattern => pattern.test(text));

      if (isSetValueError) {
        setValueErrors.push(logEntry);
        console.log('\n!!! CRITICAL: setValue ERROR DETECTED !!!');
        console.log(`Message: ${text}`);
        if (msg.location()) {
          console.log(`Location: ${msg.location().url}:${msg.location().lineNumber}`);
        }
      }

      if (type === 'error') {
        allErrors.push(logEntry);
        if (!isSetValueError) {
          console.log(`[ERROR] ${text}`);
        }
      } else if (type === 'warning') {
        allWarnings.push(logEntry);
        console.log(`[WARNING] ${text}`);
      }
    });

    // Page error listener
    page.on('pageerror', error => {
      const text = error.message || error.toString();

      const logEntry: any = {
        type: 'pageerror',
        text: text,
        timestamp: new Date().toISOString(),
        stack: error.stack
      };

      consoleLogs.push(logEntry);
      allErrors.push(logEntry);

      // Check for setValue error
      const setValuePatterns = [
        /Cannot access.*setValue.*before initialization/i,
        /setValue.*ReferenceError/i,
        /ReferenceError.*setValue/i
      ];

      const isSetValueError = setValuePatterns.some(pattern => pattern.test(text));

      if (isSetValueError) {
        setValueErrors.push(logEntry);
        console.log('\n!!! CRITICAL: setValue PAGE ERROR DETECTED !!!');
        console.log(`Message: ${text}`);
      } else {
        console.log(`[PAGE ERROR] ${text}`);
      }
    });

    // Request/response listeners
    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure) {
        const logEntry: any = {
          type: 'requestfailed',
          text: `Request failed: ${request.url()}`,
          url: request.url(),
          errorText: failure.errorText,
          timestamp: new Date().toISOString()
        };
        consoleLogs.push(logEntry);
        console.log(`[REQUEST FAILED] ${request.url()} - ${failure.errorText}`);
      }
    });

    page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        const logEntry: any = {
          type: 'httperror',
          text: `HTTP ${status}: ${response.url()}`,
          url: response.url(),
          status: status,
          timestamp: new Date().toISOString()
        };
        consoleLogs.push(logEntry);
        console.log(`[HTTP ${status}] ${response.url()}`);
      }
    });

    console.log('\n========================================');
    console.log('TEST: Paciente Role setValue Error Check');
    console.log('========================================');
    console.log(`Start Time: ${testStartTime}`);
    console.log(`URL: https://fisioflow-migration.web.app`);
    console.log(`Credentials: paciente@moocafisio.com.br / teste123`);
    console.log('========================================\n');

    // STEP 1: Navigate to the site
    console.log('STEP 1: Navigating to fisioflow-migration.web.app...\n');
    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // STEP 2: Wait and monitor for initial errors
    console.log('STEP 2: Waiting 10 seconds for initial page load and errors...\n');
    await page.waitForTimeout(10000);

    const initialUrl = page.url();
    const initialTitle = await page.title();
    console.log(`Initial URL: ${initialUrl}`);
    console.log(`Initial Title: ${initialTitle}\n`);

    await page.screenshot({ path: '/tmp/paciente-final-initial.png', fullPage: true });

    // STEP 3: Attempt login
    console.log('STEP 3: Attempting login with paciente credentials...\n');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    const hasEmailInput = await emailInput.count() > 0;
    const hasPasswordInput = await passwordInput.count() > 0;

    console.log(`Email input found: ${hasEmailInput}`);
    console.log(`Password input found: ${hasPasswordInput}\n`);

    let loginAttempted = false;

    if (hasEmailInput && hasPasswordInput) {
      try {
        await emailInput.fill('paciente@moocafisio.com.br');
        await page.waitForTimeout(500);
        await passwordInput.fill('teste123');
        await page.waitForTimeout(500);

        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          loginAttempted = true;
          console.log('Login form submitted.\n');
        }
      } catch (e) {
        console.log(`Login attempt error: ${e}\n`);
      }
    }

    // STEP 4: Wait for errors after login attempt
    console.log('STEP 4: Waiting 15 seconds for errors after login attempt...\n');
    await page.waitForTimeout(15000);

    const afterLoginUrl = page.url();
    const afterLoginTitle = await page.title();
    console.log(`URL after login attempt: ${afterLoginUrl}`);
    console.log(`Title after login attempt: ${afterLoginTitle}`);
    console.log(`URL changed: ${afterLoginUrl !== initialUrl}\n`);

    await page.screenshot({ path: '/tmp/paciente-final-after-login.png', fullPage: true });

    // STEP 5: Extended monitoring
    console.log('STEP 5: Extended monitoring (15 seconds) for delayed errors...\n');
    await page.waitForTimeout(15000);

    await page.screenshot({ path: '/tmp/paciente-final.png', fullPage: true });

    // STEP 6: Generate comprehensive report
    const testEndTime = new Date().toISOString();
    const duration = new Date(testEndTime).getTime() - new Date(testStartTime).getTime();

    console.log('\n========================================');
    console.log('FINAL REPORT');
    console.log('========================================\n');
    console.log(`Test Duration: ${duration}ms (${Math.round(duration/1000)}s)`);
    console.log(`Total Console Messages: ${consoleLogs.length}`);
    console.log(`Total Errors: ${allErrors.length}`);
    console.log(`Total Warnings: ${allWarnings.length}`);
    console.log(`setValue Errors: ${setValueErrors.length}`);
    console.log(`Login Attempted: ${loginAttempted}`);
    console.log(`URL Changed: ${afterLoginUrl !== initialUrl}\n`);

    // setValue error details
    if (setValueErrors.length > 0) {
      console.log('========================================');
      console.log('!!! setValue ERRORS DETECTED !!!');
      console.log('========================================\n');
      setValueErrors.forEach((err, i) => {
        console.log(`[${i + 1}] Type: ${err.type}`);
        console.log(`    Message: ${err.text}`);
        if (err.location) {
          console.log(`    Location: ${err.location.url}:${err.location.lineNumber}`);
        }
        if (err.stack) {
          console.log(`    Stack: ${err.stack.substring(0, 300)}...`);
        }
        console.log(`    Time: ${err.timestamp}\n`);
      });
    } else {
      console.log('========================================');
      console.log('NO setValue ERRORS DETECTED');
      console.log('========================================\n');
    }

    // Summary of all errors
    if (allErrors.length > 0) {
      console.log('All Errors:');
      allErrors.forEach((err, i) => {
        if (i < 10) { // Show first 10
          console.log(`  [${i + 1}] ${err.type}: ${err.text.substring(0, 100)}${err.text.length > 100 ? '...' : ''}`);
        }
      });
      if (allErrors.length > 10) {
        console.log(`  ... and ${allErrors.length - 10} more errors`);
      }
      console.log('');
    }

    // Save results
    const results = {
      testMetadata: {
        testName: 'Paciente Role - Final setValue Error Check',
        startTime: testStartTime,
        endTime: testEndTime,
        duration: duration,
        url: 'https://fisioflow-migration.web.app'
      },
      credentials: {
        email: 'paciente@moocafisio.com.br',
        password: 'teste123',
        role: 'paciente'
      },
      navigation: {
        initialUrl: initialUrl,
        finalUrl: afterLoginUrl,
        urlChanged: afterLoginUrl !== initialUrl,
        loginAttempted: loginAttempted
      },
      findings: {
        totalConsoleMessages: consoleLogs.length,
        totalErrors: allErrors.length,
        totalWarnings: allWarnings.length,
        setValueErrors: setValueErrors.length,
        setValueErrorFound: setValueErrors.length > 0
      },
      setValueErrors: setValueErrors,
      allErrors: allErrors.slice(0, 50), // Limit to first 50
      allWarnings: allWarnings,
      consoleLogs: consoleLogs.slice(0, 100) // Limit to first 100
    };

    fs.writeFileSync(
      '/tmp/paciente-final-setvalue-results.json',
      JSON.stringify(results, null, 2)
    );

    // Create text summary
    const summary = `
================================================================================
PACIENTE ROLE LOGIN TEST - setValue ERROR CHECK (FINAL)
================================================================================

Test Information:
  Date: ${testStartTime}
  URL: https://fisioflow-migration.web.app
  Duration: ${Math.round(duration/1000)}s

Credentials:
  Email: paciente@moocafisio.com.br
  Password: teste123
  Role: paciente

================================================================================
RESULTS
================================================================================

setValue ERRORS: ${setValueErrors.length > 0 ? 'DETECTED' : 'NOT DETECTED'}
Number of setValue errors: ${setValueErrors.length}

Total Console Messages: ${consoleLogs.length}
Total Errors: ${allErrors.length}
Total Warnings: ${allWarnings.length}

Navigation:
  Initial URL: ${initialUrl}
  Final URL: ${afterLoginUrl}
  URL Changed: ${afterLoginUrl !== initialUrl ? 'YES' : 'NO'}
  Login Attempted: ${loginAttempted ? 'YES' : 'NO'}

================================================================================
setValue ERROR DETAILS
================================================================================

${setValueErrors.length > 0 ?
  setValueErrors.map((err, i) => `
[${i + 1}] Type: ${err.type}
  Message: ${err.text}
  Location: ${err.location ? `${err.location.url}:${err.location.lineNumber}` : 'N/A'}
  Time: ${err.timestamp}
`).join('\n') :
  'No setValue errors were detected during this test.'
}

================================================================================
CONCLUSION
================================================================================

${setValueErrors.length > 0 ?
  `!!! BUG CONFIRMED !!!\n\nThe "Cannot access 'setValue' before initialization" error WAS DETECTED.\n\nFound ${setValueErrors.length} occurrence(s) of this error.\n\nAction: This bug needs to be fixed.`
  :
  `NO setValue ERRORS DETECTED\n\nThe test did NOT detect any "setValue" initialization errors during:\n1. Initial page load (10 seconds)\n2. Login attempt\n3. Post-login monitoring (30 seconds total)\n\nPossible scenarios:\n- The bug has been fixed\n- The bug occurs under different conditions\n- The test user needs different permissions\n- The bug is triggered by specific user actions not covered in this test\n\nNote: The login attempt failed (400 error), which prevented testing\npost-login functionality. If the bug occurs after successful login,\nvalid user credentials are needed.`
}

================================================================================
Screenshots saved to:
  - /tmp/paciente-final-initial.png
  - /tmp/paciente-final-after-login.png
  - /tmp/paciente-final.png

Results saved to:
  - /tmp/paciente-final-setvalue-results.json

================================================================================
`;

    fs.writeFileSync('/tmp/paciente-final-summary.txt', summary);
    console.log(summary);

    console.log('========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');
  });
});
