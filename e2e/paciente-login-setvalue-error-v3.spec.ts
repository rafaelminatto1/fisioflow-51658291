import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Paciente Login - setValue Error Check (Simple)', () => {
  test.setTimeout(180000);

  test('simple check for setValue error', async ({ page }) => {
    const allErrors: any[] = [];
    const setValueErrors: any[] = [];

    // Collect all errors
    page.on('console', async msg => {
      const text = msg.text();
      const type = msg.type();

      const logEntry: any = {
        type: type,
        text: text,
        timestamp: new Date().toISOString()
      };

      if (msg.location()) {
        logEntry.location = msg.location();
      }

      // Check for setValue errors
      if (text.includes('setValue') && (text.includes('Cannot access') || text.includes('ReferenceError') || text.includes('initialization'))) {
        setValueErrors.push(logEntry);
        console.log(`[CRITICAL - setValue ERROR] ${text}`);
      }

      if (type === 'error') {
        allErrors.push(logEntry);
        console.log(`[ERROR] ${text}`);
      }
    });

    page.on('pageerror', error => {
      const text = error.message || error.toString();
      const logEntry: any = {
        type: 'pageerror',
        text: text,
        timestamp: new Date().toISOString(),
        stack: error.stack
      };

      allErrors.push(logEntry);

      if (text.includes('setValue') && (text.includes('Cannot access') || text.includes('ReferenceError') || text.includes('initialization'))) {
        setValueErrors.push(logEntry);
        console.log(`[CRITICAL - setValue PAGE ERROR] ${text}`);
      } else {
        console.log(`[PAGE ERROR] ${text}`);
      }
    });

    console.log('Navigating to fisioflow-migration.web.app...');

    // Use domcontentloaded instead of networkidle to avoid timeout
    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('Page loaded. Waiting 10 seconds for initial errors...');
    await page.waitForTimeout(10000);

    const beforeLoginUrl = page.url();
    const beforeLoginTitle = await page.title();
    console.log(`URL: ${beforeLoginUrl}`);
    console.log(`Title: ${beforeLoginTitle}`);

    await page.screenshot({ path: '/tmp/paciente-simple-before.png' });

    // Try to find login form
    const emailInput = page.locator('input[name="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[name="password"], input[name="password"]').first();

    const hasEmail = await emailInput.count() > 0;
    const hasPassword = await passwordInput.count() > 0;

    console.log(`Email input: ${hasEmail}`);
    console.log(`Password input: ${hasPassword}`);

    if (hasEmail && hasPassword) {
      console.log('Filling in credentials...');

      try {
        await emailInput.fill('paciente@moocafisio.com.br');
        await passwordInput.fill('teste123');

        // Try various button selectors
        const buttons = [
          'button[type="submit"]',
          'button:has-text("Entrar")',
          'button:has-text("Acessar")',
          'button:has-text("Login")',
          'form button'
        ];

        let clicked = false;
        for (const selector of buttons) {
          try {
            const btn = page.locator(selector).first();
            if (await btn.count() > 0 && await btn.isVisible()) {
              await btn.click();
              clicked = true;
              console.log(`Clicked: ${selector}`);
              break;
            }
          } catch (e) {}
        }

        if (!clicked) {
          await passwordInput.press('Enter');
          console.log('Pressed Enter');
        }

        // Wait after login
        console.log('Waiting 20 seconds for navigation and errors...');
        await page.waitForTimeout(20000);

      } catch (e) {
        console.log(`Login error: ${e}`);
      }
    }

    const afterLoginUrl = page.url();
    const afterLoginTitle = await page.title();

    console.log(`\nAfter login URL: ${afterLoginUrl}`);
    console.log(`After login Title: ${afterLoginTitle}`);
    console.log(`URL changed: ${afterLoginUrl !== beforeLoginUrl}`);

    await page.screenshot({ path: '/tmp/paciente-simple-after.png' });

    // Extended monitoring
    console.log('\nExtended monitoring (20 seconds) for delayed errors...');
    await page.waitForTimeout(20000);

    await page.screenshot({ path: '/tmp/paciente-simple-final.png' });

    // Generate report
    console.log('\n========================================');
    console.log('FINAL REPORT');
    console.log('========================================\n');

    console.log(`setValue Errors: ${setValueErrors.length}`);
    console.log(`Total Errors: ${allErrors.length}`);

    if (setValueErrors.length > 0) {
      console.log('\n!!! setValue ERRORS FOUND !!!');
      setValueErrors.forEach((err, i) => {
        console.log(`\n[${i+1}] ${err.text}`);
        if (err.location) {
          console.log(`  Location: ${err.location.url}:${err.location.lineNumber}`);
        }
      });
    } else {
      console.log('\nNO setValue errors detected');
    }

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      setValueErrors: setValueErrors,
      allErrors: allErrors,
      urls: {
        before: beforeLoginUrl,
        after: afterLoginUrl
      },
      loginAttempted: hasEmail && hasPassword
    };

    fs.writeFileSync('/tmp/paciente-simple-results.json', JSON.stringify(results, null, 2));
    console.log('\nResults saved to /tmp/paciente-simple-results.json');

    // Summary text
    const summary = `
================================================================================
PACIENTE LOGIN TEST - SIMPLE setValue ERROR CHECK
================================================================================
Date: ${new Date().toISOString()}
URL: https://fisioflow-migration.web.app

CREDENTIALS:
  Email: paciente@moocafisio.com.br
  Password: teste123

================================================================================
RESULTS
================================================================================

setValue ERRORS: ${setValueErrors.length > 0 ? 'FOUND' : 'NOT FOUND'}
Count: ${setValueErrors.length}

Total Errors: ${allErrors.length}

URL Before Login: ${beforeLoginUrl}
URL After Login: ${afterLoginUrl}
URL Changed: ${afterLoginUrl !== beforeLoginUrl ? 'YES' : 'NO'}

Login Attempted: ${hasEmail && hasPassword ? 'YES' : 'NO'}

================================================================================
setValue ERROR DETAILS
================================================================================

${setValueErrors.length > 0 ?
  setValueErrors.map((e, i) => `[${i+1}] ${e.text}`).join('\n') :
  'No setValue errors detected.'
}

================================================================================
VERDICT
================================================================================

${setValueErrors.length > 0 ?
  'BUG CONFIRMED: setValue initialization errors were detected!' :
  'SUCCESS: No setValue errors detected during paciente login.'
}

================================================================================
`;

    fs.writeFileSync('/tmp/paciente-simple-summary.txt', summary);
    console.log(summary);
  });
});
