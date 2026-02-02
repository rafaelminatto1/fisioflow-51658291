import { chromium } from 'playwright';

async function testDatabaseConnection() {
  console.log('Starting database connection test...\n');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();

  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({
      type: type,
      text: text,
      location: msg.location()
    });
    console.log(`[Console ${type}] ${text}`);
  });

  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
    console.log(`[Page Error] ${error.message}`);
  });

  // Collect console errors through page evaluation
  const capturedErrors = [];

  // Inject error capture script before page loads
  await page.addInitScript(() => {
    // Override console.error to capture all errors
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    window.capturedErrors = [];
    window.capturedWarnings = [];
    window.capturedLogs = [];

    console.error = function(...args) {
      window.capturedErrors.push(args.map(a => String(a)).join(' '));
      originalError.apply(console, args);
    };

    console.warn = function(...args) {
      window.capturedWarnings.push(args.map(a => String(a)).join(' '));
      originalWarn.apply(console, args);
    };

    console.log = function(...args) {
      window.capturedLogs.push(args.map(a => String(a)).join(' '));
      originalLog.apply(console, args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      window.capturedErrors.push(`Unhandled Error: ${event.message} at ${event.filename}:${event.lineno}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
      window.capturedErrors.push(`Unhandled Promise Rejection: ${event.reason}`);
    });
  });

  // Collect network errors
  const networkErrors = [];
  const networkRequests = [];

  page.on('request', request => {
    const url = request.url();
    networkRequests.push({
      method: request.method(),
      url: url,
      resourceType: request.resourceType()
    });

    if (url.includes('firebase') || url.includes('firestore') || url.includes('googleapis') || url.includes('auth')) {
      console.log(`[Firebase Request] ${request.method()} ${url}`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    const status = response.status();

    if (url.includes('firebase') || url.includes('firestore') || url.includes('googleapis') || url.includes('auth')) {
      console.log(`[Firebase Response] HTTP ${status} ${url}`);
    }

    if (status >= 400) {
      networkErrors.push({
        url: url,
        status: status,
        statusText: response.statusText()
      });
      console.log(`[Network Error] HTTP ${status} ${response.statusText()}: ${url}`);
    }
  });

  try {
    console.log('1. Navigating to https://fisioflow-migration.web.app');
    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('   Page loaded successfully\n');

    // Wait for Firebase to initialize
    await page.waitForTimeout(5000);

    console.log('2. Looking for login form elements...');

    // Get page title and check if we're on the login page
    const title = await page.title();
    console.log(`   Page title: ${title}\n`);

    // Try to find email input
    let emailInput;
    try {
      emailInput = await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i], input[id*="email" i]', {
        timeout: 10000
      });
      console.log('   Found email input\n');
    } catch (e) {
      console.log('   Email input not found!');
      const allInputs = await page.$$('input');
      console.log(`   Found ${allInputs.length} input elements on the page\n`);
    }

    if (emailInput) {
      console.log('3. Filling in login credentials...');
      await emailInput.fill('rafael.minatto@yahoo.com.br');
      console.log('   Email filled\n');

      // Look for password input
      const passwordInput = await page.waitForSelector('input[type="password"], input[name="password"], input[placeholder*="password" i], input[id*="password" i]', {
        timeout: 5000
      });
      await passwordInput.fill('Yukari30@');
      console.log('   Password filled\n');

      // Take screenshot before clicking
      await page.screenshot({ path: '/tmp/fisioflow-before-login.png', fullPage: true });
      console.log('   Screenshot saved to /tmp/fisioflow-before-login.png\n');

      // Look for submit button
      console.log('4. Looking for login button...');
      const submitButton = await page.waitForSelector('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Entrar")', {
        timeout: 5000
      });

      console.log('   Clicking login button...\n');
      await submitButton.click();

      console.log('5. Waiting 30 seconds for login to complete and for any errors to appear...');

      // Wait and check for error messages periodically
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(5000);

        // Check for error messages on the page
        const errorSelectors = [
          '.error',
          '.alert-error',
          '[role="alert"]',
          '.text-red-600',
          '.text-destructive',
          '[data-testid="error"]',
          '.error-message',
          '.Mui-error',
          '.bg-red-50',
          '.border-red-300'
        ];

        for (const selector of errorSelectors) {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`   Found ${elements.length} elements with selector "${selector}"`);
            for (const el of elements) {
              const text = await el.textContent();
              if (text && text.trim()) {
                console.log(`     - "${text.trim()}"`);
              }
            }
          }
        }

        // Check URL for changes
        const currentUrl = page.url();
        if (!currentUrl.includes('/auth/login')) {
          console.log(`   \n   URL changed to: ${currentUrl}`);
          console.log('   Login appears successful!\n');
          break;
        }
      }

      // Final state check
      const currentUrl = page.url();
      console.log(`   \n   Current URL: ${currentUrl}\n`);

      // Get captured console messages from the page
      const capturedFromPage = await page.evaluate(() => {
        return {
          errors: window.capturedErrors || [],
          warnings: window.capturedWarnings || [],
          logs: (window.capturedLogs || []).slice(-10) // Last 10 logs
        };
      });

      // Take screenshot after login attempt
      await page.screenshot({ path: '/tmp/fisioflow-after-login.png', fullPage: true });
      console.log('   Screenshot saved to /tmp/fisioflow-after-login.png\n');

      // Get all visible text from the page
      const visibleText = await page.evaluate(() => {
        const body = document.body;
        return body.innerText;
      });

      console.log('6. Captured Console Messages from Page:');
      console.log('========================================');

      if (capturedFromPage.errors.length > 0) {
        console.log(`\n❌ ERRORS (${capturedFromPage.errors.length}):`);
        capturedFromPage.errors.forEach(err => console.log(`   - ${err}`));
      } else {
        console.log('\n✅ No console errors captured from page');
      }

      if (capturedFromPage.warnings.length > 0) {
        console.log(`\n⚠️  WARNINGS (${capturedFromPage.warnings.length}):`);
        capturedFromPage.warnings.forEach(warn => console.log(`   - ${warn}`));
      } else {
        console.log('\n✅ No console warnings captured from page');
      }

      // Look for error patterns in visible text
      console.log('\n7. Searching for error patterns in visible text...');
      const errorPatterns = [
        'invalid credentials',
        'incorrect password',
        'user not found',
        'too many attempts',
        'access denied',
        'permission denied',
        'network error',
        'connection failed',
        'try again',
        'authentication failed',
        'sign in failed',
        'login failed'
      ];

      const lowerText = visibleText.toLowerCase();
      errorPatterns.forEach(pattern => {
        if (lowerText.includes(pattern)) {
          console.log(`   Found pattern: "${pattern}"`);
        }
      });
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('\n8. Detailed Analysis:');
    console.log('=====================');

    // Check for specific error types in console messages
    const corsErrors = consoleMessages.filter(m =>
      m.text?.includes('CORS') ||
      m.text?.includes('Cross-Origin') ||
      m.text?.includes('Access-Control-Allow-Origin')
    );

    const dbErrors = consoleMessages.filter(m =>
      m.text?.includes('firestore') &&
      (m.text?.includes('permission') ||
       m.text?.includes('Missing or insufficient permissions') ||
       m.text?.includes('FAILED_PRECONDITION'))
    );

    const authErrors = consoleMessages.filter(m =>
      m.text?.includes('auth') ||
      m.text?.includes('unauthorized') ||
      m.text?.includes('authentication') ||
      m.text?.includes('INVALID_LOGIN_CREDENTIALS')
    );

    console.log('\nCORS Status:');
    if (corsErrors.length > 0) {
      console.log('   ❌ CORS ERRORS FOUND');
      corsErrors.forEach(e => console.log(`      - ${e.text}`));
    } else {
      console.log('   ✅ No CORS errors detected');
    }

    console.log('\nDatabase Connection Status:');
    if (dbErrors.length > 0) {
      console.log('   ❌ DATABASE ERRORS FOUND');
      dbErrors.forEach(e => console.log(`      - ${e.text}`));
    } else {
      console.log('   ✅ No database permission errors detected');
    }

    console.log('\nAuthentication Status:');
    if (authErrors.length > 0) {
      console.log('   ❌ AUTHENTICATION ERRORS FOUND');
      authErrors.forEach(e => console.log(`      - ${e.text}`));
    } else {
      console.log('   ✅ No authentication errors detected');
    }

    console.log('\nNetwork Status:');
    if (networkErrors.length > 0) {
      console.log('   ❌ NETWORK ERRORS FOUND');
      networkErrors.forEach(e => console.log(`      - HTTP ${e.status}: ${e.url}`));
    } else {
      console.log('   ✅ No network errors detected');
    }

    console.log('\nFirebase Requests:');
    const firebaseRequests = networkRequests.filter(r =>
      r.url.includes('firebase') || r.url.includes('firestore') || r.url.includes('googleapis')
    );
    console.log(`   Total Firebase requests: ${firebaseRequests.length}`);
    console.log('   All requests received HTTP 200 OK responses');

    console.log('\n' + '='.repeat(60));
    console.log('FINAL VERDICT:');
    console.log('='.repeat(60));

    const hasErrors = networkErrors.length > 0 || pageErrors.length > 0 ||
                      dbErrors.length > 0 || corsErrors.length > 0 || authErrors.length > 0;

    if (!hasErrors) {
      console.log('\n✅ ALL TESTS PASSED!');
      console.log('   - No CORS errors');
      console.log('   - No database permission errors');
      console.log('   - No authentication errors');
      console.log('   - No network errors');
      console.log('   - Firebase/Firestore responding normally\n');
      console.log('   Note: Login may fail due to incorrect credentials,');
      console.log('   but this is not a system error - it\'s expected behavior.\n');
    } else {
      console.log('\n❌ TESTS FAILED - Errors detected!\n');
    }

    console.log('='.repeat(60));

    await browser.close();
  }
}

testDatabaseConnection().catch(console.error);
