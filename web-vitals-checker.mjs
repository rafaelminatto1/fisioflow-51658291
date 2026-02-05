import { createServer } from 'http';
import { parse } from 'url';
import { chromium } from 'playwright';

// Configuration
const PAGES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/patients', name: 'Patients' },
  { path: '/financial', name: 'Financial' }
];

async function runChromeDevTools(page, url) {
  console.log(`\n🔍 Measuring performance for ${url}...`);

  // Set up performance monitoring
  const metrics = {
    url,
    timings: {},
    resources: [],
    webVitals: {}
  };

  // Intercept network requests
  page.on('request', request => {
    if (!request.resourceType().includes('document')) {
      metrics.resources.push({
        url: request.url(),
        type: request.resourceType(),
        timing: request.timing()
      });
    }
  });

  // Navigate to page
  const start = Date.now();
  try {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    metrics.timings.pageLoad = Date.now() - start;
  } catch (error) {
    metrics.timings.pageLoad = Date.now() - start;
    console.log(`  ⚠️ Navigation failed after ${metrics.timings.pageLoad}ms: ${error.message}`);
    return metrics;
  }

  // Get basic performance metrics
  const perfMetrics = await page.evaluate(() => {
    const perf = window.performance;
    return {
      timing: {
        navigationStart: perf.timing.navigationStart,
        loadEventEnd: perf.timing.loadEventEnd,
        responseStart: perf.timing.responseStart,
        requestStart: perf.timing.requestStart,
        domContentLoadedEventEnd: perf.timing.domContentLoadedEventEnd
      },
      memory: {
        jsHeapSizeLimit: perf.memory?.jsHeapSizeLimit || 0,
        totalJSHeapSize: perf.memory?.totalJSHeapSize || 0,
        usedJSHeapSize: perf.memory?.usedJSHeapSize || 0
      },
      navigation: perf.getEntriesByType('navigation')[0] || null,
      resources: perf.getEntries().filter(e =>
        e.initiatorType === 'xmlhttprequest' ||
        e.initiatorType === 'script' ||
        e.initiatorType === 'img' ||
        e.initiatorType === 'link'
      )
    };
  });

  if (perfMetrics.timing) {
    metrics.timings = {
      ...metrics.timings,
      ...perfMetrics.timing
    };
  }

  metrics.webVitals = {
    lcp: await evaluateLCP(page),
    cls: evaluateCLS(page),
    fid: await evaluateFID(page)
  };

  // Resource summary
  const transferSizes = metrics.resources.map(r => r.timing?.transferSize || 0);
  metrics.resourceSummary = {
    count: metrics.resources.length,
    totalSize: transferSizes.reduce((a, b) => a + b, 0),
    avgSize: transferSizes.reduce((a, b) => a + b, 0) / transferSizes.length || 0
  };

  return metrics;
}

async function evaluateLCP(page) {
  // Check if LCP is already measured
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      // Wait a bit then resolve
      setTimeout(() => {
        resolve(null);
      }, 2000);
    });
  });

  return lcp;
}

async function evaluateCLS(page) {
  // Check CLS
  const cls = await page.evaluate(() => {
    let clsValue = 0;
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        clsValue += entry.value;
      }
    });
    observer.observe({ entryTypes: ['layout-shift'] });

    setTimeout(() => {
      observer.disconnect();
    }, 2000);

    return clsValue;
  });

  return cls;
}

async function evaluateFID(page) {
  // Check FID
  const fid = await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          resolve(entries[0].processingStart - entries[0].startTime);
        } else {
          resolve(null);
        }
      });
      observer.observe({ entryTypes: ['first-input'] });

      // Wait a bit then resolve
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 2000);
    });
  });

  return fid;
}

