import { test, expect } from '@playwright/test';

test.describe('Produção - Validação de Acesso FisioFlow 2026', () => {
  test('deve realizar login com sucesso no ambiente de produção', async ({ page }) => {
    // 1. Acessar a página oficial
    console.log('Acessando https://moocafisio.com.br...');
    await page.goto('https://moocafisio.com.br/auth/login');

    // 2. Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');

    // 3. Clicar no botão de entrar
    console.log('Procurando botão de login...');
    const loginButton = page.locator('button:has-text("Entrar"), button[type="submit"], .btn-primary').first();
    
    // Diagnóstico se falhar
    try {
      await loginButton.waitFor({ state: 'visible', timeout: 10000 });
      await loginButton.click();
    } catch (e) {
      console.log('Botão não encontrado. Botões disponíveis na página:');
      const buttons = await page.locator('button').allTextContents();
      console.log(buttons);
      throw e;
    }

    // 4. Aguardar navegação para o dashboard ou agenda
    console.log('Aguardando redirecionamento...');
    await page.waitForURL(url => url.pathname.includes('/dashboard') || url.pathname.includes('/agenda'), { timeout: 20000 });

    // 5. Validar elementos logados
    const isDashboard = page.url().includes('dashboard');
    const isAgenda = page.url().includes('agenda');
    
    if (isDashboard) {
      await expect(page.locator('text=Dashboard')).toBeVisible();
    } else if (isAgenda) {
      await expect(page.locator('text=Agenda')).toBeVisible();
    }
    
    // Validar se o nome do usuário aparece (ajustar se necessário)
    // await expect(page.locator('text=Rafael')).toBeVisible();

    console.log('✅ Validação de produção concluída com sucesso!');
  });
});
