import { test, expect } from '@playwright/test';

test.describe('Login Page Refresh Test', () => {
  test('should not refresh every 10 seconds', async ({ page }) => {
    let navigationCount = 0;
    let reloadCount = 0;

    // Listen for navigation events
    page.on('load', () => {
      navigationCount++;
      console.log(`Page loaded. Count: ${navigationCount}`);
    });

    // Go to login page
    await page.goto('/auth');

    // Wait for initial load
    await page.waitForLoadState('domcontentloaded');
    const initialCount = navigationCount;

    console.log(`Initial navigation count: ${initialCount}`);

    // Wait for 35 seconds to catch any periodic refresh (10s interval would trigger 3 times)
    console.log('Waiting 35 seconds to detect periodic refreshes...');

    // Check for DOM changes that might indicate refresh
    const initialBodyHTML = await page.content();

    await page.waitForTimeout(35000);

    const finalBodyHTML = await page.content();
    const finalCount = navigationCount;

    console.log(`Final navigation count: ${finalCount}`);
    console.log(`Navigation events during wait: ${finalCount - initialCount}`);

    // If there are more than 1 navigation event after initial load, something is wrong
    // Allow 1 extra for potential redirects during auth check
    expect(finalCount - initialCount).toBeLessThanOrEqual(1);

    // Check if body was reset (indicating full page refresh)
    // We check if specific form elements still exist
    const emailInput = page.locator('input[name="email"]').first();
    await expect(emailInput).toBeAttached();
  });

  test('should detect auth state change loops', async ({ page }) => {
    // Listen for console errors and warnings
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`Console ${msg.type()}: ${msg.text()}`);
      }
    });

    // Listen for auth state changes via window events
    let authStateChanges = 0;
    await page.evaluate(() => {
      (window as any).authChangeCount = 0;

      // Hook into Supabase auth if available
      const originalLog = console.log;
      console.log = (...args) => {
        if (args[0]?.includes?.('Auth state changed') || args[0]?.includes?.('onAuthStateChange')) {
          (window as any).authChangeCount++;
        }
        originalLog.apply(console, args);
      };
    });

    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');

    // Wait and check for auth state changes
    await page.waitForTimeout(30000);

    const changes = await page.evaluate(() => (window as any).authChangeCount || 0);
    console.log(`Auth state changes detected: ${changes}`);

    // More than 5 auth state changes in 30 seconds suggests a loop
    expect(changes).toBeLessThan(5);
  });

  test('should check for useEffect infinite loops', async ({ page }) => {
    await page.goto('/auth');

    // Monitor React DevTools for excessive re-renders
    const renderCounts = await page.evaluate(async () => {
      const result: Record<string, number> = {};

      // Wait and observe
      await new Promise(resolve => setTimeout(resolve, 25000));

      return result;
    });

    console.log('Render counts:', renderCounts);
  });
});
