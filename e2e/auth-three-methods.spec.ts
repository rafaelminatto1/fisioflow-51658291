/**
 * Testa a página de login e os 3 métodos: email, Google (Gmail), Apple.
 * - Login por email: fluxo completo com credenciais.
 * - Botões OAuth (Google, Apple): presença e acessibilidade; popup não é concluído em E2E.
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;

test.describe('Login - 3 métodos (email, Gmail, Apple)', () => {
  test('página /auth exibe formulário de email e botões OAuth (Google, GitHub, Apple)', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // Formulário de email/senha
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Entrar na Plataforma")')).toBeVisible();

    // Botões OAuth
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /GitHub/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Apple/i })).toBeVisible();
  });

  // Teste de login com credenciais válidas: requer usuário existente no Firebase.
  // Rode com E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD no .env.test (ou env) para executar.
  test('login por email com credenciais válidas redireciona para /', async ({ page }) => {
    const useRealCredentials = process.env.E2E_TEST_VALID_LOGIN === '1';
    test.skip(!useRealCredentials, 'Defina E2E_TEST_VALID_LOGIN=1 para testar login com credenciais válidas (email/senha no Firebase)');
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    await page.fill('#login-email', loginEmail);
    await page.fill('#login-password', loginPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(\?|$)/, { timeout: 15000 });
  });

  test('login por email com credenciais inválidas exibe erro e toast', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    await page.fill('#login-email', 'invalido@example.com');
    await page.fill('#login-password', 'senhaErrada123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/auth/);
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 8000 });
  });

  test('botão Google está clicável e não quebra a página', async ({ page, context }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    const googleButton = page.getByRole('button', { name: /Google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();

    // Clicar no Google pode abrir popup; não esperamos concluir OAuth no E2E
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
      googleButton.click(),
    ]);
    if (popup) {
      await popup.close().catch(() => {});
    }
    await expect(page).toHaveURL(/\/auth/);
  });

  test('botão Apple está clicável e não quebra a página', async ({ page, context }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    const appleButton = page.getByRole('button', { name: /Apple/i });
    await expect(appleButton).toBeVisible();
    await expect(appleButton).toBeEnabled();

    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
      appleButton.click(),
    ]);
    if (popup) {
      await popup.close().catch(() => {});
    }
    await expect(page).toHaveURL(/\/auth/);
  });
});
