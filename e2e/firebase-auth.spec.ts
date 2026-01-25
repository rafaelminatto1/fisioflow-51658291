/**
 * FisioFlow - Firebase Authentication E2E Tests
 *
 * Testes completos de autenticação usando Firebase
 * Incluindo login, logout, navegação e notificações
 */

import { test, expect, Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

// Helper para aguardar carregamento
async function waitForPageLoad(page: Page, timeout = 10000) {
  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.waitForTimeout(500); // Pequeno delay para hydration
}

// Helper para fazer login
async function doLogin(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await waitForPageLoad(page);

  // Preencher credenciais
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Clicar no botão de submit
  await page.click('button[type="submit"]');

  // Aguardar navegação para dashboard
  await page.waitForURL(/\/$/, { timeout: 15000 });
}

test.describe('Firebase Authentication - Login/Logout', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpar todos os cookies e storage antes de cada teste
    await context.clearCookies();
    await page.goto('/auth');
  });

  test('deve fazer login com credenciais Firebase válidas', async ({ page }) => {
    await page.fill('input[type="email"]', testUsers.rafael.email);
    await page.fill('input[type="password"]', testUsers.rafael.password);
    await page.click('button[type="submit"]');

    // Aguardar navegação para dashboard
    await page.waitForURL(/\/$/, { timeout: 15000 });

    // Verificar se o nome do usuário aparece na página
    const userName = await page.locator('text=/Rafael/i').first().textContent();
    expect(userName).toBeTruthy();

    // Screenshot para debug
    await page.screenshot({ path: 'screenshots/login-success.png' });
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalido@example.com');
    await page.fill('input[type="password"]', 'senhaErrada123');
    await page.click('button[type="submit"]');

    // Aguardar mensagem de erro
    await expect(page.locator('text=/erro|inválido|falhou/i')).toBeVisible({ timeout: 5000 });

    // Verificar que ainda está na página de login
    await expect(page).toHaveURL(/\/auth/);
  });

  test('deve fazer logout corretamente', async ({ page }) => {
    await doLogin(page, testUsers.rafael.email, testUsers.rafael.password);

    // Clicar no menu de perfil
    await page.click('[data-testid="user-menu"], button[aria-label*="menu"], button[aria-label*="perfil"]');

    // Clicar em logout
    await page.click('text=/Sair|Logout/i');

    // Verificar redirecionamento para /auth
    await page.waitForURL('/auth', { timeout: 5000 });
    await expect(page).toHaveURL('/auth');

    // Verificar que os cookies foram limpos
    const cookies = await page.context().cookies();
    const firebaseCookies = cookies.filter(c => c.name.includes('firebase'));
    expect(firebaseCookies.length).toBe(0);
  });

  test('deve persistir sessão após recarregar página', async ({ page }) => {
    await doLogin(page, testUsers.rafael.email, testUsers.rafael.password);

    // Recarregar página
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verificar que ainda está logado
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('text=/Rafael/i')).toBeVisible();
  });

  test('deve redirecionar para /auth quando sessão expira', async ({ page }) => {
    // Fazer login
    await doLogin(page, testUsers.rafael.email, testUsers.rafael.password);

    // Simular sessão expirada limpando storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Tentar navegar para uma página protegida
    await page.goto('/agenda');

    // Deve redirecionar para /auth
    await page.waitForURL('/auth', { timeout: 5000 });
  });
});

test.describe('Navegação entre telas', () => {
  test.beforeEach(async ({ page }) => {
    await doLogin(page, testUsers.rafael.email, testUsers.rafael.password);
  });

  test('deve navegar para agenda', async ({ page }) => {
    await page.click('a[href="/agenda"], text=/Agenda/i');
    await page.waitForURL(/\/agenda/);
    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.locator('h1, h2').filter({ hasText: /Agenda/i })).toBeVisible();
  });

  test('deve navegar para pacientes', async ({ page }) => {
    await page.click('a[href="/patients"], a[href="/pacientes"], text=/Pacientes/i');
    await page.waitForURL(/\/(patients|pacientes)/);
    await expect(page).toHaveURL(/\/(patients|pacientes)/);
  });

  test('deve navegar para configurações', async ({ page }) => {
    await page.click('[data-testid="settings-link"], a[href="/settings"], text=/Configurações/i');
    await page.waitForURL(/\/settings/);
    await expect(page).toHaveURL(/\/settings/);
  });

  test('deve voltar para dashboard usando breadcrumb', async ({ page }) => {
    // Navegar para agenda
    await page.click('a[href="/agenda"], text=/Agenda/i');
    await page.waitForURL(/\/agenda/);

    // Voltar para dashboard
    await page.click('a[href="/"], [data-testid="home-link"], text=/Dashboard|Início/i');
    await page.waitForURL(/\/$/);
    await expect(page).toHaveURL(/\/$/);
  });

  test('deve funcionar navegação mobile', async ({ page }) => {
    // Simular viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Abrir menu mobile
    await page.click('[data-testid="mobile-menu-button"], button[aria-label*="menu"]');

    // Verificar se as opções aparecem
    await expect(page.locator('a[href="/agenda"]')).toBeVisible();
    await expect(page.locator('a[href="/patients"], a[href="/pacientes"]')).toBeVisible();
  });
});

