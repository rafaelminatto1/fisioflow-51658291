#!/usr/bin/env node
/**
 * Auditoria de erros no console em todas as páginas do FisioFlow.
 * Requer: aplicação rodando em BASE_URL (default http://127.0.0.1:8084)
 *
 * Uso:
 *   BASE_URL=http://127.0.0.1:8084 node scripts/check-console-errors-local.mjs
 *   E2E_LOGIN_EMAIL=user@example.com E2E_LOGIN_PASSWORD=pass node scripts/check-console-errors-local.mjs
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8084';
const LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL || 'rafael.minatto@yahoo.com.br';
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'Yukari30@';

// Páginas públicas (sem login)
const PUBLIC_ROUTES = [
  '/welcome',
  '/auth',
  '/pre-cadastro',
  '/install',
];

// Páginas protegidas (requerem login) - rotas principais sem parâmetros dinâmicos
const PROTECTED_ROUTES = [
  '/',
  '/dashboard',
  '/patients',
  '/patients/new',
  '/schedule',
  '/schedule/settings',
  '/exercises',
  '/protocols',
  '/financial',
  '/reports',
  '/settings',
  '/profile',
  '/medical-record',
  '/smart-ai',
  '/physiotherapy',
  '/telemedicine',
  '/exercise-library',
  '/biofeedback',
  '/communications',
  '/partner',
  '/waitlist',
  '/surveys',
  '/vouchers',
  '/eventos',
  '/eventos/analytics',
  '/notifications',
  '/cadastros/servicos',
  '/cadastros/fornecedores',
  '/cadastros/feriados',
  '/cadastros/atestados',
  '/cadastros/contratos',
  '/cadastros/templates-evolucao',
  '/cadastros/fichas-avaliacao',
  '/cadastros/objetivos',
  '/financeiro/contas',
  '/financeiro/fluxo-caixa',
  '/financeiro/nfse',
  '/financeiro/recibos',
  '/financeiro/demonstrativo',
  '/relatorios/aniversariantes',
  '/relatorios/comparecimento',
  '/relatorios/medico',
  '/relatorios/convenio',
  '/performance-equipe',
  '/configuracoes/calendario',
  '/crm',
  '/crm/leads',
  '/crm/campanhas',
  '/portal',
  '/tarefas',
  '/tarefas-v2',
  '/analytics',
  '/smart-dashboard',
  '/inventory',
  '/gamification',
  '/gamification/achievements',
  '/gamification/quests',
  '/gamification/shop',
  '/gamification/leaderboard',
  '/chatbot',
  '/clinical-tests',
  '/admin/analytics',
  '/admin/cohorts',
  '/projects',
  '/timetracking',
  '/wiki',
  '/automation',
  '/integrations',
];

function setupConsoleListeners(page, errors, warnings) {
  const shouldIgnoreError = (text, locUrl) => {
    if (!text || typeof text !== 'string') return false;
    if (text.includes('WebChannelConnection RPC') && text.includes('transport errored')) return true;
    if (text.includes('RunAggregationQuery') && text.includes('failed-precondition')) return true;
    if (text.includes('Invalid collection reference') && text.includes('organizations/time_entries')) return true;
    if (text.includes('Missing or insufficient permissions')) return true;
    if (text.includes('Failed to load resource') && text.includes('400')) return true;
    if ((text.includes('brotli') || text.includes('crypto-js')) && text.includes('does not provide an export named') && text.includes('default')) return true;
    return false;
  };

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    const loc = msg.location();
    const locUrl = loc?.url || '';

    if (type === 'error') {
      if (shouldIgnoreError(text, locUrl)) return;
      errors.push({ text, location: loc ? { url: loc.url, line: loc.lineNumber } : null });
    } else if (type === 'warning') {
      if (shouldIgnoreError(text, locUrl)) return;
      warnings.push({ text, location: loc ? { url: loc.url, line: loc.lineNumber } : null });
    }
  });

  page.on('pageerror', (err) => {
    if (shouldIgnoreError(err.message, '')) return;
    errors.push({
      text: err.message,
      stack: err.stack,
      type: 'pageerror',
    });
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    if (!failure) return;
    const url = req.url();
    const errText = failure.errorText || '';
    // Ignorar erros esperados em dev/headless
    if (errText === 'net::ERR_ABORTED') {
      if (url.includes('google-analytics.com') || url.includes('googletagmanager.com')) return;
      if (url.includes('firestore.googleapis.com') && (url.includes('Listen/channel') || url.includes('Write/channel'))) return;
      if (url.includes('cloudfunctions.net')) return;
      // Recursos locais/vite abortados ao navegar rapidamente (react-pdf, node_modules, src)
      if (url.includes('127.0.0.1') || url.includes('localhost')) return;
    }
    if (errText === 'net::ERR_BLOCKED_BY_ORB') {
      if (url.includes('firebasestorage.googleapis.com')) return;
    }
    if (errText === 'net::ERR_ABORTED' && url.includes('firebasestorage.googleapis.com')) return;
    if (url.includes('firestore.googleapis.com') && url.includes('runAggregationQuery')) return;
    if (url.includes('firestore.googleapis.com') && url.includes('documents:runAggregationQuery')) return;
    errors.push({
      text: `Request failed: ${url}`,
      errorText: failure.errorText,
      type: 'requestfailed',
    });
  });
}

async function collectForPage(page, url, label, errors, warnings) {
  errors.length = 0;
  warnings.length = 0;

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);
  } catch (err) {
    return {
      route: label || url,
      url,
      success: false,
      loadError: err.message,
      errors: [...errors],
      warnings: [...warnings],
    };
  }

  return {
    route: label || url,
    url: page.url(),
    success: true,
    errors: [...errors],
    warnings: [...warnings],
  };
}

async function doLogin(page) {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);

  const emailInput = page.locator('#login-email, input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  if ((await emailInput.count()) === 0 || (await passwordInput.count()) === 0) {
    console.log('  [SKIP] Formulário de login não encontrado');
    return false;
  }

  await emailInput.fill(LOGIN_EMAIL);
  await passwordInput.fill(LOGIN_PASSWORD);
  await submitBtn.click();

  try {
    await page.waitForURL((u) => !u.pathname.includes('/auth'), { timeout: 30000 });
  } catch {
    const errEl = page.locator('[data-testid="login-error"]');
    if (await errEl.isVisible()) {
      console.log('  [FAIL] Login falhou - credenciais inválidas');
      return false;
    }
  }

  await page.waitForTimeout(5000);
  return page.url().includes('/auth') ? false : true;
}

async function main() {
  console.log('========================================');
  console.log('Auditoria de Erros no Console - FisioFlow');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Login: ${LOGIN_EMAIL}`);
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  setupConsoleListeners(page, errors, warnings);

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    publicPages: [],
    protectedPages: [],
    summary: { totalErrors: 0, totalWarnings: 0, pagesWithErrors: 0 },
  };

  // 1. Páginas públicas
  console.log('--- Páginas públicas ---');
  for (const route of PUBLIC_ROUTES) {
    const url = `${BASE_URL}${route}`;
    process.stdout.write(`  ${route}... `);
    const result = await collectForPage(page, url, route, errors, warnings);
    report.publicPages.push(result);
    const errCount = result.errors?.length || 0;
    const warnCount = result.warnings?.length || 0;
    if (errCount > 0) {
      console.log(`${errCount} erros:`);
      result.errors.forEach(e => console.log(`    - ${e.text}`));
    } else {
      console.log(warnCount > 0 ? `${warnCount} warns` : 'ok');
    }
  }

  // 2. Login
  console.log('\n--- Login ---');
  process.stdout.write('  Fazendo login... ');
  const loggedIn = await doLogin(page);
  if (!loggedIn) {
    console.log('FALHOU. Pulando páginas protegidas.');
    report.loginSuccess = false;
  } else {
    console.log('OK');
    report.loginSuccess = true;

    // 3. Páginas protegidas
    console.log('\n--- Páginas protegidas ---');
    for (const route of PROTECTED_ROUTES) {
      const url = `${BASE_URL}${route}`;
      process.stdout.write(`  ${route}... `);
      const result = await collectForPage(page, url, route, errors, warnings);
      report.protectedPages.push(result);
      const errCount = result.errors?.length || 0;
      const warnCount = result.warnings?.length || 0;
      if (result.loadError) {
        console.log(`erro: ${result.loadError.slice(0, 50)}`);
      } else {
        console.log(errCount > 0 ? `${errCount} erros, ${warnCount} warns` : warnCount > 0 ? `${warnCount} warns` : 'ok');
      }
    }
  }

  await browser.close();

  // Resumo
  const allPages = [...report.publicPages, ...report.protectedPages];
  report.summary.totalErrors = allPages.reduce((s, p) => s + (p.errors?.length || 0), 0);
  report.summary.totalWarnings = allPages.reduce((s, p) => s + (p.warnings?.length || 0), 0);
  report.summary.pagesWithErrors = allPages.filter((p) => (p.errors?.length || 0) > 0).length;

  const outputPath = resolve(process.cwd(), 'console-errors-report.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('\n========================================');
  console.log('Resumo');
  console.log('========================================');
  console.log(`Total de erros: ${report.summary.totalErrors}`);
  console.log(`Total de warnings: ${report.summary.totalWarnings}`);
  console.log(`Páginas com erros: ${report.summary.pagesWithErrors}`);
  console.log(`Relatório salvo em: ${outputPath}`);
  console.log('');

  process.exit(report.summary.totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
