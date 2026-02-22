import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Paciente Login - setValue Error Check (Comprehensive)', () => {
  test.setTimeout(180000); // Extend timeout to 3 minutes

  test('comprehensive check for setValue error during paciente login', async ({ page, context }) => {
    const allConsoleMessages: any[] = [];
    const errors: any[] = [];
    const warnings: any[] = [];
    const setValueErrors: any[] = [];

    // Collect ALL console messages
    page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      const logEntry: any = {
        type: type,
        text: text,
        location: msg.location(),
        timestamp: new Date().toISOString()
      };

      try {
        logEntry.args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
      } catch (e) {
        // Ignore args that can't be serialized
      }

      allConsoleMessages.push(logEntry);

      // Check specifically for setValue errors
      if ((text.includes('Cannot access') || text.includes('ReferenceError')) &&
          (text.includes('setValue') || text.includes('before initialization'))) {
        setValueErrors.push(logEntry);
        console.log(`[!!! CRITICAL: setValue ERROR !!!] ${text}`);
        if (msg.location()) {
          console.log(`  Location: ${msg.location().url}:${msg.location().lineNumber}`);
        }
      }

      if (type === 'error') {
        errors.push(logEntry);
        if (!text.includes('setValue')) {
          console.log(`[ERROR] ${text}`);
        }
      } else if (type === 'warning') {
        warnings.push(logEntry);
        console.log(`[WARNING] ${text}`);
      } else if (type === 'log' || type === 'info') {
        // Log info messages too - they might contain debugging info
        if (text.length < 200) { // Only log short messages
          console.log(`[${type.toUpperCase()}] ${text}`);
        }
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      const errorMessage = error.message || error.toString();
      const logEntry: any = {
        type: 'pageerror',
        text: errorMessage,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };

      allConsoleMessages.push(logEntry);
      errors.push(logEntry);

      console.log(`[PAGE ERROR] ${errorMessage}`);

      // Check if it's a setValue error
      if ((errorMessage.includes('Cannot access') || errorMessage.includes('ReferenceError')) &&
          (errorMessage.includes('setValue') || errorMessage.includes('before initialization'))) {
        setValueErrors.push(logEntry);
      }
    });

    // Listen for request failures
    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure) {
        const logEntry: any = {
          type: 'requestfailed',
          text: `Request failed: ${request.url()}`,
          errorText: failure.errorText,
          timestamp: new Date().toISOString()
        };
        allConsoleMessages.push(logEntry);
        console.log(`[REQUEST FAILED] ${request.url()} - ${failure.errorText}`);
      }
    });

    // Listen for responses
    page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        const logEntry: any = {
          type: 'response',
          text: `HTTP ${status}: ${response.url()}`,
          status: status,
          timestamp: new Date().toISOString()
        };
        allConsoleMessages.push(logEntry);
        console.log(`[HTTP ${status}] ${response.url()}`);
      }
    });

    console.log('\n========================================');
    console.log('STEP 1: Navigating to fisioflow-migration.web.app');
    console.log('========================================\n');

    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('\n========================================');
    console.log('STEP 2: Waiting for initial page load (10 seconds)...');
    console.log('========================================\n');

    // Wait and monitor for any initial errors
    await page.waitForTimeout(10000);

    // Take screenshot before login
    await page.screenshot({ path: '/tmp/paciente-v2-before-login.png', fullPage: true });
    console.log('Screenshot saved to /tmp/paciente-v2-before-login.png');

    // Get initial page state
    const initialUrl = page.url();
    const initialTitle = await page.title();
    console.log(`\nInitial URL: ${initialUrl}`);
    console.log(`Initial Title: ${initialTitle}`);

    // Get page content to understand what we're looking at
    const pageContent = await page.content();
    const hasLoginForm = pageContent.includes('email') || pageContent.includes('password') || pageContent.includes('login') || pageContent.includes('entrar');
    console.log(`Has login form elements: ${hasLoginForm}`);

    // Try to find email and password inputs
    console.log('\n========================================');
    console.log('STEP 3: Looking for login inputs...');
    console.log('========================================\n');

    const emailInput = page.locator('input[name="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[name="password"], input[name="password"]').first();

    const hasEmailInput = await emailInput.count() > 0;
    const hasPasswordInput = await passwordInput.count() > 0;

    console.log(`Email input found: ${hasEmailInput}`);
    console.log(`Password input found: ${hasPasswordInput}`);

    if (hasEmailInput) {
      const emailVisible = await emailInput.isVisible();
      console.log(`Email input visible: ${emailVisible}`);
    }

    if (hasPasswordInput) {
      const passwordVisible = await passwordInput.isVisible();
      console.log(`Password input visible: ${passwordVisible}`);
    }

    // If we have login form, try to log in
    if (hasEmailInput && hasPasswordInput) {
      console.log('\n========================================');
      console.log('STEP 4: Attempting PACIENTE login...');
      console.log('Email: paciente@moocafisio.com.br');
      console.log('========================================\n');

      // Clear and fill email
      await emailInput.fill('');
      await page.waitForTimeout(500);
      await emailInput.fill('paciente@moocafisio.com.br');
      console.log('Filled email: paciente@moocafisio.com.br');

      // Clear and fill password
      await passwordInput.fill('');
      await page.waitForTimeout(500);
      await passwordInput.fill('teste123');
      console.log('Filled password: ********');

      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Entrar")',
        'button:has-text("Login")',
        'button:has-text("Acessar")',
        'button:has-text("Entrar")',
        'form button',
        'button.btn-primary',
        'button:has(.btn-primary)'
      ];

      let clicked = false;
      for (const selector of submitSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.count() > 0 && await button.isVisible()) {
            await button.click();
            console.log(`Clicked button with selector: ${selector}`);
            clicked = true;
            break;
          }
        } catch (e) {
          // Try next
        }
      }

      if (!clicked) {
        // Try pressing Enter
        console.log('No button found, trying Enter key...');
        await passwordInput.press('Enter');
      }

      console.log('\n========================================');
      console.log('STEP 5: Waiting for navigation/response...');
      console.log('========================================\n');

      // Wait a bit and check what happened
      await page.waitForTimeout(5000);

      // Check if URL changed
      const currentUrl = page.url();
      const urlChanged = currentUrl !== initialUrl;
      console.log(`URL changed: ${urlChanged}`);
      console.log(`Current URL: ${currentUrl}`);

      // Take screenshot after login attempt
      await page.screenshot({ path: '/tmp/paciente-v2-after-login.png', fullPage: true });
      console.log('Screenshot saved to /tmp/paciente-v2-after-login.png');
    }

    console.log('\n========================================');
    console.log('STEP 6: Extended monitoring period (20 seconds)...');
    console.log('Watching for any delayed errors including setValue errors...');
    console.log('========================================\n');

    // Extended wait to catch any delayed errors
    await page.waitForTimeout(20000);

    // Final screenshot
    await page.screenshot({ path: '/tmp/paciente-v2-final.png', fullPage: true });
    console.log('Final screenshot saved to /tmp/paciente-v2-final.png');

    // Get final state
    const finalUrl = page.url();
    const finalTitle = await page.title();
    console.log(`\nFinal URL: ${finalUrl}`);
    console.log(`Final Title: ${finalTitle}`);

    // Generate comprehensive report
    console.log('\n========================================');
    console.log('COMPREHENSIVE ERROR REPORT');
    console.log('========================================\n');

    const setValueErrorsCount = setValueErrors.length;
    const errorsCount = errors.length;
    const warningsCount = warnings.length;
    const totalMessages = allConsoleMessages.length;

    console.log(`Total Console Messages: ${totalMessages}`);
    console.log(`Total Errors: ${errorsCount}`);
    console.log(`Total Warnings: ${warningsCount}`);
    console.log(`setValue/Initialization Errors: ${setValueErrorsCount}`);

    // Print all setValue errors prominently
    if (setValueErrorsCount > 0) {
      console.log('\n========================================');
      console.log('!!! setValue ERRORS DETECTED !!!');
      console.log('========================================\n');
      setValueErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] TYPE: ${err.type}`);
        console.log(`    MESSAGE: ${err.text}`);
        if (err.location) {
          console.log(`    LOCATION: ${err.location.url}:${err.location.lineNumber}`);
        }
        if (err.stack) {
          console.log(`    STACK: ${err.stack}`);
        }
      });
    } else {
      console.log('\n========================================');
      console.log('NO setValue ERRORS DETECTED');
      console.log('========================================\n');
    }

    // Print all errors
    if (errorsCount > 0) {
      console.log('\n--- ALL ERRORS ---');
      errors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] TYPE: ${err.type}`);
        console.log(`    MESSAGE: ${err.text}`);
        if (err.location && err.location.url) {
          console.log(`    LOCATION: ${err.location.url}:${err.location.lineNumber}`);
        }
      });
    }

    // Save comprehensive results
    const results = {
      timestamp: new Date().toISOString(),
      test: 'Paciente Login - Comprehensive setValue Error Check',
      urls: {
        initial: initialUrl,
        final: finalUrl
      },
      titles: {
        initial: initialTitle,
        final: finalTitle
      },
      login: {
        attempted: hasEmailInput && hasPasswordInput,
        emailInputFound: hasEmailInput,
        passwordInputFound: hasPasswordInput
      },
      summary: {
        totalMessages: totalMessages,
        totalErrors: errorsCount,
        totalWarnings: warningsCount,
        setValueErrors: setValueErrorsCount
      },
      setValueErrors: setValueErrors,
      allErrors: errors,
      allWarnings: warnings,
      allConsoleMessages: allConsoleMessages
    };

    fs.writeFileSync(
      '/tmp/paciente-login-comprehensive-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nComprehensive results saved to /tmp/paciente-login-comprehensive-results.json');

    // Generate and save summary
    const summary = `
================================================================================
PACIENTE LOGIN TEST - COMPREHENSIVE setValue ERROR CHECK
================================================================================
Test Date: ${new Date().toISOString()}
Test URL: https://fisioflow-migration.web.app

Login Credentials:
  - Email: paciente@moocafisio.com.br
  - Password: teste123

================================================================================
RESULTS
================================================================================

setValue ERRORS: ${setValueErrorsCount > 0 ? 'DETECTED' : 'NOT DETECTED'}
Number of setValue errors: ${setValueErrorsCount}

Total Console Messages: ${totalMessages}
Total Errors: ${errorsCount}
Total Warnings: ${warningsCount}

URLs:
  Initial: ${initialUrl}
  Final: ${finalUrl}
  Changed: ${finalUrl !== initialUrl ? 'YES' : 'NO'}

Login:
  Attempted: ${hasEmailInput && hasPasswordInput ? 'YES' : 'NO'}
  Email Input Found: ${hasEmailInput ? 'YES' : 'NO'}
  Password Input Found: ${hasPasswordInput ? 'YES' : 'NO'}

================================================================================
setValue ERROR DETAILS
================================================================================

${setValueErrorsCount > 0 ?
  setValueErrors.map((err, idx) => `
[${idx + 1}] ${err.text}
  Type: ${err.type}
  Location: ${err.location ? `${err.location.url}:${err.location.lineNumber}` : 'N/A'}
`).join('\n') :
  'No setValue errors detected during the test.'
}

================================================================================
FINAL VERDICT
================================================================================

${setValueErrorsCount > 0 ?
  `!!! BUG CONFIRMED !!!\n\nThe "Cannot access setValue before initialization" error WAS reproduced.\n\nFound ${setValueErrorsCount} occurrence(s) of this error.\n\nAction: This bug needs to be fixed.`
  :
  `SUCCESS: No setValue errors detected\n\nThe test did not detect any "setValue" initialization errors during:\n1. Initial page load\n2. Login attempt\n3. Extended monitoring period\n\nPossible scenarios:\n- The bug has been fixed\n- The bug occurs under different conditions\n- The test user needs different permissions\n- The bug is triggered by specific user actions not covered in this test`
}

================================================================================
`;
    fs.writeFileSync('/tmp/paciente-login-comprehensive-summary.txt', summary);
    console.log(summary);

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');
  });
});
