import { test, expect, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import path from 'path';
import { fileURLToPath } from 'url';

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, '../playwright/.auth/user.json');
const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function mockOrganizationBootstrap(page: Page) {
  await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: TEST_ORG_ID,
          name: 'Organização E2E',
          slug: 'organizacao-e2e',
          settings: {},
          active: true,
          created_at: null,
          updated_at: null,
        },
      }),
    });
  });

  await page.route(`**/api/organization-members?**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'member-e2e-admin',
            organization_id: TEST_ORG_ID,
            user_id: 'user-e2e-admin',
            role: 'admin',
            active: true,
            joined_at: new Date().toISOString(),
            profiles: {
              full_name: 'Admin E2E',
              email: loginEmail,
            },
          },
        ],
        total: 1,
      }),
    });
  });
}

async function expectAuthenticatedShell(page: Page) {
  await expect(
    page.locator('main, nav, [data-testid="main-layout"], a[href="/agenda"], a[href="/dashboard"]').first()
  ).toBeVisible({ timeout: 25000 });
}

test.describe('Autenticação', () => {
  // Resetar storageState para este teste específico para garantir que o formulário de login apareça
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    console.log(`[Test] Iniciando login para: ${loginEmail}`);
    await mockOrganizationBootstrap(page);
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
    await expectAuthenticatedShell(page);
    
    console.log('[Test] Login validado com sucesso (shell autenticado visível)');
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
    const context = await browser.newContext({ storageState: AUTH_STATE_PATH });
    const page = await context.newPage();
    await mockOrganizationBootstrap(page);
    
    await page.goto('/agenda', { waitUntil: 'domcontentloaded' });
    await expectAuthenticatedShell(page);
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);

    const sidebarLogoutButton = page.locator('button:has-text("Sair do Sistema")').first();
    if (await sidebarLogoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sidebarLogoutButton.evaluate((button: HTMLElement) => button.click());
    } else {
      const userMenuTrigger = page.locator('[data-testid="user-menu"]').first();
      await expect(userMenuTrigger).toBeVisible({ timeout: 15000 });
      await userMenuTrigger.click();

      const dropdownLogoutButton = page
        .locator('[data-testid="user-menu-logout"], [role="menuitem"]:has-text("Encerrar Sessão")')
        .first();
      await expect(dropdownLogoutButton).toBeVisible({ timeout: 15000 });
      await dropdownLogoutButton.click();
    }

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
    await mockOrganizationBootstrap(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="email"]', loginEmail);
    await page.fill('input[name="password"]', loginPassword);
    await page.click('button[type="submit"]');

    // Aguardar carregamento do menu que contém dados do perfil
    await expectAuthenticatedShell(page);
    
    console.log('✅ Profile carregado após login');
  });
});
