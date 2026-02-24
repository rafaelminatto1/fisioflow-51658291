#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox } from 'playwright';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.test', override: false, quiet: true });

const DEFAULT_BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const DEFAULT_ROUTES = ['/', '/dashboard', '/patients', '/financial', '/reports'];
const DEFAULT_EMAIL = process.env.E2E_LOGIN_EMAIL || process.env.TEST_EMAIL || 'teste@moocafisio.com.br';
const DEFAULT_PASSWORD = process.env.E2E_LOGIN_PASSWORD || process.env.TEST_PASSWORD || 'Yukari3030@';

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    routes: DEFAULT_ROUTES,
    output: '',
    noLogin: false,
    timeoutMs: 45000,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--base-url' && argv[i + 1]) {
      args.baseUrl = argv[++i];
    } else if (token === '--routes' && argv[i + 1]) {
      args.routes = argv[++i]
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    } else if (token === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    } else if (token === '--no-login') {
      args.noLogin = true;
    } else if (token === '--timeout-ms' && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (!Number.isNaN(parsed) && parsed > 0) args.timeoutMs = parsed;
    }
  }

  return args;
}

async function loginIfNeeded(page, baseUrl, timeoutMs) {
  const startedAt = Date.now();

  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: timeoutMs });

  const authPageReadyMs = Date.now() - startedAt;

  if (!DEFAULT_EMAIL || !DEFAULT_PASSWORD) {
    throw new Error('Credenciais ausentes. Defina E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD.');
  }

  await page.locator('input[type="email"], input[name="email"]').first().fill(DEFAULT_EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(DEFAULT_PASSWORD);

  const submitStartedAt = Date.now();
  await page.getByRole('button', { name: /Acessar Minha Conta|Entrar na Plataforma|Entrar/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: timeoutMs });

  return {
    authPageReadyMs,
    afterSubmitToProtectedMs: Date.now() - submitStartedAt,
    finalUrl: page.url(),
  };
}

async function measureRoute(page, baseUrl, route, timeoutMs) {
  const consoleErrors = [];
  const pageErrors = [];

  const onConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onPageError = (error) => {
    pageErrors.push(String(error));
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  const startedAt = Date.now();
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForTimeout(2000);
  const totalMs = Date.now() - startedAt;

  const navMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      domMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadMs: nav ? Math.round(nav.loadEventEnd) : null,
    };
  });

  page.off('console', onConsole);
  page.off('pageerror', onPageError);

  return {
    route,
    totalMs,
    domMs: navMetrics.domMs,
    loadMs: navMetrics.loadMs,
    finalUrl: page.url(),
    redirectedToAuth: page.url().includes('/auth'),
    consoleErrorCount: consoleErrors.length,
    pageErrorCount: pageErrors.length,
    sampleConsoleErrors: consoleErrors.slice(0, 3),
    samplePageErrors: pageErrors.slice(0, 3),
  };
}

function printSummary(report) {
  const sorted = [...report.routes].sort((a, b) => b.totalMs - a.totalMs);
  const top = sorted.slice(0, 10);

  console.log('\n=== Perf Routes Summary ===');
  if (report.login) {
    console.log(`Login page ready: ${report.login.authPageReadyMs}ms`);
    console.log(`Login submit -> protected: ${report.login.afterSubmitToProtectedMs}ms`);
  }
  console.table(
    top.map((r, index) => ({
      rank: index + 1,
      route: r.route,
      totalMs: r.totalMs,
      domMs: r.domMs,
      loadMs: r.loadMs,
      errors: r.consoleErrorCount + r.pageErrorCount,
      redirectedToAuth: r.redirectedToAuth,
    }))
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let browser;
  let selectedBrowser = 'chromium';

  const launchers = [
    async () => {
      selectedBrowser = 'chromium';
      return chromium.launch({ headless: true, timeout: 15000 });
    },
    async () => {
      selectedBrowser = 'chromium';
      return chromium.launch({
        headless: true,
        timeout: 15000,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    },
    async () => {
      selectedBrowser = 'firefox';
      return firefox.launch({ headless: true, timeout: 15000 });
    },
  ];

  let lastLaunchError = null;
  for (const launch of launchers) {
    try {
      browser = await launch();
      break;
    } catch (error) {
      lastLaunchError = error;
    }
  }

  if (!browser) {
    throw lastLaunchError || new Error('Could not launch any browser');
  }
  const context = await browser.newContext();
  const page = await context.newPage();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    browser: selectedBrowser,
    routes: [],
    login: null,
  };

  try {
    if (!args.noLogin) {
      report.login = await loginIfNeeded(page, args.baseUrl, args.timeoutMs);
    }

    for (const route of args.routes) {
      const normalized = route.startsWith('/') ? route : `/${route}`;
      const result = await measureRoute(page, args.baseUrl, normalized, args.timeoutMs);
      report.routes.push(result);
    }
  } finally {
    await browser.close();
  }

  printSummary(report);

  if (args.output) {
    const outputPath = path.resolve(args.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved: ${outputPath}`);
  }
}

main().catch((error) => {
  console.error('\nperf-routes failed:');
  console.error(error);
  process.exit(1);
});
