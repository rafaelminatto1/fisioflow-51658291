
// Usar a URL de produção

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://www.moocafisio.com.br';

// Gerar email aleatório para evitar duplicatas
const generateRandomEmail = () => `test-${Date.now()}@fisiotest.com`;

test.describe('Registro de Usuário - Produção', () => {
  test.use({ baseURL: PRODUCTION_URL });

  test('deve acessar página de auth e verificar formulário de cadastro', async ({ page }) => {
    await page.goto('/auth');

    // Aguardar página carregar
    await page.waitForLoadState('domcontentloaded');

    // Capturar screenshot para verificar estado
    await page.screenshot({ path: 'screenshots/auth-page.avif' });

    // Verificar se formulário de login está visível
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Verificar abas de login/cadastro
    const registerTab = page.locator('button:has-text("Cadastro")');
    await expect(registerTab).toBeVisible();

    console.log('✅ Página de auth carregada com sucesso');
  });

  test('deve trocar para aba de cadastro', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');

    // Clicar na aba de cadastro
    await page.click('button:has-text("Cadastro")');

    // Aguardar transição
    await page.waitForTimeout(500);

    // Verificar campos de cadastro
    await expect(page.locator('input#register-name')).toBeVisible();
    await expect(page.locator('input#register-email')).toBeVisible();
    await expect(page.locator('input#register-password')).toBeVisible();
    await expect(page.locator('input#register-confirm-password')).toBeVisible();

    console.log('✅ Formulário de cadastro visível');
  });

  test('deve tentar criar novo usuário', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');

    // Trocar para cadastro
    await page.click('button:has-text("Cadastro")');
    await page.waitForTimeout(500);

    // Preencher formulário
    const randomEmail = generateRandomEmail();
    const randomPassword = 'Teste123@';

    await page.fill('input#register-name', 'Usuário Teste E2E');
    await page.fill('input#register-email', randomEmail);
    await page.fill('input#register-password', randomPassword);
    await page.fill('input#register-confirm-password', randomPassword);

    // Capturar screenshot antes de submeter
    await page.screenshot({ path: 'screenshots/before-register.avif' });

    // Submeter formulário
    await page.click('button:has-text("Criar Conta Gratuita")');

    // Aguardar resposta - pode ser sucesso ou erro
    await page.waitForTimeout(5000);

    // Capturar screenshot após
    await page.screenshot({ path: 'screenshots/after-register.avif' });

    // Verificar se houve mensagem (sucesso ou erro)
    const pageContent = await page.content();

    // Verificar mensagens comuns
    if (pageContent.includes('Verifique seu email')) {
      console.log('✅ Cadastro iniciado com sucesso - email de confirmação enviado');
    } else if (pageContent.includes('já cadastrado') || pageContent.includes('already registered')) {
      console.log('⚠️ Email já cadastrado');
    } else if (pageContent.includes('Erro') || pageContent.includes('error')) {
      console.log('❌ Ocorreu um erro no cadastro');
      // Logar o conteúdo da página para debug
      console.log('Conteúdo da página:', pageContent.substring(0, 500));
    } else {
      console.log('ℹ️ Status do cadastro desconhecido');
      console.log('URL atual:', page.url());
    }

    // Verificar erros no console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Console Error:', msg.text());
      }
    });

    // Verificar erros de rede
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      const failure = request.failure();
      if (failure) {
        failedRequests.push(`${request.url()}: ${failure}`);
      }
    });

    // Esperar um pouco mais para capturar erros de rede
    await page.waitForTimeout(3000);

    if (failedRequests.length > 0) {
      console.log('❌ Requests falharam:', failedRequests);
    } else {
      console.log('✅ Nenhum erro de rede detectado');
    }
  });

  test('deve verificar se não há erros de JavaScript ao carregar a página', async ({ page }) => {
    const jsErrors: string[] = [];

    // Capturar erros de JavaScript
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');

    // Esperar um pouco para capturar erros que podem ocorrer após carregamento
    await page.waitForTimeout(3000);

    if (jsErrors.length > 0) {
      console.log('❌ Erros de JavaScript encontrados:', jsErrors);
      expect(jsErrors.length).toBe(0);
    } else {
      console.log('✅ Nenhum erro de JavaScript detectado');
    }
  });

  test('deve verificar se onboarding_progress e user_roles funcionam', async ({ page }) => {
    // Primeiro fazer login com usuário existente
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');

    // Tentar login com usuário de teste existente
    await page.fill('input[name="email"]', 'rafaelstarton@gmail.com');
    await page.fill('input[name="password"]', 'REDACTED');
    await page.click('button[type="submit"]');

    // Capturar todos os requests
    const apiRequests: { url: string; status: number }[] = [];
    page.on('response', response => {
      if (response.url().includes('/rest/v1/')) {
        apiRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Capturar erros
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      const failure = request.failure();
      const url = request.url();
      if (failure && (url.includes('onboarding_progress') || url.includes('user_roles'))) {
        failedRequests.push(`${url}: ${failure}`);
      }
    });

    // Aguardar navegação ou timeout
    try {
      await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard)/, { timeout: 10000 });
      console.log('✅ Login realizado com sucesso');
    } catch {
      console.log('⚠️ Redirecionamento após login demorou ou falhou');
    }

    // Esperar um pouco para capturar requests
    await page.waitForTimeout(3000);

    // Verificar requests para onboarding_progress e user_roles
    const onboardingRequests = apiRequests.filter(r => r.url.includes('onboarding_progress'));
    const userRolesRequests = apiRequests.filter(r => r.url.includes('user_roles'));

    console.log(`📊 Requests para onboarding_progress: ${onboardingRequests.length}`);
    onboardingRequests.forEach(r => {
      console.log(`   - Status ${r.status}: ${r.url.substring(0, 100)}...`);
    });

    console.log(`📊 Requests para user_roles: ${userRolesRequests.length}`);
    userRolesRequests.forEach(r => {
      console.log(`   - Status ${r.status}: ${r.url.substring(0, 100)}...`);
    });

    // Verificar erros específicos
    if (failedRequests.length > 0) {
      console.log('❌ Requests para onboarding_progress ou user_roles falharam:');
      failedRequests.forEach(f => console.log(`   - ${f}`));
      expect(failedRequests.length).toBe(0);
    } else {
      console.log('✅ Nenhum erro detectado em onboarding_progress ou user_roles');
    }

    // Capturar screenshot final
    await page.screenshot({ path: 'screenshots/after-login.avif', fullPage: true });
  });
});
