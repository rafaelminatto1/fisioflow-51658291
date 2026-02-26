import { chromium } from 'playwright';

async function testDatabaseConnection() {
  console.log('Starting database connection test...\n');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    // Capture service workers
    serviceWorkers: 'allow',
  });

  const page = await context.newPage();

  // Get the CDP session for enhanced debugging
  const client = await context.newCDPSession(page);

  // Enable console and network domains
  await client.send('Runtime.enable');
  await client.send('Network.enable');

  // Collect console messages using CDP for better coverage
  const consoleMessages = [];

  client.on('Runtime.consoleAPICalled', event => {
    const args = event.args.map(arg => arg.value).join(' ');
    consoleMessages.push({
      type: event.type,
      text: args,
      timestamp: event.timestamp
    });
    console.log(`[Console ${event.type}] ${args}`);
  });

  // Also listen for JavaScript exceptions
  client.on('Runtime.exceptionThrown', exception => {
    consoleMessages.push({
      type: 'exception',
      text: exception.exceptionDetails.exception?.description || 'Unknown exception',
      timestamp: exception.timestamp
    });
    console.log(`[Exception] ${exception.exceptionDetails.exception?.description || 'Unknown exception'}`);
  });

  // Regular page console listener as backup
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text,
      location: msg.location()
    });
    console.log(`[Page Console ${msg.type()}] ${text}`);
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

  // Log all requests
  page.on('request', request => {
    const url = request.url();
    // Only log Firebase and API requests to reduce noise
    if (url.includes('firebase') || url.includes('firestore') || url.includes('googleapis') || url.includes('auth')) {
      console.log(`[Firebase Request] ${request.method()} ${url}`);
    }
  });

  // Log all responses
  page.on('response', response => {
    const url = response.url();
    if (url.includes('firebase') || url.includes('firestore') || url.includes('googleapis') || url.includes('auth')) {
      console.log(`[Firebase Response] HTTP ${response.status()} ${url}`);
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

    // Try to find email input - wait with timeout
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
      await page.screenshot({ path: '/tmp/fisioflow-login-page.png' });
      console.log('   Screenshot saved to /tmp/fisioflow-login-page.png\n');
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
      const submitButton = await page.waitForSelector('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Entrar")', {
        timeout: 5000
      });

      console.log('   Clicking login button...\n');
      await submitButton.click();

      console.log('5. Waiting 30 seconds for login to complete and for any errors to appear...');

      // Wait for URL change or error messages
      try {
        await Promise.race([
          page.waitForURL('**/app/**', { timeout: 30000 }),
          page.waitForURL('**/dashboard/**', { timeout: 30000 }),
          page.waitForURL('**/home/**', { timeout: 30000 }),
          page.waitForSelector('.error, .alert-error, [role="alert"]', { timeout: 30000 })
        ]);
        console.log('   Page state changed or error found\n');
      } catch (e) {
        console.log('   No URL change detected, continuing to wait...\n');
        await page.waitForTimeout(30000);
      }

      // Check if we're still on login page or redirected
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}\n`);

      // Check for error messages on the page
      const errorElements = await page.$$('.error, .alert-error, [role="alert"], .text-red-600, .text-destructive');
      if (errorElements.length > 0) {
        console.log(`   Found ${errorElements.length} potential error elements:`);
        for (const el of errorElements) {
          const text = await el.textContent();
          console.log(`     - "${text}"`);
        }
        console.log('');
      }

      // Check for success messages
      const successElements = await page.$$('.success, .alert-success, .text-green-600');
      console.log(`   Success elements found: ${successElements.length}\n`);

      // Take screenshot after login attempt
      await page.screenshot({ path: '/tmp/fisioflow-after-login.png', fullPage: true });
      console.log('   Screenshot saved to /tmp/fisioflow-after-login.png\n');
    }

  } catch (error) {
    console.error('\nError during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('\n6. Console Messages Summary:');
    console.log('============================');
    if (consoleMessages.length === 0) {
      console.log('No console messages captured');
    } else {
      console.log(`Total messages: ${consoleMessages.length}`);
      consoleMessages.forEach(msg => {
        console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
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
          console.log(`  Stack: ${error.stack.substring(0, 200)}`);
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
      console.log('\n✅ No database permission errors detected');
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

    // Final verdict
    console.log('\n' + '='.repeat(50));
    if (networkErrors.length === 0 && pageErrors.length === 0 && dbErrors.length === 0 && corsErrors.length === 0) {
      console.log('✅ TEST PASSED: No errors detected!');
    } else {
      console.log('❌ TEST FAILED: Errors were detected');
    }
    console.log('='.repeat(50));

    await browser.close();
  }
}

testDatabaseConnection().catch(console.error);
