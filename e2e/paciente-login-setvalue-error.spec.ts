import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Paciente Login - setValue Error Check', () => {
  test.setTimeout(120000); // Extend timeout to 2 minutes

  test('login as paciente and check for setValue error', async ({ page, context }) => {
    // Use incognito-like context (already isolated by Playwright)
    const errors: any[] = [];
    const warnings: any[] = [];
    const setValueErrors: any[] = [];

    // Listen for console messages - specifically looking for setValue errors
    page.on('console', async msg => {
      const type = msg.type();
      const text = msg.text();

      // Check specifically for "Cannot access 'setValue' before initialization" error
      if (text.includes('Cannot access') && text.includes('setValue') && text.includes('initialization')) {
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
        setValueErrors.push(errorObj);
        console.log(`[!!! setValue ERROR FOUND !!!] ${text}`);
        if (msg.location()) {
          console.log(`  Location: ${msg.location().url}:${msg.location().lineNumber}`);
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
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
        console.log(`[WARNING] ${text}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      const errorMessage = error.message || error.toString();
      console.log(`[PAGE ERROR] ${errorMessage}`);

      // Check if it's a setValue error
      if (errorMessage.includes('Cannot access') && errorMessage.includes('setValue') && errorMessage.includes('initialization')) {
        setValueErrors.push({
          text: errorMessage,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      }

      errors.push({
        text: errorMessage,
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

    // Wait additional time for any async operations and errors to appear
    await page.waitForTimeout(5000);

    // Take a screenshot before login
    await page.screenshot({ path: '/tmp/paciente-before-login.png', fullPage: true });
    console.log('Screenshot saved to /tmp/paciente-before-login.png');

    // Check if there's a login form
    console.log('\n========================================');
    console.log('STEP 3: Looking for login form...');
    console.log('========================================\n');

    const emailLocator = page.locator('input[type="email"], input[name="email"]').first();
    const passwordLocator = page.locator('input[type="password"]').first();

    const hasEmailInput = await emailLocator.count() > 0;
    const hasPasswordInput = await passwordLocator.count() > 0;

    console.log(`Email input found: ${hasEmailInput}`);
    console.log(`Password input found: ${hasPasswordInput}`);

    // Get page title and URL before login
    const titleBeforeLogin = await page.title();
    const urlBeforeLogin = page.url();
    console.log(`Title before login: ${titleBeforeLogin}`);
    console.log(`URL before login: ${urlBeforeLogin}`);

    if (hasEmailInput && hasPasswordInput) {
      console.log('\n========================================');
      console.log('STEP 4: Logging in as PACIENTE...');
      console.log('Email: paciente@moocafisio.com.br');
      console.log('========================================\n');

      // Fill in email
      await emailLocator.fill('paciente@moocafisio.com.br');
      console.log('Filled email field with paciente credentials');

      // Fill in password
      await passwordLocator.fill('teste123');
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
        '.submit-button',
        'form button'
      ];

      let submitButtonClicked = false;
      for (const selector of submitSelectors) {
        try {
          const submitButton = page.locator(selector).first();
          if (await submitButton.count() > 0 && await submitButton.isVisible()) {
            await submitButton.click();
            console.log(`Clicked submit button using selector: ${selector}`);
            submitButtonClicked = true;
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      if (!submitButtonClicked) {
        console.log('Could not find a submit button. Trying to press Enter in password field...');
        await passwordLocator.press('Enter');
      }

      console.log('\n========================================');
      console.log('STEP 5: Waiting for navigation and page to load...');
      console.log('========================================\n');

      // Wait for navigation or timeout
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
        console.log('Navigation occurred after login');
      } catch (e) {
        console.log('No immediate navigation detected - checking if page updated via AJAX...');
      }

      // CRITICAL: Wait at least 10 seconds for all errors to appear
      console.log('\n========================================');
      console.log('STEP 6: Waiting 15 seconds for all errors to appear...');
      console.log('(This allows time for the "setValue" error to manifest)');
      console.log('========================================\n');

      await page.waitForTimeout(15000);

      // Take another screenshot after login
      await page.screenshot({ path: '/tmp/paciente-after-login.png', fullPage: true });
      console.log('After-login screenshot saved to /tmp/paciente-after-login.png');

      // Get page title and URL after login
      const titleAfterLogin = await page.title();
      const urlAfterLogin = page.url();
      console.log(`\nTitle after login: ${titleAfterLogin}`);
      console.log(`URL after login: ${urlAfterLogin}`);

      // Check if login was successful by looking for URL changes or patient-specific elements
      const loginSuccessful = urlAfterLogin !== urlBeforeLogin || !urlAfterLogin.includes('/login');

      console.log(`\nLogin appears to be: ${loginSuccessful ? 'SUCCESSFUL' : 'MAY HAVE FAILED'}`);
    } else {
      console.log('\n========================================');
      console.log('No standard login form detected!');
      console.log('Page might already be authenticated or using a different auth method.');
      console.log('========================================\n');

      // Even without login form, wait for errors
      await page.waitForTimeout(15000);
    }

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
    const referenceErrors = errors.filter(e =>
      e.text && (e.text.includes('Cannot access') || e.text.includes('ReferenceError') || e.text.includes('before initialization'))
    );

    console.log(`\nTotal Errors: ${errors.length}`);
    console.log(`Total Warnings: ${warnings.length}`);
    console.log(`setValue Errors: ${setValueErrors.length} <<< THIS IS WHAT WE'RE LOOKING FOR!`);
    console.log(`CSP Errors: ${cspErrors.length}`);
    console.log(`CORS Errors: ${corsErrors.length}`);
    console.log(`Ably/Realtime Errors: ${ablyErrors.length}`);
    console.log(`Reference/Initialization Errors: ${referenceErrors.length}`);

    // Print setValue errors prominently
    if (setValueErrors.length > 0) {
      console.log('\n========================================');
      console.log('!!! setValue ERRORS FOUND !!!');
      console.log('========================================\n');
      setValueErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
        if (err.location) {
          console.log(`    Location: ${err.location.url}:${err.location.lineNumber}`);
        }
        if (err.stack) {
          console.log(`    Stack: ${err.stack}`);
        }
        if (err.timestamp) {
          console.log(`    Time: ${err.timestamp}`);
        }
      });
    } else {
      console.log('\n========================================');
      console.log('NO setValue ERRORS DETECTED');
      console.log('========================================\n');
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
        if (err.stack) {
          console.log(`    Stack: ${err.stack}`);
        }
        if (err.timestamp) {
          console.log(`    Time: ${err.timestamp}`);
        }
      });
    }

    if (referenceErrors.length > 0) {
      console.log('\n--- REFERENCE/INITIALIZATION ERRORS ---');
      referenceErrors.forEach((err, idx) => {
        console.log(`\n[${idx + 1}] ${err.text}`);
        if (err.location) {
          console.log(`    Location: ${err.location.url}:${err.location.lineNumber}`);
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

    // Save results to file
    const results = {
      timestamp: new Date().toISOString(),
      test: 'Paciente Login - setValue Error Check',
      finalUrl: page.url(),
      pageTitle: await page.title(),
      loginSuccessful: urlBeforeLogin !== page.url(),
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      setValueErrors: setValueErrors.length,
      cspErrors: cspErrors.length,
      corsErrors: corsErrors.length,
      ablyErrors: ablyErrors.length,
      referenceErrors: referenceErrors.length,
      setValueErrorsList: setValueErrors,
      errors: errors,
      warnings: warnings,
      cspErrorsList: cspErrors,
      corsErrorsList: corsErrors,
      ablyErrorsList: ablyErrors,
      referenceErrorsList: referenceErrors
    };

    fs.writeFileSync(
      '/tmp/paciente-login-setvalue-errors.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nResults saved to /tmp/paciente-login-setvalue-errors.json');

    // Final verdict
    console.log('\n========================================');
    console.log('TEST COMPLETE - FINAL VERDICT');
    console.log('========================================\n');

    if (setValueErrors.length > 0) {
      console.log('!!! CRITICAL: setValue ERRORS DETECTED !!!');
      console.log(`Found ${setValueErrors.length} setValue initialization error(s)`);
      console.log('This is the bug we are looking for!');
    } else {
      console.log('SUCCESS: No setValue errors detected during paciente login');
      console.log('The "Cannot access setValue before initialization" bug was NOT reproduced');
    }

    console.log('\n========================================\n');

    // Also save a summary text file for easy reading
    const summaryText = `
================================================================================
PACIENTE LOGIN TEST - setValue ERROR CHECK
================================================================================
Test Date: ${new Date().toISOString()}
Test URL: https://fisioflow-migration.web.app
Login Credentials:
  - Email: paciente@moocafisio.com.br
  - Password: teste123

================================================================================
RESULTS
================================================================================

setValue ERRORS FOUND: ${setValueErrors.length > 0 ? 'YES' : 'NO'}
Number of setValue errors: ${setValueErrors.length}

Total Console Errors: ${errors.length}
Total Warnings: ${warnings.length}

Error Breakdown:
- setValue/Initialization Errors: ${setValueErrors.length}
- CSP Errors: ${cspErrors.length}
- CORS Errors: ${corsErrors.length}
- Ably/Realtime Errors: ${ablyErrors.length}
- Other Reference Errors: ${referenceErrors.length}

================================================================================
setValue ERROR DETAILS
================================================================================

${setValueErrors.length > 0 ? setValueErrors.map((err, idx) => `
[${idx + 1}] ${err.text}
  Location: ${err.location ? `${err.location.url}:${err.location.lineNumber}` : 'N/A'}
  Time: ${err.timestamp}
  ${err.stack ? `Stack: ${err.stack}` : ''}
`).join('\n') : 'No setValue errors detected.'}

================================================================================
ALL ERRORS
================================================================================

${errors.map((err, idx) => `
[${idx + 1}] ${err.text || err}
  Location: ${err.location ? `${err.location.url}:${err.location.lineNumber}` : 'N/A'}
`).join('\n')}

================================================================================
FINAL VERDICT
================================================================================

${setValueErrors.length > 0 ?
  '!!! BUG CONFIRMED !!!' +
  '\nThe "Cannot access setValue before initialization" error WAS reproduced.' +
  `\n\nFound ${setValueErrors.length} occurrence(s) of this error.` +
  '\n\nAction: This bug needs to be fixed.'
  :
  'SUCCESS: No setValue errors detected' +
  '\n\nThe paciente login completed without the "setValue" initialization error.' +
  '\n\nAction: If the bug was expected, it may have been fixed or the test conditions may need adjustment.'
}

================================================================================
Generated by Playwright Test
================================================================================
`;

    fs.writeFileSync('/tmp/paciente-login-test-summary.txt', summaryText);
    console.log('Summary saved to /tmp/paciente-login-test-summary.txt');

    // Log the summary to console as well
    console.log(summaryText);
  });
});
