import { chromium } from 'playwright';

async function testDatabaseConnection() {
  console.log('Starting database connection test...\n');

  const browser = await chromium.launch({
    headless: true, // Run headless for CI/CD
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages - attach BEFORE page loads
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text,
      location: msg.location()
    });
    // Log in real-time for debugging
    console.log(`[Console ${msg.type()}] ${text}`);
  });

  // Collect errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });

  // Collect network failures
  const networkErrors = [];
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push({
        url: response.url(),
        status: status,
        statusText: response.statusText()
      });
      console.log(`[Network Error] HTTP ${status} ${response.statusText()}: ${response.url()}`);
    }
  });

  // Log all requests for debugging
  page.on('request', request => {
    console.log(`[Request] ${request.method()} ${request.url()}`);
  });

  try {
    console.log('1. Navigating to https://fisioflow-migration.web.app');
    await page.goto('https://fisioflow-migration.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('   Page loaded successfully\n');

    // Wait a bit for the page to fully initialize
    await page.waitForTimeout(3000);

    console.log('2. Looking for login form elements...');

    // Try to find email input - wait with timeout
    let emailInput;
    try {
      emailInput = await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i], input[id*="email" i]', {
        timeout: 10000
      });
      console.log('   Found email input\n');
    } catch (e) {
      console.log('   Email input not found, trying alternative selectors...\n');
      // Try to get all inputs
      const allInputs = await page.$$('input');
      console.log(`   Found ${allInputs.length} input elements on the page`);

      // Try to take a screenshot for debugging
      await page.screenshot({ path: '/tmp/fisioflow-login-page.png' });
      console.log('   Screenshot saved to /tmp/fisioflow-login-page.png\n');

      // Get page content
      const content = await page.content();
      console.log('   Page HTML (first 2000 chars):', content.substring(0, 2000));
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

      // Look for submit button
      console.log('4. Looking for login button...');
      const submitButton = await page.waitForSelector('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Entrar"), button:has-text("Entrar")', {
        timeout: 5000
      });

      console.log('   Clicking login button...\n');
      await submitButton.click();

      console.log('5. Waiting 30 seconds for login to complete and for any errors to appear...');
      await page.waitForTimeout(30000);
      console.log('   Wait complete\n');

      // Check if we're still on login page or redirected
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);

      // Look for success indicators or error messages
      const hasError = await page.locator('.error, .alert-error, [role="alert"]').count();
      const hasSuccess = await page.locator('.success, .alert-success').count();

      console.log(`   Error elements found: ${hasError}`);
      console.log(`   Success elements found: ${hasSuccess}\n`);

      // Take another screenshot after login attempt
      await page.screenshot({ path: '/tmp/fisioflow-after-login.png' });
      console.log('   Screenshot saved to /tmp/fisioflow-after-login.png\n');
    }

  } catch (error) {
    console.error('\nError during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('\n6. Console Messages:');
    console.log('==================');
    if (consoleMessages.length === 0) {
      console.log('No console messages captured');
    } else {
      consoleMessages.forEach(msg => {
        console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
        if (msg.location) {
          console.log(`  Location: ${msg.location.url}:${msg.location.lineNumber}`);
        }
      });
    }

    console.log('\n7. Page Errors:');
    console.log('===============');
    if (pageErrors.length === 0) {
      console.log('No page errors captured');
    } else {
      pageErrors.forEach(error => {
        console.log(`ERROR: ${error.message}`);
        if (error.stack) {
          console.log(`Stack: ${error.stack}`);
        }
      });
    }

    console.log('\n8. Network Errors:');
    console.log('=================');
    if (networkErrors.length === 0) {
      console.log('No network errors captured');
    } else {
      networkErrors.forEach(error => {
        console.log(`HTTP ${error.status} ${error.statusText}: ${error.url}`);
      });
    }

    console.log('\n9. Analysis:');
    console.log('============');

    // Check for specific error types
    const corsErrors = consoleMessages.filter(m =>
      m.text.includes('CORS') ||
      m.text.includes('Cross-Origin') ||
      m.text.includes('Access-Control-Allow-Origin')
    );

    const dbErrors = consoleMessages.filter(m =>
      m.text.includes('firestore') ||
      m.text.includes('database') ||
      m.text.includes('permission') ||
      m.text.includes('Missing or insufficient permissions')
    );

    const authErrors = consoleMessages.filter(m =>
      m.text.includes('auth') ||
      m.text.includes('unauthorized') ||
      m.text.includes('authentication')
    );

    if (corsErrors.length > 0) {
      console.log('\n❌ CORS ERRORS FOUND:');
      corsErrors.forEach(e => console.log(`   - ${e.text}`));
    } else {
      console.log('\n✅ No CORS errors detected');
    }

    if (dbErrors.length > 0) {
      console.log('\n❌ DATABASE ERRORS FOUND:');
      dbErrors.forEach(e => console.log(`   - ${e.text}`));
    } else {
      console.log('\n✅ No database errors detected');
    }

    if (authErrors.length > 0) {
      console.log('\n❌ AUTHENTICATION ERRORS FOUND:');
      authErrors.forEach(e => console.log(`   - ${e.text}`));
    } else {
      console.log('\n✅ No authentication errors detected');
    }

    if (pageErrors.length > 0) {
      console.log('\n❌ PAGE ERRORS FOUND:');
      pageErrors.forEach(e => console.log(`   - ${e.message}`));
    } else {
      console.log('\n✅ No page errors detected');
    }

    console.log('\n' + '='.repeat(50));
    console.log('Test complete!');
    console.log('='.repeat(50));

    await browser.close();
  }
}

testDatabaseConnection().catch(console.error);
