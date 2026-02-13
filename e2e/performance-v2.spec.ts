import { test, expect } from '@playwright/test';

test.describe('Performance V2 - Core Web Vitals', () => {
  const pages = [
    { name: 'Home', path: '/' },
    { name: 'Login', path: '/login' },
  ];

  for (const pageInfo of pages) {
    test(`Detailed Performance for ${pageInfo.name}`, async ({ page }) => {
      // Connect to CDP session to get advanced metrics
      const client = await page.context().newCDPSession(page);
      await client.send('Performance.enable');

      await page.goto(pageInfo.path, { waitUntil: 'networkidle' });

      // Get Web Vitals via page.evaluate
      const vitals = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let lcp = 0;
          let cls = 0;
          
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            lcp = entries[entries.length - 1].startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });

          // Wait a bit to capture LCP and CLS
          setTimeout(() => {
            const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            resolve({
              lcp,
              cls,
              ttfb: nav.responseStart - nav.requestStart,
              domInteractive: nav.domInteractive,
              loadTime: nav.loadEventEnd
            });
          }, 2000);
        });
      }) as any;

      console.log(`
Web Vitals for ${pageInfo.name}:`);
      console.log(`- LCP: ${vitals.lcp.toFixed(2)}ms`);
      console.log(`- CLS: ${vitals.cls.toFixed(4)}`);
      console.log(`- TTFB: ${vitals.ttfb.toFixed(2)}ms`);
      console.log(`- DOM Interactive: ${vitals.domInteractive.toFixed(2)}ms`);
      console.log(`- Full Load: ${vitals.loadTime.toFixed(2)}ms`);

      expect(vitals.lcp).toBeLessThan(2500); // LCP ideal < 2.5s
      expect(vitals.cls).toBeLessThan(0.1);   // CLS ideal < 0.1
    });
  }
});
