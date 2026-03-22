/**
 * Testes E2E para Fluxo de Autenticação
 *
 * Testa o fluxo completo de autenticação incluindo:
 * - Login com email/senha
 * - Login com biometria
 * - Logout
 * - Recuperação de senha
 * - Registro de novo usuário
 * - Sessões expiradas
 * - Proteção de rotas
 */

import { test, expect } from '@playwright/test';
import {
  login,
  logout,
  loginWithBiometrics,
  registerUser,
  resetPassword,
  isAuthenticated,
  TEST_CREDENTIALS,
} from './fixtures/auth';
import {
  navigateTo,
  expectAuthenticated,
  expectNotAuthenticated,
  expectOnLogin,
  ROUTES,
  goToPatients,
} from './helpers/navigation';

test.describe('Fluxo de Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    // Limpar estado de autenticação antes de cada teste
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Login', () => {
    test('deve fazer login com credenciais válidas', async ({ page }) => {
      await login(page, TEST_CREDENTIALS.professional);
      await expectAuthenticated(page);

      // Verificar redirecionamento para home
      const currentRoute = page.url();
      expect(currentRoute).toContain('/(tabs)');
    });

    test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
      await page.goto(ROUTES.login);
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');

      // Verificar mensagem de erro
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-error"]')).toContainText('inválidas');
    });

    test('deve validar formato de email', async ({ page }) => {
      await page.goto(ROUTES.login);
      await page.fill('[data-testid="email-input"]', 'not-an-email');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Verificar validação
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });

    test('deve exigir senha', async ({ page }) => {
      await page.goto(ROUTES.login);
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.click('[data-testid="login-button"]');

      // Verificar validação
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });
  });

  test.describe('Login com Biometria', () => {
    test('deve oferecer opção de login com biometria', async ({ page }) => {
      await page.goto(ROUTES.login);

      // Verificar botão de biometria
      const biometricButton = page.locator('[data-testid="biometric-login-button"]');
      await expect(biometricButton).toBeVisible();
    });

    test('deve fazer login com biometria quando disponível', async ({ page }) => {
      await loginWithBiometrics(page);
      await expectAuthenticated(page);
    });

    test('deve mostrar erro quando biometria falha', async ({ page }) => {
      await page.goto(ROUTES.login);

      // Simular falha de biometria
      await page.evaluate(() => {
        window.biometricResult = false;
      });

      await page.click('[data-testid="biometric-login-button"]');

      // Verificar mensagem de erro
      await expect(page.locator('[data-testid="biometric-error"]')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('deve fazer logout corretamente', async ({ page }) => {
      // Fazer login primeiro
      await login(page, TEST_CREDENTIALS.professional);

      // Fazer logout
      await logout(page);

      // Verificar redirecionamento para login
      await expectOnLogin(page);
      await expectNotAuthenticated(page);
    });

    test('deve limpar estado ao fazer logout', async ({ page }) => {
      // Fazer login
      await login(page, TEST_CREDENTIALS.professional);

      // Navegar para uma rota
      await goToPatients(page);

      // Fazer logout
      await logout(page);

      // Tentar acessar rota protegida
      await goToPatients(page);

      // Deve redirecionar para login
      await expectOnLogin(page);
    });

    test('deve pedir confirmação ao fazer logout', async ({ page }) => {
      await login(page, TEST_CREDENTIALS.professional);

      // Abrir menu de perfil
      await page.click('[data-testid="profile-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Verificar modal de confirmação
      await expect(page.locator('[data-testid="logout-confirmation-modal"]')).toBeVisible();

      // Clicar em cancelar
      await page.click('[data-testid="cancel-logout-button"]');

      // Modal deve fechar e usuário deve continuar logado
      await expect(page.locator('[data-testid="logout-confirmation-modal"]')).not.toBeVisible();
      await expectAuthenticated(page);
    });
  });

  test.describe('Registro', () => {
    test('deve registrar novo usuário com sucesso', async ({ page }) => {
      const userData = {
        name: 'Novo Usuário Teste',
        email: 'newuser@example.com',
        password: 'Test@123456',
        confirmPassword: 'Test@123456',
      };

      await registerUser(page, userData);

      // Verificar que foi redirecionado
      const currentRoute = page.url();
      expect(currentRoute).toContain('/(tabs)');

      // Verificar autenticação
      await expectAuthenticated(page);
    });

    test('deve validar senhas correspondentes', async ({ page }) => {
      await page.goto(ROUTES.register);

      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123');
      await page.click('[data-testid="register-button"]');

      // Verificar erro de senhas não correspondentes
      await expect(page.locator('[data-testid="password-mismatch-error"]')).toBeVisible();
    });

    test('deve validar força da senha', async ({ page }) => {
      await page.goto(ROUTES.register);

      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'weak');
      await page.click('[data-testid="register-button"]');

      // Verificar erro de senha fraca
      await expect(page.locator('[data-testid="password-strength-error"]')).toBeVisible();
    });
  });

  test.describe('Recuperação de Senha', () => {
    test('deve enviar email de recuperação', async ({ page }) => {
      const email = 'test@example.com';
      await resetPassword(page, email);

      // Verificar mensagem de sucesso
      await expect(page.locator('[data-testid="reset-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="reset-success"]')).toContainText(email);
    });

    test('deve validar email ao solicitar recuperação', async ({ page }) => {
      await page.goto(ROUTES.forgotPassword);

      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="reset-password-button"]');

      // Verificar erro
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });
  });

  test.describe('Sessão Expirada', () => {
    test('deve redirecionar para login quando sessão expira', async ({ page }) => {
      // Fazer login
      await login(page, TEST_CREDENTIALS.professional);

      // Simular expiração de sessão
      await page.evaluate(() => {
        localStorage.removeItem('auth-token');
      });

      // Tentar navegar
      await goToPatients(page);

      // Deve redirecionar para login
      await expectOnLogin(page);
    });

    test('deve mostrar mensagem de sessão expirada', async ({ page }) => {
      await login(page, TEST_CREDENTIALS.professional);

      // Simular expiração
      await page.evaluate(() => {
        localStorage.removeItem('auth-token');
      });

      // Tentar fazer uma ação que requer autenticação
      await goToPatients(page);

      // Verificar mensagem
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });
  });

  test.describe('Proteção de Rotas', () => {
    test('deve redirecionar para login ao acessar rota protegida', async ({ page }) => {
      // Tentar acessar diretamente uma rota protegida
      await navigateTo(page, ROUTES.patients);

      // Deve redirecionar para login
      await expectOnLogin(page);
    });

    test('deve redirecionar para home após login', async ({ page }) => {
      // Tentar acessar rota protegida
      await navigateTo(page, ROUTES.patients);

      // Fazer login
      await login(page, TEST_CREDENTIALS.professional);

      // Deve redirecionar para a rota original ou home
      const currentRoute = page.url();
      expect(currentRoute).toMatch(/\/(tabs|patients)/);
    });

    test('deve manter rota original após login quando redirecionado', async ({ page }) => {
      // Acessar rota protegida específica
      await navigateTo(page, '/patients/details/test-id');

      // Fazer login
      await login(page, TEST_CREDENTIALS.professional);

      // Deve tentar redirecionar para a rota original
      // Pode cair em home se o paciente não existir
      const currentRoute = page.url();
      expect(currentRoute).toMatch(/\/(tabs|patients)/);
    });

    test('não deve redirecionar rota pública para login', async ({ page }) => {
      // Acessar rota pública
      await navigateTo(page, ROUTES.login);

      // Deve ficar na tela de login
      await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
    });
  });

  test.describe('Persistência de Sessão', () => {
    test('deve manter sessão após recarregar página', async ({ page }) => {
      await login(page, TEST_CREDENTIALS.professional);
      await page.reload();

      // Deve continuar autenticado
      await expectAuthenticated(page);
    });

    test('deve manter sessão após fechar e reabrir app', async ({ context }) => {
      // Criar página
      const page = await context.newPage();
      await login(page, TEST_CREDENTIALS.professional);

      // Fechar página
      await page.close();

      // Criar nova página
      const newPage = await context.newPage();
      await newPage.goto('/');

      // Deve estar autenticado
      await expectAuthenticated(newPage);
    });
  });

  test.describe('Múltiplas Sessões', () => {
    test('deve fazer logout em todas as abas', async ({ context }) => {
      // Criar duas páginas
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      // Fazer login em ambas
      await login(page1, TEST_CREDENTIALS.professional);
      await login(page2, TEST_CREDENTIALS.professional);

      // Fazer logout em uma
      await logout(page1);

      // Outra também deve fazer logout (depende da implementação)
      await page2.reload();
      const isAuth = await isAuthenticated(page2);

      // Se implementação usa localStorage compartilhado, deve estar deslogado
      expect(isAuth).toBe(false);
    });
  });

  test.describe('Acessibilidade', () => {
    test('deve ter labels ARIA nos campos de formulário', async ({ page }) => {
      await page.goto(ROUTES.login);

      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');

      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(passwordInput).toHaveAttribute('aria-label');
    });

    test('deve focar no campo de email ao carregar', async ({ page }) => {
      await page.goto(ROUTES.login);

      const emailInput = page.locator('[data-testid="email-input"]');
      await expect(emailInput).toBeFocused();
    });
  });
});
