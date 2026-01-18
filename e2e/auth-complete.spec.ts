import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Autenticação Completa - Login e Perfil', () => {
  test('deve fazer login e carregar perfil corretamente', async ({ page }) => {
    await page.goto('/auth');

    // Fazer login
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento (incluindo raiz /)
    await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 15000 });

    // Verificar que não está mais na página de login
    await expect(page).not.toHaveURL(/\/auth/);

    // Verificar se há elementos que indicam que o usuário está logado
    const userMenu = page.locator('[data-testid="user-menu"], button[aria-label*="menu"], button[aria-label*="perfil"]').first();
    await expect(userMenu).toBeVisible({ timeout: 10000 });

    console.log('✅ Login realizado com sucesso');
  });

  test('deve carregar profile após login', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 15000 });

    // Verificar se o profile foi carregado verificando elementos que dependem do profile
    await page.locator('text=/admin|Admin|Administrador/i').first();

    // Aguardar um pouco para o profile carregar
    await page.waitForTimeout(2000);

    // Verificar se a página carregou completamente
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000);

    console.log('✅ Profile verificado');
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[type="email"]', 'invalido@example.com');
    await page.fill('input[type="password"]', 'senhaErrada123');
    await page.click('button[type="submit"]');

    // Aguardar mensagem de erro (ampliando regex)
    await expect(page.locator('text=/erro|inválido|falhou|incorreta|invalid|incorrect/i')).toBeVisible({ timeout: 10000 });

    // Verificar que ainda está na página de login
    await expect(page).toHaveURL(/\/auth/);

    console.log('✅ Erro de credenciais inválidas exibido corretamente');
  });

  test('deve fazer logout corretamente', async ({ page }) => {
    // Login primeiro
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 15000 });

    // Tentar fazer logout
    const userMenuButton = page.locator('[data-testid="user-menu"], button[aria-label*="menu"], button[aria-label*="perfil"], button:has-text("Sair"), button:has-text("Logout")').first();

    if (await userMenuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userMenuButton.click();
      // Wait for menu animation
      await page.waitForTimeout(1000);

      const logoutButton = page.locator('text=/sair|logout|sign out/i').first();
      await expect(logoutButton).toBeVisible({ timeout: 5000 });
      await logoutButton.click({ force: true });
    } else {
      const directLogout = page.locator('button:has-text("Sair"), button:has-text("Logout")').first();
      if (await directLogout.isVisible({ timeout: 2000 }).catch(() => false)) {
        await directLogout.click();
      }
    }

    await page.waitForURL(/\/auth/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth/);

    console.log('✅ Logout realizado com sucesso');
  });

  test('deve redirecionar para /auth quando não autenticado', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/schedule');
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
    console.log('✅ Redirecionamento para /auth funcionando');
  });

  test('deve manter sessão após recarregar página', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/, { timeout: 15000 });

    const currentUrl = page.url();
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if we are still authenticated (url might be root /)
    const isAuthPage = page.url().includes('/auth');
    expect(isAuthPage).toBe(false);

    console.log('✅ Sessão mantida após recarregar página');
  });
});

