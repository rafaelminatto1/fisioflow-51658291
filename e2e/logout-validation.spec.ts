/**
 * Validação manual do fix de logout em produção.
 * Roda direto contra https://fisioflow.pages.dev (sem storageState pré-existente).
 */
import { test, expect } from '@playwright/test';

const BASE = 'https://fisioflow.pages.dev';
const EMAIL = 'REDACTED_EMAIL';
const PASSWORD = 'REDACTED';

test.use({ storageState: { cookies: [], origins: [] } }); // sessão limpa

test('login e logout devem redirecionar para /auth/login', async ({ page }) => {
  // ── 1. Login ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });

  // Aguarda o splash screen sumir e o formulário aparecer
  await page.locator('#initial-loader').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();

  // Aguarda sair do /auth
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 30000 });
  console.log('✅ Login OK — URL:', page.url());

  // Confirma que o dashboard carregou
  await page.waitForSelector('[data-testid="main-layout"], [data-testid="user-menu"], h1', {
    timeout: 20000,
  });
  console.log('✅ Dashboard carregado');

  // ── 2. Logout ─────────────────────────────────────────────────────────────
  // Tenta o botão da sidebar primeiro, depois o do header mobile
  const logoutButton = page
    .getByText(/Encerrar Sessão|Sair do Sistema/i)
    .first();

  await logoutButton.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Botão de logout encontrado');
  await logoutButton.click();

  // ── 3. Verifica redirecionamento ──────────────────────────────────────────
  await page.waitForURL((url) => url.pathname.startsWith('/auth'), { timeout: 15000 });
  console.log('✅ Redirecionado para:', page.url());

  expect(page.url()).toContain('/auth');

  // ── 4. Garante que não volta ao dashboard sem re-login ────────────────────
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => url.pathname.startsWith('/auth'), { timeout: 10000 });
  console.log('✅ Acesso ao /dashboard sem sessão bloqueado corretamente:', page.url());

  expect(page.url()).toContain('/auth');
});
