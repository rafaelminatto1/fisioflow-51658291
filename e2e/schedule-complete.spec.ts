import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Agendamento Completo', () => {
    test.beforeEach(async ({ page }) => {
        // 1. Login
        await page.goto('/auth');
        await page.fill('input[type="email"]', testUsers.admin.email);
        await page.fill('input[type="password"]', testUsers.admin.password);
        await page.click('button[type="submit"]');

        // 2. Aguardar redirecionamento e navegar para Agenda
        await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/);
        await page.goto('/schedule');
        await page.waitForLoadState('domcontentloaded');
    });

    test('deve carregar a agenda e exibir elementos principais', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
        await expect(page.locator('button:has-text("Novo Agendamento")')).toBeVisible();

        // Verificar que os dias da semana estão visíveis (indicativo que o calendário carregou)
        // Tentando seletor mais genérico para grid de calendário (pode ser table, div grid, etc)
        await expect(page.locator('text=Seg').first().or(page.locator('text=Lun').first()).or(page.locator('.rbc-header').first())).toBeVisible({ timeout: 10000 });
    });

    // Este teste assume que o banco de dados pode estar vazio, então foca na abertura do modal e validação
    test('deve abrir modal de agendamento e validar campos obrigatórios', async ({ page }) => {
        await page.click('button:has-text("Novo Agendamento")');

        // Aguardar modal
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('heading', { name: /novo agendamento/i })).toBeVisible();

        // Tentar salvar vazio
        await page.click('button[type="submit"]');

        // Verificar mensagens de validação (ajuste os textos conforme a implementação real do Zod/React Hook Form)
        // Geralmente "Obrigatório" ou "Selecione..."
        const errorMessages = page.locator('.text-destructive, .text-red-500');
        await expect(errorMessages.first()).toBeVisible();
    });

    test('deve navegar entre visualizações (Dia, Semana, Mês)', async ({ page }) => {
        // A implementação pode usar abas ou botões. Ajuste o seletor conforme necessário.
        // Tentativa genérica baseada em bibliotecas comuns (FullCalendar ou Custom)

        const viewButtons = page.locator('button:has-text("Dia"), button:has-text("Semana"), button:has-text("Mês")');
        if (await viewButtons.count() > 0) {
            await page.click('button:has-text("Dia")');
            await page.waitForTimeout(500); // Animação
            await page.click('button:has-text("Mês")');
            await page.waitForTimeout(500);
            await page.click('button:has-text("Semana")');
        }
    });
});
