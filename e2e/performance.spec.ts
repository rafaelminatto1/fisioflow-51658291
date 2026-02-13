import { test, expect } from '@playwright/test';

test.describe('Performance Validation', () => {
  const pages = [
    { name: 'Home', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'NotFound', path: '/404-test-page' },
  ];

  for (const pageInfo of pages) {
    test(`Performance audit for ${pageInfo.name}`, async ({ page }) => {
      const start = Date.now();
      
      // Navigate to the page
      const response = await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
      expect(response?.status()).toBeLessThan(500); // 404 is fine for the test, but not 500

      const end = Date.now();
      const totalLoadTime = end - start;

      // Extract performance metrics from the browser
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          ttfb: nav.responseStart - nav.requestStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
          loadEvent: nav.loadEventEnd - nav.loadEventStart,
          totalTime: nav.loadEventEnd - nav.fetchStart,
        };
      });

      console.log(`\nMetrics for ${pageInfo.name} (${pageInfo.path}):`);
      console.log(`- Total Duration (Playwright): ${totalLoadTime}ms`);
      console.log(`- TTFB: ${metrics.ttfb.toFixed(2)}ms`);
      console.log(`- DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
      console.log(`- Load Event: ${metrics.loadEvent.toFixed(2)}ms`);
      console.log(`- Browser Total Time: ${metrics.totalTime.toFixed(2)}ms`);

      // Performance Thresholds
      expect(metrics.totalTime).toBeLessThan(5000); // Exemplo: menos de 5s
    });
  }
});
