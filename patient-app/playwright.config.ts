import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration para Fisioflow Patient App
 *
 * Configura testes E2E com emuladores iOS/Android e dispositivos reais
 * quando rodado localmente com Expo Go.
 */

export default defineConfig({
  // Diretório onde estão os testes E2E
  testDir: './e2e',

  // Compartilhar relatórios entre testes para evitar sobrescrever
  fullyParallel: false,
  forbidOnly: false,

  // Timeout aumentado para testes nativos que podem ser mais lentos
  timeout: 60000,

  // Máximo de tentativas para testes flaky
  retries: 2,

  // Relatório HTML para visualização detalhada
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
    ['list'],
  ],

  // Dispositivos para testar
  use: {
    // Em produção/testes de CI, usa baseURL do app web
    baseURL: process.env.CI ? 'http://localhost:8082' : undefined,

    // Traces de rede para debug
    trace: 'retain-on-failure',

    // Capturar erros com screenshot
    screenshot: 'only-on-failure',

    // Vídeo em caso de falha (útil para CI)
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Dispositivos disponíveis
  projects: [
    {
      // Patient iOS App
      name: 'patient-ios',
      use: {
        // URL do app nativo quando testado com Expo Go
        baseURL: process.env.EAS_URL || 'exp://192.168.1.2:8082',

        // Estado do storage persistido entre testes
        storageState: {
          email: 'patient.test@fisioflow.test',
          password: 'Test@123456',
        },
      },
    },
    {
      // Testes em navegador (web)
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Emuladores para testes locais
  workers: 2,
});

/**
 * Criação de fixtures para testes de paciente
 */
export const patientTestFixtures = async ({ page }, use) => {
  return {
    page,
    auth: {
      async login(email = 'patient.test@fisioflow.test', password = 'Test@123456') {
        console.log('🔐 Patient App Login...');

        // Procurar elementos de login
        const emailInput = page.locator('input[type="email"], [data-testid*="email"], [placeholder*="email"]');
        const passwordInput = page.locator('input[type="password"], [data-testid*="password"], [placeholder*="senha"]');
        const loginButton = page.locator('button:has-text("Entrar"), [data-testid*="login"], [type="submit"]');

        await page.goto('/(auth)/login');

        await expect(emailInput).toBeVisible({ timeout: 10000 });
        await expect(passwordInput).toBeVisible({ timeout: 10000 });
        await expect(loginButton).toBeVisible({ timeout: 10000 });

        await emailInput.fill(email);
        await passwordInput.fill(password);
        await loginButton.click();

        // Verificar redirecionamento
        await expect(page).toHaveURL(/\/(tabs)\//, { timeout: 10000 });

        console.log('✅ Patient Login successful');
      },

      async logout() {
        console.log('🚪 Patient Logout...');

        await page.goto('/(tabs)/profile');

        const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout"), [data-testid*="logout"], [aria-label*="logout"]');

        if (await logoutButton.count() > 0) {
          await logoutButton.first().click();
        }

        await expect(page).toHaveURL(/\(auth)\/login$/, { timeout: 10000 });
        console.log('✅ Patient Logout successful');
      },
    },

    // Verificar tabs principais
    async verifyTabs() {
      await expect(page.locator('text=Agendamentos')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Exercícios')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Progresso')).toBeVisible({ timeout: 10000 });
    },
  };
};
