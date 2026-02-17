import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Fluxo Financeiro', () => {
    test.beforeEach(async ({ page }) => {
        // Mock HTTP V2 da camada financeira
        await page.route(/listtransactionsv2|updatetransactionv2/i, async (route) => {
            const method = route.request().method();
            const url = route.request().url().toLowerCase();

            if (method === 'POST' && url.includes('listtransactionsv2')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: [
                            { id: '1', descricao: 'Venda de Pacote Teste', valor: 500, status: 'concluido', tipo: 'receita', created_at: new Date().toISOString() },
                            { id: '2', descricao: 'Consulta Pendente', valor: 150, status: 'pendente', tipo: 'receita', created_at: new Date().toISOString() }
                        ],
                        total: 2
                    })
                });
            } else if (method === 'POST' && url.includes('updatetransactionv2')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: { id: '2', status: 'concluido' }
                    })
                });
            } else {
                await route.continue();
            }
        });

        // Realizar Login
        await page.goto('/auth');
        await page.fill('input[type="email"]', testUsers.admin.email);
        await page.fill('input[type="password"]', testUsers.admin.password);
        await page.click('button[type="submit"]');

        await page.waitForURL(/(\/dashboard|\/schedule|\/agenda|\/$)/);

        // Navegar para Financeiro
        await page.goto('/financial');
        await expect(page.getByRole('heading', { name: 'Gestão Financeira' })).toBeVisible({ timeout: 10000 });
    });

    test('Deve exibir o dashboard financeiro corretamente', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Receita Total' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Fluxo de Caixa' })).toBeVisible();
        await expect(page.getByText('Consulta Pendente')).toBeVisible();
        await expect(page.getByText(/\+\sR\$\s?150/)).toBeVisible();
    });

    test('Deve permitir baixar uma transação pendente', async ({ page }) => {
        const row = page.getByRole('row').filter({ hasText: 'Consulta Pendente' });
        await row.locator('button').first().click();

        await expect(page.getByText('Transação marcada como paga')).toBeVisible();
    });

    test('Deve exibir botão de exportação', async ({ page }) => {
        const exportBtn = page.getByRole('button', { name: 'Exportar' });
        await expect(exportBtn).toBeVisible();
        await exportBtn.click();
    });
});
