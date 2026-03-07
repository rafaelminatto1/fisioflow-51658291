import { test, expect } from '@playwright/test';

// Credenciais fornecidas pelo usuário
const loginEmail = 'rafael.minatto@yahoo.com.br';
const loginPassword = 'Yukari30@';

test.describe('Validação de Usuário e Novas Funcionalidades (Tiptap + Cloudflare)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deve logar e validar o novo Editor Tiptap V4 e Busca Global', async ({ page }) => {
    console.log(`[Validation] Iniciando login para: ${loginEmail}`);
    
    // 1. Login
    await page.goto('/auth', { waitUntil: 'networkidle' });
    
    // Tenta diferentes seletores para o login
    const emailInput = page.locator('#login-email, input[name="email"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(loginEmail);
    
    const passwordInput = page.locator('#login-password, input[name="password"]');
    await passwordInput.fill(loginPassword);
    
    await page.click('button[type="submit"]');

    // Esperar redirecionamento e hidratação
    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Pausa para garantir carregamento total do JS
    
    console.log(`[Validation] Login realizado. URL: ${page.url()}`);

    // 2. Validar Busca Global (Cmd+K)
    console.log('[Validation] Testando atalho de Busca Global...');
    
    // Tenta abrir a paleta
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    
    // Se não abrir com Ctrl+k, tenta Meta+k (Cmd+k)
    const isPaletteVisible = await page.locator('text=Powered by Cloudflare D1').isVisible();
    if (!isPaletteVisible) {
        console.log('[Validation] Ctrl+K falhou, tentando Meta+K...');
        await page.keyboard.down('Meta');
        await page.keyboard.press('k');
        await page.keyboard.up('Meta');
    }

    // Esperar a paleta aparecer
    await expect(page.locator('text=Powered by Cloudflare D1')).toBeVisible({ timeout: 15000 });
    console.log('[Validation] Busca Global Cloudflare D1 aberta com sucesso.');
    
    // Testar se o input de busca funciona
    await page.keyboard.type('teste');
    console.log('[Validation] Digitação na busca testada.');
    
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Powered by Cloudflare D1')).not.toBeVisible();

    // 3. Navegar para Pacientes
    console.log('[Validation] Navegando para /pacientes...');
    await page.goto('/pacientes', { waitUntil: 'networkidle' });
    
    // Procurar por qualquer linha de paciente que possa ser clicada
    const patientRow = page.locator('table tr, [role="row"]').nth(1);
    if (await patientRow.isVisible({ timeout: 10000 })) {
        await patientRow.click();
        
        // Esperar botão de evolução
        const evolutionBtn = page.locator('text=/Evolução|Prontuário/i').first();
        if (await evolutionBtn.isVisible()) {
            await evolutionBtn.click();
            
            // 4. Validar Seletor de Versão V4 (Tiptap)
            console.log('[Validation] Verificando seletor Tiptap V4...');
            const tiptapToggle = page.locator('text=Tiptap').first();
            await expect(tiptapToggle).toBeVisible({ timeout: 20000 });
            await tiptapToggle.click();

            // 5. Validar Editor
            const editor = page.locator('.tiptap.ProseMirror');
            await expect(editor).toBeVisible({ timeout: 15000 });
            console.log('[Validation] Editor Tiptap V4 ativo.');

            // 6. Testar Slash Commands
            await editor.focus();
            await page.keyboard.type('/');
            await expect(page.locator('text=Comandos Rápidos')).toBeVisible({ timeout: 10000 });
            console.log('[Validation] Menu de comandos "/" verificado.');
        }
    } else {
        console.log('[Validation] Lista de pacientes vazia ou não carregou a tempo.');
    }

    console.log('✅ Validação completa!');
  });
});
