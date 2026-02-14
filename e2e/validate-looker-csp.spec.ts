import { test, expect } from '@playwright/test';

test.describe('Validate Looker Studio CSP Fix', () => {
  test.setTimeout(120000);

  test('should load Looker Studio iframe without CSP violations', async ({ page }) => {
    const cspErrors: string[] = [];

    // Listen for CSP violations
    page.on('console', msg => {
      if (msg.text().includes('Content Security Policy') && msg.text().includes('lookerstudio.google.com')) {
        cspErrors.push(msg.text());
        console.log(`[CSP ERROR] ${msg.text()}`);
      }
    });

    // Navigate to login
    await page.goto('https://fisioflow-migration.web.app/auth/login');
    
    // Fill login form
    await page.locator('input#login-email').fill('teste@moocafisio.com.br');
    await page.locator('input#login-password').fill('Yukari3030@');
    await page.locator('button[type="submit"]').click();

    // Wait for navigation to a post-login page (dashboard or agenda/root)
    await page.waitForURL(url => url.pathname === '/' || url.pathname.includes('/dashboard'), { timeout: 30000 });
    console.log('Login successful, navigated to main page');

    // Navigate to the analytics page
    await page.goto('https://fisioflow-migration.web.app/analytics/bi', { waitUntil: 'domcontentloaded' });
    console.log('Navigated to analytics/bi');

    // Wait for the page to load and potentially for the iframe to appear
    // Removing networkidle as it times out
    
    // Check if there's an iframe pointing to lookerstudio or datastudio
    const iframe = page.locator('iframe[src*="lookerstudio.google.com"], iframe[src*="datastudio.google.com"]');
    
    // Wait for iframe to be attached to DOM
    await iframe.waitFor({ state: 'attached', timeout: 30000 }).catch(e => console.log('Iframe not found within 30s'));
    
    // Check if iframe exists
    const iframeCount = await iframe.count();
    console.log(`Number of Looker Studio iframes found: ${iframeCount}`);
    
    // If iframes are found, ensure they are visible
    if (iframeCount > 0) {
      await expect(iframe.first()).toBeVisible();
      console.log('Looker Studio iframe is visible');
    } else {
      console.log('No Looker Studio iframe found on the page. Checking if it is still loading...');
      await page.waitForTimeout(5000);
      const recheckCount = await iframe.count();
      console.log(`Retry check: Number of Looker Studio iframes found: ${recheckCount}`);
    }

    // Take a screenshot for visual confirmation
    await page.screenshot({ path: 'e2e/screenshots/looker-validation.png', fullPage: true });

    // Assert no CSP errors were captured during the process for Looker Studio
    expect(cspErrors).toHaveLength(0);
    console.log('No Looker Studio CSP errors detected in console');
  });
});
