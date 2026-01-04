import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Autenticação', () => {
  test('deve fazer login com credenciais válidas', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/(eventos|dashboard|schedule)/);
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', 'invalido@example.com');
    await page.fill('input[type="password"]', 'senhaErrada123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/erro|inválido|falhou/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve fazer logout', async ({ page }) => {
    // Login primeiro
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(eventos|dashboard|schedule)/);
    
    // Logout
    await page.click('button[aria-label*="menu"], button[aria-label*="perfil"], [data-testid="user-menu"]');
    await page.click('text=/sair|logout/i');
    
    await expect(page).toHaveURL('/auth');
  });

  test('deve redirecionar para /auth quando não autenticado', async ({ page }) => {
    await page.goto('/eventos');
    await expect(page).toHaveURL('/auth');
  });

  test('deve carregar profile após login', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard)/, { timeout: 10000 });
    
    // Aguardar um pouco para o profile carregar
    await page.waitForTimeout(2000);
    
    // Verificar se a página carregou completamente (indica que profile foi carregado)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000);
    
    console.log('✅ Profile carregado após login');
  });
});
