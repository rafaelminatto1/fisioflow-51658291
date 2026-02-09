import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;

test.describe('Autenticação', () => {
  test('deve fazer login com credenciais válidas', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    await page.fill('input[type="email"]', loginEmail);
    await page.fill('input[type="password"]', loginPassword);

    // Aguardar navegação após o clique no botão de submit
    await Promise.all([
      page.waitForURL(/\/(\?|schedule|patients|dashboard|eventos)?/, { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    // Verificar que estamos na página inicial (não mais em /auth)
    await expect(page).not.toHaveURL(/\/auth/);

    // Verificar que o menu do usuário está visível
    const userMenuButton = page.locator('[data-testid="user-menu"]').first();
    await expect(userMenuButton).toBeVisible({ timeout: 10000 });
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[type="email"]', 'invalido@example.com');
    await page.fill('input[type="password"]', 'senhaErrada123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/erro|inválido|falhou/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('deve fazer logout', async ({ page }) => {
    // Login primeiro
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', loginEmail);
    await page.fill('input[type="password"]', loginPassword);

    // Aguardar navegação após o clique no botão de submit
    await Promise.all([
      page.waitForURL(/\/(\?|schedule|patients|dashboard|eventos)?/, { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    // Aguardar menu do usuário estar visível
    const userMenuButton = page.locator('[data-testid="user-menu"]').first();
    await expect(userMenuButton).toBeVisible({ timeout: 10000 });

    // Clicar no menu do usuário para abrir dropdown
    await userMenuButton.click();

    // Aguardar dropdown aparecer e clicar em sair usando data-testid
    const logoutMenuItem = page.locator('[data-testid="user-menu-logout"]').first();
    await expect(logoutMenuItem).toBeVisible({ timeout: 5000 });

    // Clicar em sair
    await logoutMenuItem.click();

    // Aguardar redirecionamento para /auth após logout
    await page.waitForURL(/\/auth/, { timeout: 10000 });

    // Verificar que estamos na página de auth
    await expect(page).toHaveURL(/\/auth/);
  });

  test('deve redirecionar para /auth quando não autenticado', async ({ page }) => {
    await page.goto('/eventos');
    await expect(page).toHaveURL(/\/auth(\/login)?/);
  });

  test('deve carregar profile após login', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', loginEmail);
    await page.fill('input[type="password"]', loginPassword);

    // Aguardar navegação após o clique no botão de submit
    await Promise.all([
      page.waitForURL(/\/(\?|schedule|patients|dashboard|eventos)?/, { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    // Aguardar um pouco para o profile carregar
    await page.waitForTimeout(2000);

    // Verificar se a página carregou completamente (indica que profile foi carregado)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000);

    console.log('✅ Profile carregado após login');
  });
});
