import { test, expect } from '@playwright/test';

test.describe('Debug Produção - moocafisio.com.br', () => {
  test('deve tentar login e verificar erros de IA', async ({ page }) => {
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
    console.log('[Test] Acessando moocafisio.com.br...');
    await page.goto('https://moocafisio.com.br/auth', { waitUntil: 'networkidle' });

    // 2. Tentar realizar o login
    console.log('[Test] Tentando login para rafael.minatto@yahoo.com...');
    await page.fill('input[name="email"]', 'rafael.minatto@yahoo.com');
    await page.fill('input[name="password"]', 'REDACTED');
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