test.describe('Notificações', () => {
  test.beforeEach(async ({ page }) => {
    // Grant notification permissions
    await page.context().grantPermissions(['notifications']);

    // Interceptar requests de notificações
    await page.route('**/notifications/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', title: 'Nova consulta', body: 'Você tem uma nova consulta agendada', read: false },
          { id: '2', title: 'Lembrete', body: 'Não esqueça de seu exercício de hoje', read: true },
        ]),
      });
    });

    await doLogin(page, testUsers.rafael.email, testUsers.rafael.password);
  });

  test('deve mostrar botão de notificações', async ({ page }) => {
    const notificationBtn = page.locator('[data-testid="notifications-button"], button[aria-label*="notifica"]');
    await expect(notificationBtn).toBeVisible();
  });

  test('deve abrir painel de notificações', async ({ page }) => {
    await page.click('[data-testid="notifications-button"], button[aria-label*="notifica"]');

    // Verificar se o painel abriu
    const panel = page.locator('[data-testid="notifications-panel"], .notifications-dropdown');
    await expect(panel).toBeVisible();
  });

  test('deve mostrar contador de notificações não lidas', async ({ page }) => {
    const badge = page.locator('[data-testid="notification-badge"], .notification-badge');
    await expect(badge).toBeVisible();
    const count = await badge.textContent();
    expect(parseInt(count || '0')).toBeGreaterThan(0);
  });

  test('deve marcar notificação como lida', async ({ page }) => {
    await page.click('[data-testid="notifications-button"], button[aria-label*="notifica"]');

    // Clicar na primeira notificação
    await page.click('[data-testid="notification-item-1"], .notification-item:first-child');

    // Verificar se o contador diminuiu
    const badge = page.locator('[data-testid="notification-badge"], .notification-badge');
    const count = await badge.textContent();
    expect(parseInt(count || '0')).toBeLessThan(2);
  });

  test('deve solicitar permissão de notificação se não concedida', async ({ page }) => {
    // Revogar permissões
    await page.context().clearPermissions();

    // Recarregar página
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verificar se o botão de ativar notificações aparece
    const enableBtn = page.locator('text=/Ativar notificações/i');
    if (await enableBtn.isVisible()) {
      await enableBtn.click();

      // Verificar se o prompt de permissão foi tratado
      // (na prática, isso seria interceptado pelo browser)
    }
  });
});

test.describe('Configurações de Perfil', () => {
  test.beforeEach(async ({ page }) => {
    await doLogin(page, testUsers.rafael.email, testUsers.rafael.password);
  });

  test('deve carregar dados do perfil', async ({ page }) => {
    await page.click('[data-testid="settings-link"], a[href="/settings"]');
    await page.waitForURL(/\/settings/);

    // Verificar se o email está visível
    await expect(page.locator(`text=${testUsers.rafael.email}`)).toBeVisible();
  });

  test('deve permitir editar nome do perfil', async ({ page }) => {
    await page.click('[data-testid="settings-link"], a[href="/settings"]');
    await page.waitForURL(/\/settings/);

    // Clicar em editar
    await page.click('text=/Editar.*Perfil/i, button:has-text("Editar")');

    // Alterar nome
    const nameInput = page.locator('input[name="name"], input[placeholder*="nome"]');
    await nameInput.clear();
    await nameInput.fill('Rafael Minatto Teste');

    // Salvar
    await page.click('text=/Salvar/i, button[type="submit"]');

    // Aguardar feedback visual
    await expect(page.locator('text=/salvo|sucesso/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve mostrar toggle de notificações push', async ({ page }) => {
    await page.click('[data-testid="settings-link"], a[href="/settings"]');
    await page.waitForURL(/\/settings/);

    // Verificar se o toggle existe
    const toggle = page.locator('[data-testid="push-notifications-toggle"], .switch:has-text("Notificações")');
    await expect(toggle).toBeVisible();
  });
});

test.describe('Testes de Performance e Carga', () => {
  test('deve carregar dashboard em menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.rafael.email);
    await page.fill('input[type="password"]', testUsers.rafael.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/$/, { timeout: 15000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('deve lidar com múltiplas abas simultâneas', async ({ context }) => {
    // Criar múltiplas abas
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
    ]);

    // Fazer login em cada aba
    for (const page of pages) {
      await page.goto('/auth');
      await page.fill('input[type="email"]', testUsers.rafael.email);
      await page.fill('input[type="password"]', testUsers.rafael.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/$/, { timeout: 15000 });
    }

    // Verificar que todas estão logadas
    for (const page of pages) {
      await expect(page).toHaveURL(/\/$/);
    }

    // Fechar abas
    for (const page of pages) {
      await page.close();
    }
  });
});
