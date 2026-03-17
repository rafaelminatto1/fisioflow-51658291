/**
 * Fixtures para autenticação em testes E2E
 *
 * Fornece funções auxiliares para autenticar e desautenticar usuários
 * durante os testes end-to-end.
 */

import type { Page } from '@playwright/test';

/**
 * Credenciais de teste
 */
export const TEST_CREDENTIALS = {
  professional: {
    email: 'test.professional@fisioflow.test',
    password: 'Test@123456',
  },
  patient: {
    email: 'test.patient@fisioflow.test',
    password: 'Test@123456',
  },
} as const;

/**
 * Estado do usuário de teste
 */
export interface TestUserState {
  userId: string;
  email: string;
  name: string;
  isAuthenticated: boolean;
  biometricEnabled: boolean;
}

/**
 * Realiza login na aplicação
 */
export async function login(page: Page, credentials = TEST_CREDENTIALS.professional): Promise<void> {
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
  await expectLoginSuccess(page);
}

/**
 * Realiza logout da aplicação
 */
export async function logout(page: Page): Promise<void> {
  // Abrir menu de perfil
  await page.click('[data-testid="profile-menu"]');

  // Clicar no botão de logout
  await page.click('[data-testid="logout-button"]');

  // Confirmar logout se houver modal
  const confirmButton = page.locator('[data-testid="confirm-logout-button"]');
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }

  // Aguardar redirecionamento para tela de login
  await page.waitForURL('**/(auth)/login**', { timeout: 5000 });
}

/**
 * Realiza login com biometria (simulado)
 */
export async function loginWithBiometrics(page: Page): Promise<void> {
  // Simular prompt de biometria
  await page.evaluate(() => {
    window.biometricResult = true;
  });

  // Clicar no botão de biometria
  await page.click('[data-testid="biometric-login-button"]');

  // Aguardar sucesso
  await expectLoginSuccess(page);
}

/**
 * Registra um novo usuário de teste
 */
export async function registerUser(page: Page, userData: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<void> {
  await page.goto('/(auth)/register');

  await page.fill('[data-testid="name-input"]', userData.name);
  await page.fill('[data-testid="email-input"]', userData.email);
  await page.fill('[data-testid="password-input"]', userData.password);
  await page.fill('[data-testid="confirm-password-input"]', userData.confirmPassword);

  await page.click('[data-testid="register-button"]');

  // Aguardar redirecionamento ou mensagem de sucesso
  await page.waitForURL('**/(tabs)**', { timeout: 10000 }).catch(() => {
    // Se não redirecionou, verificar mensagem de sucesso
    return page.waitForSelector('[data-testid="registration-success"]', { timeout: 5000 });
  });
}

/**
 * Recupera senha
 */
export async function resetPassword(page: Page, email: string): Promise<void> {
  await page.goto('/(auth)/forgot-password');

  await page.fill('[data-testid="email-input"]', email);
  await page.click('[data-testid="reset-password-button"]');

  // Aguardar mensagem de sucesso
  await page.waitForSelector('[data-testid="reset-success"]', { timeout: 5000 });
}

/**
 * Verifica se o usuário está autenticado
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('[data-testid="authenticated-indicator"]', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica se o usuário está na tela de login
 */
export async function isOnLoginPage(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('/(auth)/login');
}

/**
 * Verifica que o login foi bem-sucedido
 */
export async function expectLoginSuccess(page: Page): Promise<void> {
  // Verificar indicador de autenticação
  await page.waitForSelector('[data-testid="authenticated-indicator"]', { timeout: 5000 });

  // Verificar que não estamos mais na tela de login
  expect(await isOnLoginPage(page)).toBe(false);
}

/**
 * Obtém o estado atual do usuário
 */
export async function getUserState(page: Page): Promise<TestUserState> {
  return page.evaluate(() => {
    const element = document.querySelector('[data-testid="user-state"]');
    if (!element) {
      throw new Error('User state element not found');
    }
    return JSON.parse(element.getAttribute('data-state') || '{}');
  });
}

/**
 * Configura estado de autenticação para testes
 */
export async function setAuthState(page: Page, state: Partial<TestUserState>): Promise<void> {
  await page.evaluate((stateData) => {
    // Simular estado de autenticação no localStorage/AsyncStorage
    localStorage.setItem('auth-state', JSON.stringify(stateData));
  }, state);

  // Recarregar a página para aplicar o estado
  await page.reload();
}

/**
 * Limpa o estado de autenticação
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth-state');
    sessionStorage.removeItem('auth-state');
  });

  await page.reload();
}

/**
 * Aguarda que a sessão expire (simulação)
 */
export async function waitForSessionExpiry(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Simular expiração de token
    localStorage.removeItem('auth-token');
  });

  // Aguardar redirecionamento para login
  await page.waitForURL('**/(auth)/login**', { timeout: 5000 });
}

/**
 * Verifica token de autenticação
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return localStorage.getItem('auth-token') || null;
  });
}

/**
 * Define token de autenticação para testes
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('auth-token', t);
  }, token);
}
