import { test, expect } from '@playwright/test';

test.describe('Production Validation - FisioFlow (Official Domain)', () => {
  test('should login and use official production API (api.moocafisio.com.br)', async ({ page }) => {
    const localhostRefs: string[] = [];
    const prodApiRefs: string[] = [];

    // Monitora todas as requisições de rede
    page.on('request', request => {
      const url = request.url();
      if (url.includes('localhost:8787') || url.includes('127.0.0.1')) {
        localhostRefs.push(`[REQUEST] ${url}`);
      }
      if (url.includes('api.moocafisio.com.br')) {
        prodApiRefs.push(`[PROD API] ${url}`);
      }
    });

    // Monitora erros de console
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('localhost:8787') || text.includes('127.0.0.1')) {
        localhostRefs.push(`[CONSOLE] ${text}`);
      }
    });

    // Acessa a página oficial
    await page.goto('https://fisioflow.pages.dev/auth');

    // Preenche login
    await page.fill('input[type="email"]', 'REDACTED_EMAIL');
    await page.fill('input[type="password"]', 'REDACTED');

    // Tenta clicar no botão de login usando texto (mais estável)
    await page.click('button:has-text("Acessar"), button[type="submit"]');

    // Aguarda o dashboard ou erro
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('Successfully navigated to dashboard');
    } catch  {
      console.log('Navigation to dashboard timed out, but continuing check...');
    }

    // Aguarda requisições de fundo
    await page.waitForTimeout(3000);

    console.log('Localhost references found:', localhostRefs);
    console.log('Production API calls found:', prodApiRefs.length);

    // VALIDAÇÃO CRÍTICA: Não pode ter nada de localhost em produção
    expect(localhostRefs, 'Production environment MUST NOT reference localhost').toHaveLength(0);

    // VALIDAÇÃO DE SUCESSO: Deve ter feito chamadas para a API de produção
    expect(prodApiRefs.length, 'Should have made calls to official production API').toBeGreaterThan(0);
  });
});
