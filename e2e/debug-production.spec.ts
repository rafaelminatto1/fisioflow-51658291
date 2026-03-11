import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Debug Produção - moocafisio.com.br', () => {
  test('deve tentar login e verificar erros de IA', async ({ page }) => {
    const targetBaseUrl = process.env.E2E_PROD_BASE_URL || process.env.BASE_URL || 'https://moocafisio.com.br';
    const loginEmail = testUsers.admin.email;
    const loginPassword = testUsers.admin.password;
    const failedRequests: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`[Console] ${msg.text()}`);
      }
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`[HTTP ${response.status()}] ${response.url()}`);
        failedRequests.push(`${response.status()}: ${response.url()}`);
      }
    });

    // 1. Acessar o domínio customizado
    console.log(`[Test] Acessando ${targetBaseUrl}...`);
    await page.goto(`${targetBaseUrl}/auth`, { waitUntil: 'networkidle' });

    // 2. Tentar realizar o login
    console.log(`[Test] Tentando login para ${loginEmail}...`);
    await page.locator('#login-email, input[type="email"]').first().fill(loginEmail);
    await page.locator('#login-password, input[type="password"]').first().fill(loginPassword);
    await page.click('button[type="submit"]');

    // Aguardar transição ou erro
    await page.waitForTimeout(5000);

    // 3. Verificar erros específicos de versão
    const hasOldVersionError = failedRequests.some(r => r.includes('0.10.22'));
    const hasAuthForbidden = failedRequests.some(r => r.includes('403') && r.includes('auth'));

    console.log('\n--- RELATÓRIO DE DEBUG ---');
    console.log(`Erro 403 no Login: ${hasAuthForbidden ? 'SIM' : 'NÃO'}`);
    console.log(`Erro 404 MediaPipe (0.10.22): ${hasOldVersionError ? 'SIM' : 'NÃO'}`);
    console.log('--------------------------\n');

    // Se o login falhar com 403, vamos tentar entender por que
    if (hasAuthForbidden) {
      console.log('⚠️ O login falhou com 403 Forbidden. Provavelmente o domínio moocafisio.com.br não está na ALLOWED_ORIGINS do Neon Auth.');
    }

    // Se o erro de IA persistir, vamos forçar uma limpeza no teste
    if (hasOldVersionError) {
      console.log('⚠️ O erro de versão antiga ainda aparece. O bundle JS servido para moocafisio.com.br ainda contém o código antigo.');
    } else {
      console.log('✅ Nenhum erro de versão antiga (0.10.22) detectado nesta sessão limpa.');
    }
  });
});
