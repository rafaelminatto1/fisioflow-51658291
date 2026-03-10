import { test, expect } from '@playwright/test';

test.describe('Fluxo Financeiro', () => {
    test.beforeEach(async ({ page }) => {
        // Mock da camada financeira atual via Workers.
        await page.route(/\/api\/financial\/transacoes(?:\/[^/?#]+)?(?:\?.*)?$/i, async (route) => {
            const method = route.request().method();
            const url = route.request().url();

            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: [
                            { id: '1', descricao: 'Venda de Pacote Teste', valor: 500, status: 'concluido', tipo: 'receita', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                            { id: '2', descricao: 'Consulta Pendente', valor: 150, status: 'pendente', tipo: 'receita', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                        ]
                    })
                });
            } else if (method === 'PUT' && /\/api\/financial\/transacoes\/[^/?#]+/i.test(url)) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: { id: '2', descricao: 'Consulta Pendente', valor: 150, status: 'pago', tipo: 'receita', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                    })
                });
            } else {
                await route.continue();
            }
        });

        // O login já vem do storageState criado no global-setup.
        await page.goto('/financial');
        await page.waitForURL((url) => !url.pathname.includes('/auth'));
        const closeOnboardingButton = page.getByRole('button', { name: 'Close' });
        if (await closeOnboardingButton.isVisible().catch(() => false)) {
            await closeOnboardingButton.click();
        }
        await expect(page.locator('h1').filter({ hasText: 'Gestão Financeira' })).toBeVisible({ timeout: 10000 });
    });

    test('Deve exibir o dashboard financeiro corretamente', async ({ page }) => {
        await expect(page.getByText('Receita Total').first()).toBeVisible();
        await expect(page.getByText('Fluxo de Caixa').first()).toBeVisible();
        await expect(page.getByText('Consulta Pendente')).toBeVisible();
        await expect(page.getByText(/\+\sR\$\s?150/)).toBeVisible();
    });

    test('Deve permitir baixar uma transação pendente', async ({ page }) => {
        const updateResponse = page.waitForResponse((response) =>
            response.request().method() === 'PUT' &&
            /\/api\/financial\/transacoes\/[^/?#]+/i.test(response.url())
        );
        const payButton = page.locator('tr:has-text("Consulta Pendente") button.text-emerald-600').first();
        await payButton.evaluate((button: HTMLButtonElement) => button.click());
        await updateResponse;

        await expect(page.getByText('Transação marcada como paga')).toBeVisible();
    });

    test('Deve exibir botão de exportação', async ({ page }) => {
        const exportBtn = page.getByText('Exportar').first();
        await expect(exportBtn).toBeVisible();
    });
});
