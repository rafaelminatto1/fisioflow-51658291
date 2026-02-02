const { chromium } = require('playwright');
const fs = require('fs');
const { execSync } = require('child_process');
const logFile = '/tmp/playwright-test.log';
const log = (msg) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
};
(async () => {
  log('🚀 Starting test...');
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 300
  });
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  const consoleMessages = [];
  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    log('Console [' + msg.type() + ']: ' + text);
  });
  page.on('pageerror', error => {
    errors.push({ message: error.message });
    log('❌ Page Error: ' + error.message);
  });
  try {
    log('📍 Navigating to https://fisioflow-migration.web.app');
    await page.goto('https://fisioflow-migration.web.app', { waitUntil: 'domcontentloaded', timeout: 60000 });
    log('✓ Page loaded');
    await page.waitForTimeout(5000);
    log('📸 Taking initial screenshot...');
    await page.screenshot({ path: '/tmp/01-initial-page.png', fullPage: true });
    log('✓ Screenshot saved');
    const emailCount = await page.locator('input[type="email"], input[name="email"]').count();
    const passwordCount = await page.locator('input[type="password"], input[name="password"]').count();
    log('🔍 Page analysis:');
    log('  - Email inputs: ' + emailCount);
    log('  - Password inputs: ' + passwordCount);
    log('  - URL: ' + page.url());
    if (emailCount > 0 && passwordCount > 0) {
      log('✓ Login form found');
      log('🔐 Filling credentials...');
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      await emailInput.fill('carlos.silva@clinicaprincipal.com.br');
      await passwordInput.fill('Fisio123!');
      await page.screenshot({ path: '/tmp/02-form-filled.png', fullPage: true });
      log('✓ Form filled');
      log('🔑 Clicking submit button...');
      const submitButton = page.getByRole('button', { name: /entrar|login|sign in/i }).or(page.locator('button[type="submit"]')).first();
      await submitButton.click();
      log('⏳ Waiting 20 seconds for page to fully load...');
      await page.waitForTimeout(20000);
      log('📸 Taking after-login screenshot...');
      await page.screenshot({ path: '/tmp/03-after-login.png', fullPage: true });
      const finalUrl = page.url();
      log('📍 Final URL: ' + finalUrl);
      const finalContent = await page.content();
      if (finalContent.includes('Carlos Eduardo Silva') || finalContent.includes('Carlos Silva')) {
        log('✅ SUCCESS: User name appears on the page!');
      } else {
        log('⚠️  WARNING: User name not found on page');
      }
      const headings = await page.locator('h1, h2, h3').allTextContents();
      log('📋 Dashboard headings: ' + headings.filter(h => h.trim()).join(', '));
    } else {
      log('⚠️  Login form not found');
    }
  } catch (error) {
    log('❌ Test failed: ' + error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    fs.writeFileSync('/tmp/test-report.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      testUser: { email: 'carlos.silva@clinicaprincipal.com.br', expectedName: 'Dr. Carlos Eduardo Silva' },
      consoleMessages,
      errors,
      summary: { totalConsoleMessages: consoleMessages.length, errorsCount: errors.length }
    }, null, 2));
    log('\n========== TEST SUMMARY ==========');
    log('Total console messages: ' + consoleMessages.length);
    log('Total errors: ' + errors.length);
    log('=================================\n');
    log('✓ Test completed. Report saved to /tmp/test-report.json');
    log('✓ Screenshots saved to /tmp/*.png');
    log('✓ Log saved to ' + logFile);
  }
})();
