import { defineConfig, devices, test, expect } from '@playwright/test';

/**
 * Playwright E2E Configuration for Fisioflow Native Apps
 *
 * Testa fluxos críticos dos aplicativos React Native/Expo
 * usando emuladores iOS e Android
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Executar testes em paralelo (cuidado com recursos)
  retries: process.env.CI ? 2 : 0, // 2 tentativas em CI
  timeout: 60000, // 60 segundos por teste
  reporter: [
    ['html'], // Relatório HTML
    ['json'], // Relatório JSON
    ['junit'], // JUnit XML
    ['list'], // Lista no terminal
  ],
  use: {
    baseURL: 'http://localhost:8081', // URL do app web para testes integrados
    trace: 'retain-on-failure', // Manter traces em caso de falha
    screenshot: 'only-on-failure', // Screenshot apenas em falha
  },

  projects: [
    // Professional iOS App
    {
      name: 'professional-ios',
      use: {
        // Em produção, usaria dispositivos reais ou emulador
        baseURL: 'http://localhost:8081',

        // Compartilhar autenticação entre testes se necessário
        storageState: {
          // email: 'e2e-test@fisioflow.com',
          // password: 'Teste123!',
          // Para autenticação no app durante testes
        },
      },
    },

    // Patient iOS App
    {
      name: 'patient-ios',
      use: {
        baseURL: 'http://localhost:8081',
        storageState: {
          email: 'e2e-test@fisioflow.com',
          // password: 'Teste123!',
        },
      },
    },
  ],

  // Dispositivos para testar (em CI)
  ...(process.env.CI ? [] : [
    {
      name: 'Pixel 5',
      use: {
        // Android device
      },
    },
    {
      name: 'iPhone 14',
      use: {
        // iOS simulator
      },
    },
  ]),
});

/**
 * Test Helpers
 */
const auth = {
  async login(page, email, password) {
    console.log(`🔐 Login com ${email}`);
    // Navegar para tela de login
    await page.goto('/(auth)/login');

    // Preencher formulário
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);

    // Submeter
    await page.click('[data-testid="login-button"]');

    // Esperar redirecionamento
    await page.waitForURL(/(tabs|agenda)/, { timeout: 5000 });

    console.log('✅ Login realizado');
  },

  async logout(page) {
    console.log('🚪 Logout');
    // Navegar para perfil
    await page.goto('/(tabs)/profile');

    // Clicar em logout (ajustar seletor)
    const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Sair"), button:has-text("Logout")');
    await logoutButton.first().click();

    // Esperar redirecionamento para login
    await page.waitForURL(/\(auth)/, { timeout: 5000 });

    console.log('✅ Logout realizado');
  },
};

const commonSteps = {
  async waitForLoad(page) {
    console.log('⏳ Aguardando carregamento...');
    // Esperar loader desaparecer ou página estar pronta
    await page.waitForLoadState('networkidle');
    console.log('✅ Página carregada');
  },

  async takeScreenshot(page, name) {
    const screenshot = await page.screenshot({
      path: `test-results/${name}-${Date.now()}.png`,
      fullPage: true,
    });
    console.log(`📸 Screenshot: ${name}`);
    return screenshot;
  },
};

test.describe('Professional iOS - Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Limpar localStorage antes de cada teste
    await page.context().clearCookies();
  });

  test('deve permitir login com credenciais válidas', async ({ page }) => {
    // Testar login válido
    await auth.login(page, 'e2e-test@fisioflow.com', 'Teste123!');

    // Verificar se foi para tela de tabs (sucesso)
    await expect(page.url()).toMatch(/\/(tabs)\/agenda/);

    // Fazer logout
    await auth.logout(page);

    // Verificar se foi para tela de login
    await expect(page.url()).toMatch(/\(auth)/login$/);

    // Tentar navegar para tela protegida (deve redirecionar para login)
    await page.goto('/(drawer)/agenda');
    await expect(page.url()).toMatch(/\(auth)/login$/);
  });

  test('deve rejeitar login com credenciais inválidas', async ({ page }) => {
    // Testar login inválido
    await page.goto('/(auth)/login');
    await page.fill('[data-testid="email-input"]', 'wrong@email.com');
    await page.fill('[data-testid="password-input"]', 'wrongpass');
    await page.click('[data-testid="login-button"]');

    // Verificar se aparece mensagem de erro
    await expect(page.locator('text=Email ou senha inválidos')).toBeVisible();

    // Verificar que ainda está na tela de login
    await expect(page.url()).toMatch(/\(auth)/login$/);
  });
});

test.describe('Professional iOS - Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('navegação principal deve funcionar', async ({ page }) => {
    await auth.login(page, 'e2e-test@fisioflow.com', 'Teste123!');

    // Verificar tabs principais
    await expect(page.locator('text=Pacientes')).toBeVisible();
    await expect(page.locator('text=Agenda')).toBeVisible();
    await expect(page.locator('text=Exercícios')).toBeVisible();
    await expect(page.locator('text=Perfil')).toBeVisible();

    // Screenshot do estado inicial
    await commonSteps.takeScreenshot(page, 'professional-main-nav');
  });

  test('criar novo paciente deve funcionar', async ({ page }) => {
    await auth.login(page, 'e2e-test@fisioflow.com', 'Teste123!');

    // Navegar para pacientes
    await page.goto('/(tabs)/patients');

    // Clicar em botão novo
    await page.click('[data-testid="new-patient-button"], button:has-text("Novo")');

    // Verificar se foi para formulário ou lista
    await expect(page.url()).toMatch(/(tabs\/patients|patients\/new)/);

    await commonSteps.takeScreenshot(page, 'professional-new-patient');
  });
});

test.describe('Patient iOS - Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('navegação principal deve funcionar', async ({ page }) => {
    await auth.login(page, 'e2e-test@fisioflow.com', 'Teste123!');

    // Verificar tabs do paciente
    await expect(page.locator('text=Agendamentos')).toBeVisible();
    await expect(page.locator('text=Progresso')).toBeVisible();
    await expect(page.locator('text=Exercícios')).toBeVisible();
    await expect(page.locator('text=Perfil')).toBeVisible();

    // Screenshot do estado inicial
    await commonSteps.takeScreenshot(page, 'patient-main-nav');
  });

  test('criar novo agendamento deve funcionar', async ({ page }) => {
    await auth.login(page, 'e2e-test@fisioflow.com', 'Teste123!');

    // Navegar para agenda
    await page.goto('/(tabs)/agenda');

    // Clicar em botão novo agendamento
    await page.click('[data-testid="new-appointment-button"], button:has-text("Novo Agendamento")');

    // Verificar se foi para formulário ou lista
    await expect(page.url()).toMatch(/(tabs\/agenda|agenda\/new)/);

    await commonSteps.takeScreenshot(page, 'patient-new-appointment');
  });
});
