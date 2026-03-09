/**
 * Validação do fix de logout em produção.
 * Testa se o logout invalida a sessão no servidor (cookie limpo + reload bloqueado).
 */
import { test, expect } from '@playwright/test';

const BASE = 'https://fisioflow.pages.dev';
const EMAIL = 'rafael.minatto@yahoo.com.br';
const PASSWORD = 'Yukari30@';

test.use({
  storageState: { cookies: [], origins: [] },
  baseURL: BASE,
});

test('login e logout devem invalidar sessão no servidor', async ({ page }) => {
  // Captura TODAS as requisições/respostas para diagnóstico
  const allRequests: { method: string; url: string }[] = [];
  const allResponses: { url: string; status: number }[] = [];
  const consoleMessages: string[] = [];

  page.on('request', (req) => {
    if (req.url().includes('neonauth') || req.url().includes('sign-out') || req.url().includes('signout')) {
      allRequests.push({ method: req.method(), url: req.url() });
    }
  });
  page.on('response', (resp) => {
    if (resp.url().includes('neonauth') || resp.url().includes('sign-out') || resp.url().includes('signout')) {
      allResponses.push({ url: resp.url(), status: resp.status() });
    }
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('neonauth') || req.url().includes('sign-out')) {
      console.log('❌ Request FALHOU:', req.method(), req.url(), req.failure()?.errorText);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'warn' || msg.type() === 'error') {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  // ── 1. Login ───────────────────────────────────────────────────────────────
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const emailInput = page.locator('#login-email');
  await emailInput.waitFor({ state: 'visible', timeout: 35000 });
  console.log('✅ Formulário de login visível');

  await emailInput.click();
  await emailInput.type(EMAIL, { delay: 30 });
  const passwordInput = page.locator('#login-password');
  await passwordInput.click();
  await passwordInput.type(PASSWORD, { delay: 30 });
  await expect(emailInput).toHaveValue(EMAIL);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 40000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);
  console.log('✅ Login OK — URL:', page.url());

  await page.waitForSelector('nav, main, [data-testid="main-layout"]', { timeout: 20000 });
  console.log('✅ Dashboard carregado');

  // ── 2. Captura token de sessão antes do logout ─────────────────────────────
  const cookiesBefore = await page.context().cookies();
  const sessionCookie = cookiesBefore.find(c => c.name === '__Secure-neon-auth.session_token');
  const sessionToken = sessionCookie?.value;
  console.log('🍪 Session token antes do logout:', sessionToken ? `${sessionToken.slice(0, 20)}...` : 'NENHUM');

  // ── 3. Logout ─────────────────────────────────────────────────────────────
  const logoutBtn = page.getByText(/Encerrar Sessão|Sair do Sistema/i).first();
  await logoutBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Botão de logout encontrado');

  // Limpa histórico de requests antes do logout
  allRequests.length = 0;
  allResponses.length = 0;

  await logoutBtn.click();
  await page.waitForURL((url) => url.pathname.startsWith('/auth'), { timeout: 15000 });
  console.log('✅ Redirecionado após logout:', page.url());
  expect(page.url()).toContain('/auth');

  // Aguarda requests de signOut terminarem
  await page.waitForTimeout(3000);

  console.log('📡 Requisições feitas no logout:', allRequests.length > 0 ? allRequests : 'NENHUMA');
  console.log('📡 Respostas recebidas no logout:', allResponses.length > 0 ? allResponses : 'NENHUMA');
  if (consoleMessages.length > 0) {
    console.log('⚠️  Console warnings/errors:', consoleMessages.join('\n'));
  }

  const cookiesAfter = await page.context().cookies();
  const sessionCookieAfter = cookiesAfter.find(c => c.name === '__Secure-neon-auth.session_token');
  console.log('🍪 Session cookie após logout:', sessionCookieAfter
    ? `PRESENTE (value: ${sessionCookieAfter.value.slice(0, 10)}...)`
    : 'REMOVIDO ✅'
  );

  // ── 4. Verificação REAL: recarregar /dashboard SEM limpar cookies manualmente ──
  // Se a sessão foi invalidada no servidor, o cookie (mesmo presente) não autentica
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForURL((url) => url.pathname.startsWith('/auth'), { timeout: 15000 });
  console.log('✅ /dashboard após logout (com cookies originais) bloqueado:', page.url());
  expect(page.url()).toContain('/auth');
});
