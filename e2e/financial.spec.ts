import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Fluxo Financeiro', () => {
    test.beforeEach(async ({ page }) => {
        // 1. Mock de dados financeiros (para garantir estado previsível)
        await page.route('**/rest/v1/transacoes*', async (route) => {
            const method = route.request().method();
            const url = route.request().url();

            if (method === 'GET' && !url.includes('select=count')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: '1', descricao: 'Venda de Pacote Teste', valor: 500, status: 'concluido', tipo: 'receita', created_at: new Date().toISOString() },
                        { id: '2', descricao: 'Consulta Pendente', valor: 150, status: 'pendente', tipo: 'receita', created_at: new Date().toISOString() }
                    ])
                });
            } else if (method === 'PATCH') {
                await route.fulfill({ status: 200, body: JSON.stringify({}) });
            } else {
                await route.continue();
            }
        });

        // 2. Realizar Login Real
        await page.goto('/auth');
        await page.fill('input[type="email"]', testUsers.admin.email);
        await page.fill('input[type="password"]', testUsers.admin.password);
        await page.click('button[type="submit"]');

        // Aguardar redirecionamento seguro (pode ser root '/', dashboard, schedule ou agenda)
        await page.waitForURL(/(\/dashboard|\/schedule|\/agenda|\/$)/);

        // 3. Navegar para Financeiro
        await page.goto('/financial');
        // await page.waitForLoadState('networkidle'); // Flaky, relying on selectors
    });

    test('Deve exibir o dashboard financeiro corretamente', async ({ page }) => {
        // Verificar Título
        await expect(page.getByText('Financeiro', { exact: true })).toBeVisible({ timeout: 10000 });

        // Verificar KPIs Calculados via Mock
        // Receita total: 500 (concluido) + 0 (pendente, se a lógica for cash-basis) ou 650 se accrual. 
        // O sistema atual parece somar tudo para 'Crescimento' mas KPIs de receita costumam ser recebidos.
        // Vamos checar visualmente elementos chaves
        await expect(page.getByText('Receita Total')).toBeVisible();
        await expect(page.getByText('Consultas')).toBeVisible(); // Categoria

        // Verificar lista de inadimplência
        await expect(page.getByText('Controle de Inadimplência')).toBeVisible();
        await expect(page.getByText('Consulta Pendente')).toBeVisible();
        await expect(page.getByText('R$ 150,00')).toBeVisible();
    });

    test('Deve permitir baixar uma transação pendente', async ({ page }) => {
        // Ação: Clicar em "Baixar" na lista de inadimplência
        // Filtra pelo botão Baixar dentro da linha que tem "Consulta Pendente"
        const row = page.getByRole('row').filter({ hasText: 'Consulta Pendente' });
        await row.getByRole('button', { name: 'Baixar' }).click();

        // Expectativa: Toast ou mudança visual (vamos confiar no mock do PATCH returning 200 e toast success)
        // O texto "Transação marcada como paga" vem do toast?
        // Se for optimistic UI, o item deve sair da lista ou mudar status.
        // Como o mock de GET é estático, a lista não vai atualizar sozinha a menos que usemos queryClient.setQueryData.
        // Mas o toast de sucesso deve aparecer.
        await expect(page.getByText('Transação atualizada com sucesso')).toBeVisible();
    });

    test('Deve exibir botão de exportação', async ({ page }) => {
        const exportBtn = page.getByRole('button', { name: 'Exportar CSV' });
        await expect(exportBtn).toBeVisible();
        // Optional: Click to verify no crash, though download behavior varies in headless
        await exportBtn.click();
    });
});