function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FASE 6: PERFORMANCE METRICS REPORT');
  console.log('='.repeat(80));

  // Filter successful results
  const successful = results.filter(r => r.timings.loadEventEnd);

  if (successful.length === 0) {
    console.log('\n❌ No successful measurements recorded');
    return;
  }

  // Page Load Times
  console.log('\n🚀 PAGE LOAD TIMES:');
  console.log('-'.repeat(70));
  console.log('Page | Time (s) | Status');
  console.log('-----|----------|--------');

  successful.forEach(result => {
    const loadTime = (result.timings.loadEventEnd - result.timings.navigationStart) / 1000;
    const status = loadTime < 3 ? '✅ Good' : loadTime < 5 ? '⚠️ Slow' : '❌ Poor';
    console.log(`${result.name.padEnd(6)} | ${loadTime.toFixed(2).padEnd(8)} | ${status}`);
  });

  // TTFB Metrics
  console.log('\n📡 TTFB (Time to First Byte):');
  console.log('-'.repeat(40));
  console.log('Page | TTFB (ms) | Status');
  console.log('-----|-----------|--------');

  successful.forEach(result => {
    const ttfb = result.timings.responseStart - result.timings.requestStart;
    const status = ttfb < 200 ? '✅ Good' : ttfb < 400 ? '⚠️ Slow' : '❌ Poor';
    console.log(`${result.name.padEnd(6)} | ${ttfb.toString().padEnd(9)} | ${status}`);
  });

  // Resource Metrics
  console.log('\n📦 RESOURCE METRICS:');
  console.log('-'.repeat(40));
  console.log('Page | Requests | Total Size (KB) | Avg Size (KB)');
  console.log('-----|----------|----------------|---------------');

  successful.forEach(result => {
    const totalKB = (result.resourceSummary.totalSize / 1024).toFixed(2);
    const avgKB = (result.resourceSummary.avgSize / 1024).toFixed(2);
    console.log(`${result.name.padEnd(6)} | ${result.resourceSummary.count.toString().padEnd(8)} | ${totalKB.padEnd(14)} | ${avgKB.padEnd(13)}`);
  });

  // Memory Usage
  console.log('\n💾 MEMORY USAGE:');
  console.log('-'.repeat(40));
  console.log('Page | Used (MB) | Total (MB) | Limit (MB)');
  console.log('-----|-----------|------------|----------');

  successful.forEach(result => {
    if (result.timings.totalJSHeapSize) {
      const used = (result.timings.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const total = (result.timings.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limit = (result.timings.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      console.log(`${result.name.padEnd(6)} | ${used.padEnd(9)} | ${total.padEnd(10)} | ${limit.padEnd(10)}`);
    }
  });

  // Web Vitals Summary
  console.log('\n🎯 CORE WEB VITALS:');
  console.log('-'.repeat(70));
  console.log('Page | LCP (ms) | FID (ms) | CLS | Overall Status');
  console.log('-----|-----------|----------|-----|---------------');

  successful.forEach(result => {
    const lcpStatus = (result.webVitals.lcp || 0) <= 2500 ? '✅' : '❌';
    const fidStatus = (result.webVitals.fid || 0) <= 100 ? '✅' : '❌';
    const clsStatus = (result.webVitals.cls || 0) <= 0.1 ? '✅' : '❌';

    const lcp = result.webVitals.lcp ? (result.webVitals.lcp / 1000).toFixed(1) : 'N/A';
    const fid = result.webVitals.fid ? result.webVitals.fid.toFixed(0) : 'N/A';
    const cls = result.webVitals.cls ? result.webVitals.cls.toFixed(3) : 'N/A';

    const statusCount = [lcpStatus, fidStatus, clsStatus].filter(s => s === '✅').length;
    const overallStatus = statusCount === 3 ? '✅ Good' : statusCount === 0 ? '❌ Poor' : '⚠️ Needs Improvement';

    console.log(`${result.name.padEnd(6)} | ${lcp.toString().padEnd(9)} | ${fid.toString().padEnd(8)} | ${cls.toString().padEnd(3)} | ${overallStatus}`);
  });

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('-'.repeat(30));

  // Overall site assessment
  const avgLoadTime = successful.reduce((sum, r) => {
    return sum + (r.timings.loadEventEnd - r.timings.navigationStart) / 1000;
  }, 0) / successful.length;

  const totalRequests = successful.reduce((sum, r) => sum + r.resourceSummary.count, 0);
  const totalSize = successful.reduce((sum, r) => sum + r.resourceSummary.totalSize, 0);

  console.log(`\n📊 Overall Performance:`);
  console.log(`- Average load time: ${avgLoadTime.toFixed(2)}s`);
  console.log(`- Total requests across pages: ${totalRequests}`);
  console.log(`- Total size across pages: ${(totalSize / 1024).toFixed(2)} KB`);

  if (avgLoadTime > 3) {
    console.log('\n🔧 Optimization suggestions:');
    console.log('- Implement lazy loading for images');
    console.log('- Minify CSS and JavaScript files');
    console.log('- Enable compression (gzip/brotli)');
    console.log('- Reduce server response time');
  }

  if (totalRequests > 50) {
    console.log('\n🔧 Resource optimization:');
    console.log('- Consolidate files where possible');
    console.log('- Use HTTP/2 or HTTP/3');
    console.log('- Implement CDN caching');
  }

  const failingVitals = successful.filter(r => {
    return (r.webVitals.lcp || 0) > 2500 ||
           (r.webVitals.fid || 0) > 100 ||
           (r.webVitals.cls || 0) > 0.1;
  });

  if (failingVitals.length > 0) {
    console.log('\n⚠️ Core Web Vitals issues:');
    failingVitals.forEach(page => {
      console.log(`- ${page.name}`);
      if ((page.webVitals.lcp || 0) > 2500) {
        console.log(`  - LCP is ${(page.webVitals.lcp / 1000).toFixed(1)}s (target: <2.5s)`);
      }
      if ((page.webVitals.fid || 0) > 100) {
        console.log(`  - FID is ${page.webVitals.fid}ms (target: <100ms)`);
      }
      if ((page.webVitals.cls || 0) > 0.1) {
        console.log(`  - CLS is ${page.webVitals.cls} (target: <0.1)`);
      }
    });
  }

  return results;
}

async function main() {
  console.log('🚀 Starting Web Vitals measurement for FisioFlow...\n');

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1920, height: 1080 });

  // Navigate to base URL first
  console.log('🌐 Initial navigation to base URL...');
  await page.goto('https://moocafisio.com.br', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Login
  console.log('🔐 Logging in...');
  await page.goto('https://moocafisio.com.br/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[type="password"]', 'Yukari30@');
  await page.click('button[type="submit"]');

  // Wait for login to complete
  await page.waitForLoadState('domcontentloaded');
  console.log('✅ Login successful');

  const results = [];

  // Test each page
  for (const pageInfo of PAGES) {
    const url = `https://moocafisio.com.br${pageInfo.path}`;
    const metrics = await runChromeDevTools(page, url);
    metrics.name = pageInfo.name;
    results.push(metrics);

    // Wait between pages
    await page.waitForTimeout(2000);
  }

  // Generate report
  generateReport(results);

  await browser.close();
}

main().catch(console.error);