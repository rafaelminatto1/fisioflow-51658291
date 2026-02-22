import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Verificação de Login - Correção Erro 500', () => {
    test('deve fazer login sem erro 500', async ({ page }) => {
        console.log('Navegando para página de login...');
        await page.goto('/auth');

        // Preencher credenciais de teste
        console.log('Preenchendo credenciais...');
        await page.fill('input[name="email"]', testUsers.fisio.email);
        await page.fill('input[name="password"]', testUsers.fisio.password);

        console.log('Clicando em Entrar...');
        await page.click('button[type="submit"]');

        // Verificar sucesso na UI (redirecionamento ou ausência de erro)
        await expect(page.locator('text=/erro|falha|500/i')).not.toBeVisible({ timeout: 5000 });

        // Esperar redirecionamento para dashboard
        await expect(page).toHaveURL(/\/(\?.*)?$/, { timeout: 15000 });
        console.log('Login realizado com sucesso e redirecionado para home.');
    });
});
