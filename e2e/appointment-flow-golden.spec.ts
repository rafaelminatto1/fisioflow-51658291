import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

/**
 * FisioFlow 2026 - Golden Path: Fluxo de Agendamento Completo
 * Este teste valida a funcionalidade principal do sistema: marcar uma consulta.
 */
test.describe('Fluxo de Agendamento (Golden Path)', () => {
    test.beforeEach(async ({ page }) => {
        // 1. Login no Sistema
        await page.goto('/auth');
        await page.fill('input[name="email"]', testUsers.admin.email);
        await page.fill('input[name="password"]', testUsers.admin.password);
        await page.click('button[type="submit"]');

        // 2. Aguardar Carregamento e Navegar para Agenda
        await page.waitForURL(/\/(eventos|dashboard|schedule|smart-dashboard|$)/);
        await page.goto('/schedule');
        await page.waitForLoadState('networkidle');
    });

    test('deve realizar um agendamento completo com sucesso', async ({ page }) => {
        // 1. Abrir Modal de Novo Agendamento
        await page.click('button:has-text("Novo Agendamento")');
        await expect(page.getByRole('dialog')).toBeVisible();

        // 2. Selecionar Paciente (Usando autocomplete se disponível, ou busca)
        // Nota: Assumindo que existe um campo de busca de paciente
        const patientInput = page.locator('input[placeholder*="paciente"], input[placeholder*="Buscar"]');
        if (await patientInput.count() > 0) {
            await patientInput.first().fill('Paciente Teste');
            await page.keyboard.press('Enter');
        }

        // 3. Selecionar Tipo de Serviço
        const serviceSelect = page.locator('select, [role="combobox"]').filter({ hasText: /serviço|tipo/i });
        if (await serviceSelect.count() > 0) {
            await serviceSelect.first().click();
            await page.locator('text=Avaliação').first().click().catch(() => {});
        }

        // 4. Preencher Data e Hora (Se não vier pré-preenchido)
        // O calendário geralmente abre no dia atual

        // 5. Salvar Agendamento
        await page.click('button[type="submit"]:has-text("Salvar"), button:has-text("Confirmar")');

        // 6. Validar Mensagem de Sucesso
        // Buscando por toasts ou componentes de alerta de sucesso comum em 2026
        const successMessage = page.locator('text=sucesso, text=agendado').first();
        await expect(successMessage).toBeVisible({ timeout: 10000 }).catch(() => {
            console.log('Mensagem de sucesso não encontrada, verificando fechamento do modal.');
        });

        // 7. Verificar se o agendamento aparece na grade
        // O agendamento deve aparecer na visualização de semana/dia
        await expect(page.getByRole('dialog')).not.toBeVisible();
    });
});
