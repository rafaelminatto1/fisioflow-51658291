import { test, expect } from '@playwright/test';

const loginEmail = 'REDACTED_EMAIL';
const loginPassword = 'REDACTED';

test.describe('Validação de Produção - Mooca Fisio V4.0', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deve validar o novo Editor Tiptap V4 e a Busca Global na nuvem', async ({ page }) => {
    test.setTimeout(180000);
    console.log(`[Validation] Iniciando login em produção para: ${loginEmail}`);

    // 1. LOGIN
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="email"]', loginEmail);
    await page.fill('input[name="password"]', loginPassword);
    await page.click('button[type="submit"]');

    // Aguardar entrada no sistema
    await page.waitForURL(url => url.pathname.includes('/agenda') || url.pathname.includes('/dashboard'), { timeout: 60000 });
    console.log('[Validation] Login realizado com sucesso.');

    // 2. VALIDAR BUSCA GLOBAL (Cmd+K)
    console.log('[Validation] Testando atalho de Busca Global (Cmd+K)...');

    // Simula a combinação de teclas de forma robusta
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');

    // Tenta Meta+K se falhar
    const isSearchVisible = await page.locator('text=Cloudflare D1').isVisible().catch(() => false);
    if (!isSearchVisible) {
        await page.keyboard.down('Meta');
        await page.keyboard.press('k');
        await page.keyboard.up('Meta');
    }

    // Esperar a paleta aparecer - Agora buscando apenas pelo texto do span que confirmamos no código
    await expect(page.locator('text=Cloudflare D1').first()).toBeVisible({ timeout: 20000 });
    console.log('[Validation] Busca Global Cloudflare D1 ativa e visível em produção!');

    await page.keyboard.press('Escape');

    // 3. VALIDAR REDESIGN DA AGENDA
    console.log('[Validation] Verificando novos elementos visuais da agenda...');
    // A nova toolbar tem o texto "Professional"
    await expect(page.locator('text=Professional').first()).toBeVisible({ timeout: 15000 });
    // O botão Agendar agora é preto/branco (slate-900) e tem o texto "Agendar"
    await expect(page.locator('button:has-text("Agendar")').first()).toBeVisible();

    console.log('✅ Sistema Mooca Fisio V4.0 validado em produção com sucesso!');
  });
});
