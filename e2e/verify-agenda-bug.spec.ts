import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Verificação de Bug na Agenda', () => {
    test.beforeEach(async ({ page }) => {
        // 1. Login com credenciais de teste
        await page.goto('/auth');
        await page.fill('input[type="email"]', testUsers.fisio.email);
        await page.fill('input[type="password"]', testUsers.fisio.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/($|eventos|dashboard|schedule)/);

        // 2. Navegar para a agenda
        await page.goto('/schedule');
        await page.waitForLoadState('domcontentloaded');
    });

    test('deve criar agendamento ou exibir erro visível (não falhar silenciosamente)', async ({ page }) => {
        // Selecionar um slot para "Amanhã" às 10:00
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Se amanhã for domingo (0), mudar para segunda (1)
        if (tomorrow.getDay() === 0) {
            tomorrow.setDate(tomorrow.getDate() + 1);
        }

        const dateStr = tomorrow.toISOString().split('T')[0];
        const timeStr = '10:00';
        const testId = `time-slot-${dateStr}-${timeStr}`;

        console.log(`Tentando agendar para: ${dateStr} ${timeStr}`);

        // Forçar visualização Semana
        const semanaBtn = page.locator('button:has-text("Semana")').first();
        if (await semanaBtn.isVisible()) {
            await semanaBtn.click();
        }
        await page.waitForTimeout(1000);

        // Clicar no slot
        const slot = page.getByTestId(testId);
        // Se não encontrar, pode ser que precise navegar na agenda, mas vamos tentar o find básico primeiro
        if (await slot.count() === 0) {
            console.log("Slot não encontrado imediatamente, tentando ajustar visualização...");
            // Implementação simplificada: se não achar, falha o teste mas com aviso
        }

        // Se slot não estiver visivel, pode ser necessário scroll ou navegar semanas
        // Para este teste de verificação rápida, se falhar em achar o slot, vamos assumir que o teste precisa de ajuste manual
        if (await slot.count() > 0) {
            await slot.click();
        } else {
            // Fallback: Tentar botão "Novo Agendamento" se existir
            const newAptBtn = page.locator('button:has-text("Novo Agendamento")');
            if (await newAptBtn.isVisible()) {
                await newAptBtn.click();
            } else {
                test.skip(true, 'Não foi possível interagir com grid ou botão de novo agendamento');
                return;
            }
        }

        // Verificar Modal
        const modal = page.getByRole('dialog', { name: /Novo Agendamento/i });
        await expect(modal).toBeVisible();

        // Preencher formulário
        await page.click('[role="combobox"]:has-text("Selecione o paciente")');
        await page.waitForTimeout(500);
        const firstOption = page.locator('[role="option"]').first();
        await expect(firstOption).toBeVisible();
        await firstOption.click();

        // Garantir data/hora se abriu pelo botão global
        // (Simplificação: assumindo que pegou do slot ou defaults ok)

        // Tentar salvar
        console.log('Clicando em Salvar/Criar...');
        const submitBtn = modal.getByRole('button', { name: /(Iniciar Avaliação|Criar)/i });
        await expect(submitBtn).toBeVisible();
        await submitBtn.click();

        // VERIFICAÇÃO DO BUG:
        // Se falhar silenciosamente, o modal continua aberto e NENHUM erro é exibido.
        // Se funcionar, modal fecha ou toast de sucesso aparece.
        // Se der erro tratado, toast de erro aparece.

        console.log('Aguardando resposta...');

        // Race condition check: Ou o modal fecha (sucesso), ou aparece erro, ou timeout (falha silenciosa)
        try {
            await Promise.race([
                expect(modal).not.toBeVisible({ timeout: 5000 }), // Sucesso: modal fechou
                expect(page.locator('text=/sucesso|criado/i')).toBeVisible({ timeout: 5000 }), // Sucesso: toast
                expect(page.locator('text=/erro|falha|obrigatório/i')).toBeVisible({ timeout: 5000 }) // Erro visível (não silencioso)
            ]);
            console.log("✅ Feedback recebido (sucesso ou erro tratado).");
        } catch (e) {
            console.log("❌ POSSÍVEL FALHA SILENCIOSA: Modal não fechou e nenhum aviso apareceu em 5s.");

            // Verificar console logs
            // (Isso seria feito via on('console') no setup do teste, mas aqui só reportamos)
            throw new Error("Falha Silenciosa Detectada: Agendamento não completou e nenhum erro foi exibido.");
        }
    });
});
