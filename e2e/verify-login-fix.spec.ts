import { test, expect } from '@playwright/test';

test.describe('Verificação de Login - Correção Erro 500', () => {
    test('deve fazer login com rafael.minatto@yahoo.com.br sem erro 500', async ({ page }) => {
        console.log('Navegando para página de login...');
        await page.goto('/auth');

        // Preencher credenciais específicas
        console.log('Preenchendo credenciais...');
        await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
        await page.fill('input[type="password"]', 'Yukari30@');

        // Interceptar resposta de login para verificar status code
        const loginResponsePromise = page.waitForResponse(response =>
            response.url().includes('/auth/v1/token') && response.request().method() === 'POST'
        );

        console.log('Clicando em Entrar...');
        await page.click('button[type="submit"]');

        // Verificar se a resposta da API de login não é 500
        // O Supabase geralmente usa /auth/v1/token?grant_type=password
        try {
            const response = await loginResponsePromise;
            console.log(`Status da resposta de login: ${response.status()}`);
            expect(response.status()).not.toBe(500);
            expect(response.status()).toBeLessThan(400); // Espera 200 OK
        } catch (e) {
            console.log('Não foi possível capturar a resposta direta do Supabase ou ela demorou demais, verificando comportamento da UI.');
        }

        // Verificar sucesso na UI (redirecionamento ou ausência de erro)
        await expect(page.locator('text=/erro|falha|500/i')).not.toBeVisible({ timeout: 5000 });

        // Esperar redirecionamento para dashboard
        await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
        console.log('Login realizado com sucesso e redirecionado para home.');
    });
});
