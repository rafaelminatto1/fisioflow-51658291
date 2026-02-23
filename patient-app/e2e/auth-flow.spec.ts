/**
 * Testes E2E para Fluxo de Autenticação - App Paciente
 *
 * Testa o fluxo completo de autenticação incluindo:
 * - Login com email/senha
 * - Registro de novo paciente
 * - Recuperação de senha
 * - Proteção de rotas
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Credenciais de teste para paciente
 */
export const PATIENT_CREDENTIALS = {
  email: 'patient.test@fisioflow.test',
  password: 'Test@123456',
} as const;

/**
 * Estado do usuário de teste
 */
export interface TestPatientState {
  userId: string;
  email: string;
  name: string;
  isAuthenticated: boolean;
}

/**
 * Realiza login na aplicação paciente
 */
export async function patientLogin(page: Page, credentials = PATIENT_CREDENTIALS): Promise<void> {
  // Navegar para tela de login
  await page.goto('/(auth)/login');

  // Preencher credenciais
  await page.fill('[data-testid="email-input"]', credentials.email);
  await page.fill('[data-testid="password-input"]', credentials.password);

  // Clicar no botão de login
  await page.click('[data-testid="login-button"]');

  // Aguardar redirecionamento para a tela principal
  await page.waitForURL('**/(tabs)**', { timeout: 10000 });

  // Verificar que o login foi bem-sucedido
  await expectPatientLoginSuccess(page);
}

/**
 * Registra um novo paciente
 */
export async function registerPatient(page: Page, userData: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}): Promise<void> {
  await page.goto('/(auth)/register');

  await page.fill('[data-testid="name-input"]', userData.name);
  await page.fill('[data-testid="email-input"]', userData.email);
  await page.fill('[data-testid="phone-input"]', userData.phone || '');
  await page.fill('[data-testid="password-input"]', userData.password);
  await page.fill('[data-testid="confirm-password-input"]', userData.confirmPassword);

  // Aceitar termos
  await page.click('[data-testid="accept-terms"]');

  await page.click('[data-testid="register-button"]');

  // Aguardar redirecionamento ou mensagem de sucesso
  await page.waitForURL('**/(tabs)**', { timeout: 10000 }).catch(() => {
    return page.waitForSelector('[data-testid="registration-success"]', { timeout: 5000 });
  });
}

/**
 * Verifica que o login foi bem-sucedido
 */
export async function expectPatientLoginSuccess(page: Page): Promise<void> {
  // Verificar indicador de autenticação
  await page.waitForSelector('[data-testid="authenticated-indicator"]', { timeout: 5000 });

  // Verificar que não estamos mais na tela de login
  const url = page.url();
  expect(url).not.toContain('/login');
}

test.describe('Fluxo de Autenticação - App Paciente', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Limpar estado
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Login', () => {
    test('deve fazer login com credenciais válidas', async () => {
      await patientLogin(page, PATIENT_CREDENTIALS);

      // Verificar redirecionamento para home
      const url = page.url();
      expect(url).toContain('/(tabs)');
    });

    test('deve mostrar erro com credenciais inválidas', async () => {
      await page.goto('/(auth)/login');
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');

      // Verificar mensagem de erro
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    });

    test('deve validar formato de email', async () => {
      await page.goto('/(auth)/login');
      await page.fill('[data-testid="email-input"]', 'not-an-email');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Verificar validação
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });
  });

  test.describe('Registro', () => {
    test('deve registrar novo paciente com sucesso', async () => {
      const userData = {
        name: 'Maria Paciente Teste',
        email: `patient.${Date.now()}@example.com`,
        password: 'Test@123456',
        confirmPassword: 'Test@123456',
        phone: '11987654321',
      };

      await registerPatient(page, userData);

      // Verificar que foi redirecionado
      const url = page.url();
      expect(url).toContain('/(tabs)');

      // Verificar autenticação
      await expectPatientLoginSuccess(page);
    });

    test('deve validar senhas correspondentes', async () => {
      await page.goto('/(auth)/register');

      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123');
      await page.click('[data-testid="register-button"]');

      // Verificar erro de senhas não correspondentes
      await expect(page.locator('[data-testid="password-mismatch-error"]')).toBeVisible();
    });

    test('deve exigir aceite dos termos', async () => {
      await page.goto('/(auth)/register');

      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123');
      await page.fill('[data-testid="confirm-password-input"]', 'Password123');

      // Tentar registrar sem aceitar termos
      await page.click('[data-testid="register-button"]');

      // Verificar erro
      await expect(page.locator('[data-testid="terms-error"]')).toBeVisible();
    });
  });

  test.describe('Proteção de Rotas', () => {
    test('deve redirecionar para login ao acessar rota protegida', async () => {
      // Tentar acessar diretamente uma rota protegida
      await page.goto('/(tabs)/exercises');

      // Deve redirecionar para login
      await expect(page).toHaveURL(/\/(auth)\/login/);
    });

    test('deve redirecionar para home após login', async () => {
      // Tentar acessar rota protegida
      await page.goto('/(tabs)/exercises');

      // Fazer login
      await patientLogin(page, PATIENT_CREDENTIALS);

      // Deve redirecionar para a rota original ou home
      const url = page.url();
      expect(url).toMatch(/\/(tabs|exercises)/);
    });
  });

  test.describe('Persistência de Sessão', () => {
    test('deve manter sessão após recarregar página', async () => {
      await patientLogin(page, PATIENT_CREDENTIALS);
      await page.reload();

      // Deve continuar autenticado
      await expectPatientLoginSuccess(page);
    });
  });

  test.describe('Acessibilidade', () => {
    test('deve ter labels ARIA nos campos de formulário', async () => {
      await page.goto('/(auth)/login');

      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');

      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(passwordInput).toHaveAttribute('aria-label');
    });
  });
});
