import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Teste de erros Supabase - Iniciar Atendimento (Firebase Migration)', () => {
  test('Deve fazer login e iniciar atendimento sem erros 404 do Supabase', async ({ page }) => {
    // Navegar para a página de login local
    await page.goto('http://localhost:8082/login');

    // Aguardar a página carregar
    await page.waitForLoadState('domcontentloaded');

    // Capturar erros do console antes de qualquer ação
    const consoleErrors: string[] = [];
    const networkErrors: { status: number; url: string }[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capturar requisições de rede para detectar chamadas ao Supabase
    page.on('response', response => {
      const url = response.url();
      if (url.includes('supabase.co')) {
        networkErrors.push({
          status: response.status(),
          url: url
        });
      }
    });

    // Preencher credenciais
    const emailInput = page.locator('input[name="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[name="password"], input[name="password"]').first();

    if (await emailInput.isVisible({ timeout: 2000 })) {
      await emailInput.fill(testUsers.fisio.email);
      await passwordInput.fill(testUsers.fisio.password);

      // Clicar no botão de login
      const loginButton = page.locator('button:has-text("Entrar"), button:has-text("Login"), button[type="submit"]').first();
      await loginButton.click();

      // Aguardar redirecionamento após login
      await page.waitForTimeout(3000);
    }

    // Navegar para a agenda
    await page.goto('http://localhost:8082/schedule');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verificar se há botão para iniciar atendimento
    const startAttendanceButton = page.locator('button:has-text("Iniciar")').first();

    if (await startAttendanceButton.isVisible({ timeout: 2000 })) {
      console.log('Clicando em "Iniciar Atendimento"...');
      await startAttendanceButton.click();

      // Aguardar carregamento da página de evolução
      await page.waitForTimeout(3000);

      // Capturar erros após clicar
      await page.waitForTimeout(2000);
    }

    // Log dos resultados
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              RESULTADO DO TESTE                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`Erros do console capturados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }

    console.log(`\nRequisições Supabase capturadas: ${networkErrors.length}`);
    if (networkErrors.length > 0) {
      networkErrors.forEach(err => {
        console.log(`  [${err.status}] ${err.url}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Verificar se há erros 404 do Supabase (indica migração incompleta)
    const supabase404Errors = networkErrors.filter(e =>
      e.status === 404 && e.url.includes('supabase.co')
    );

    if (supabase404Errors.length > 0) {
      console.error('❌ FALHA: Ainda há chamadas ao Supabase retornando 404!');
      console.error(`   ${supabase404Errors.length} erros encontrados`);
    } else {
      console.log('✅ SUCESSO: Não há erros 404 do Supabase!');
      console.log('   A migração para Firebase está funcionando para este fluxo.');
    }

    // Falhar o teste se houver erros 404 do Supabase
    expect(supabase404Errors.length).toBe(0);
  });
});
