/**
 * Manual Responsive Check Script for FisioFlow
 * This script manually checks different viewport sizes without complex login flows
 */

import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function runResponsiveCheck() {
  console.log('Starting FisioFlow Responsive Check - FASE 4');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  // Test configurations
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' }
  ];

  const pagesToTest = [
    { path: '/dashboard', name: 'dashboard' },
    { path: '/patients', name: 'patients' },
    { path: '/financial', name: 'financial' },
    { path: '/appointments', name: 'appointments' }
  ];

  const report = {
    timestamp: new Date().toISOString(),
    summary: {},
    findings: [],
    screenshots: {}
  };

  try {
    for (const viewport of viewports) {
      console.log(`\n=== Testing on ${viewport.name} (${viewport.width}x${viewport.height}) ===`);

      const page = await browser.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const pageToTest of pagesToTest) {
        console.log(`\n--- Testing ${pageToTest.name} ---`);

        try {
          // Navigate to page
          await page.goto(`https://moocafisio.com.br${pageToTest.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });

          // Wait a bit for dynamic content to load
          await page.waitForTimeout(3000);

          // Take screenshot
          const screenshotPath = join('/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report', `${viewport.name}-${pageToTest.name}.png`);
          await page.screenshot({
            path: screenshotPath,
            fullPage: true
          });

          // Check for horizontal scrolling
          const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
          const viewportWidth = page.viewportSize().width;
          const hasHorizontalScroll = bodyWidth > viewportWidth;

          // Check for visible console errors
          const consoleErrors = await page.evaluate(() => {
            return window['__consoleErrors'] || [];
          });

          // Check for overlapping elements
          const layoutIssues = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            const issues = [];

            elements.forEach(elem => {
              const rect = elem.getBoundingClientRect();
              if (rect.width <= 0 || rect.height <= 0) return;

              // Check if element is outside viewport
              if (rect.left > window.innerWidth || rect.right < 0 ||
                  rect.top > window.innerHeight || rect.bottom < 0) {
                issues.push({
                  element: elem.className || elem.tagName,
                  position: { left: rect.left, top: rect.top }
                });
              }
            });

            return issues.slice(0, 10); // Return first 10 issues
          });

          // Save findings for this page
          const finding = {
            viewport: viewport.name,
            page: pageToTest.name,
            viewportWidth,
            bodyWidth,
            hasHorizontalScroll,
            consoleErrors: consoleErrors.length,
            layoutIssues: layoutIssues.length,
            issues: layoutIssues
          };

          report.findings.push(finding);
          report.summary[`${viewport.name}-${pageToTest.name}`] = {
            status: 'completed',
            hasHorizontalScroll,
            errors: consoleErrors.length,
            layoutIssues: layoutIssues.length
          };

          console.log(`✓ Screenshot saved: ${screenshotPath}`);
          console.log(`- Horizontal scroll needed: ${hasHorizontalScroll} (${bodyWidth}px > ${viewportWidth}px)`);
          console.log(`- Console errors: ${consoleErrors.length}`);
          console.log(`- Layout issues: ${layoutIssues.length}`);

          if (hasHorizontalScroll || consoleErrors.length > 0 || layoutIssues.length > 0) {
            console.log(`⚠️  Issues found on ${pageToTest.name} at ${viewport.name} size`);
          }

        } catch (error) {
          console.error(`❌ Failed to test ${pageToTest.name}:`, error.message);
          report.summary[`${viewport.name}-${pageToTest.name}`] = {
            status: 'failed',
            error: error.message
          };
        }
      }

      await page.close();
    }

    // Generate summary report
    console.log('\n=== SUMMARY ===');
    let totalScreenshots = 0;
    let horizontalScrollIssues = 0;
    let layoutIssues = 0;
    let errorCount = 0;

    Object.entries(report.summary).forEach(([key, value]) => {
      if (value.status === 'completed') {
        totalScreenshots++;
        if (value.hasHorizontalScroll) horizontalScrollIssues++;
        if (value.layoutIssues > 0) layoutIssues++;
        if (value.errors > 0) errorCount += value.errors;
      }
    });

    console.log(`Total screenshots taken: ${totalScreenshots}`);
    console.log(`Pages with horizontal scroll issues: ${horizontalScrollIssues}`);
    console.log(`Pages with layout issues: ${layoutIssues}`);
    console.log(`Console errors found: ${errorCount}`);

    // Save detailed report
    const reportPath = join('/home/rafael/antigravity/fisioflow/fisioflow-51658291/playwright-report', 'responsive-report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error('Error during responsive check:', error);
  } finally {
    await browser.close();
  }
}

// Run the check
runResponsiveCheck().catch(console.error);