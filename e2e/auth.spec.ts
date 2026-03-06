import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;

test.describe('Autenticação', () => {
  // Resetar storageState para este teste específico para garantir que o formulário de login apareça
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    console.log(`[Test] Iniciando login para: ${loginEmail}`);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // Aguardar inputs estarem prontos
    const emailInput = page.locator('input[name="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    
    await emailInput.fill(loginEmail);
    await page.fill('input[name="password"]', loginPassword);

    await page.click('button[type="submit"]');

    console.log('[Test] Clique no submit realizado, aguardando redirecionamento...');

    // Esperar redirecionamento para o dashboard ou agenda
    await page.waitForURL((url) => url.pathname.includes('/agenda') || url.pathname.includes('/dashboard') || url.pathname === '/', { 
      timeout: 40000
    });
    
    console.log(`[Test] Redirecionado para: ${page.url()}`);

    // Aguardar o app inicializar e o menu estar disponível
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu.first()).toBeVisible({ timeout: 25000 });
    
    console.log(`[Test] Login validado com sucesso (menu visível)`);
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="email"]', 'invalido@example.com');
    await page.fill('input[name="password"]', 'senhaErrada123');
    await page.click('button[type="submit"]');

    // Procurar por mensagem de erro
    await expect(page.locator('text=/erro|inválido|falhou/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('deve fazer logout', async ({ browser }) => {
    // Para logout, precisamos estar logado primeiro. Usamos a sessão global aqui abrindo um novo contexto
    const context = await browser.newContext(); // Usa storageState padrão do config
    const page = await context.newPage();
    
    await page.goto('/agenda', { waitUntil: 'domcontentloaded' });

    // Aguardar menu do usuário estar visível
    const userMenuButton = page.locator('[data-testid="user-menu"]').first();
    await expect(userMenuButton).toBeVisible({ timeout: 20000 });

    // Clicar no menu do usuário
    await userMenuButton.click();

    // Aguardar botão de logout
    const logoutMenuItem = page.locator('[data-testid="user-menu-logout"]').first();
    await expect(logoutMenuItem).toBeVisible({ timeout: 15000 });

    // Clicar em sair
    await logoutMenuItem.click();

    // Verificar se voltou para a página de login
    await page.waitForURL(/\/auth/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/auth/);
    
    await context.close();
  });

  test('deve redirecionar para /auth quando não autenticado', async ({ browser }) => {
    // Usar um contexto novo e vazio para garantir que não há sessão
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    
    await page.goto('/agenda');
    
    // Deve ser redirecionado para /auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 20000 });
    
    await context.close();
  });

  test('deve carregar profile após login', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="email"]', loginEmail);
    await page.fill('input[name="password"]', loginPassword);
    await page.click('button[type="submit"]');

    // Aguardar carregamento do menu que contém dados do perfil
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu.first()).toBeVisible({ timeout: 30000 });
    
    // O menu deve conter texto não vazio
    await expect(userMenu.first()).not.toHaveText('', { timeout: 15000 });

    console.log('✅ Profile carregado após login');
  });
});
