import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright Configuration para Fisioflow Professional iOS App
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
    baseURL: process.env.CI ? 'http://localhost:8081' : undefined,

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
      // Professional iOS App
      name: 'professional-ios',
      use: {
        // URL do app nativo quando testado com Expo Go
        // Em produção com EAS Build, precisa usar a URL correta
        baseURL: process.env.EAS_URL || 'exp://192.168.1.2:8081',

        // Estado do storage persistido entre testes
        storageState: {
          email: 'e2e-test@fisioflow.com',
          password: 'Teste123!',
        },
      },
    },
    {
      // Patient iOS App
      name: 'patient-ios',
      use: {
        baseURL: process.env.EAS_URL || 'exp://192.168.1.2:8082',
        storageState: {
          email: 'e2e-test@fisioflow.com',
          password: 'Teste123!',
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
 * Criação de fixtures customizados
 * Setup de estado limpo entre testes
 */
export const testFixtures = async ({ page }, use) => {
  return {
    page,
    // Helpers de autenticação
    auth: {
      async login(email = 'e2e-test@fisioflow.com', password = 'Teste123!') {
        console.log('🔐 Logging in...');
        // Navegar para login (baseado na estrutura do app)
        // Nota: A estrutura real pode variar
        const emailInput = page.locator('input[type="email"], [data-testid*="email"], [placeholder*="email"]');
        const passwordInput = page.locator('input[type="password"], [data-testid*="password"], [placeholder*="senha"]');
        const loginButton = page.locator('button:has-text("Entrar"), button:has-text("Login"), [data-testid*="login"], [type="submit"]');

        await page.goto('/(auth)/login');

        // Verificar se os elementos estão visíveis
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await loginButton.waitFor({ state: 'visible', timeout: 10000 });

        // Preencher formulário
        await emailInput.fill(email);
        await passwordInput.fill(password);

        // Submeter
        await loginButton.click();

        // Verificar redirecionamento (esperar navegar para uma das tabs)
        await page.waitForURL(/\/(tabs)\//, { timeout: 10000 });

        console.log('✅ Login successful');
      },

      async logout() {
        console.log('🚪 Logging out...');

        // Navegar para perfil
        await page.goto('/(tabs)/profile');

        // Procurar botão de logout
        const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout"), [data-testid*="logout"], [aria-label*="logout"]');

        if (await logoutButton.count() > 0) {
          await logoutButton.first().click();
        } else {
          console.warn('Logout button not found');
        }

        // Verificar redirecionamento para login
        await page.waitForURL(/\(auth)\/login$/, { timeout: 10000 });

        console.log('✅ Logout successful');
      },
    },
  };
};
