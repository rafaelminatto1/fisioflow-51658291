import { test, expect } from '@playwright/test';

test.describe('Fluxo: Agendamento para Financeiro', () => {
  test('Deve sugerir criação de registro financeiro ao concluir consulta', async ({ page }) => {
    // 1. Login (simulado)
    await page.goto('/(auth)/login');
    await page.fill('input[placeholder="seu@email.com"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[placeholder="Digite sua senha"]', 'password123');
    await page.click('button:has-text("Entrar")');

    // 2. Navegar para Agenda
    await page.click('text=Agenda');

    // 3. Abrir um agendamento existente
    await page.click('.appointment-item >> first');

    // 4. Alterar status para Concluído
    await page.click('text=Status');
    await page.click('text=Concluído');

    // 5. Salvar e validar alerta
    await page.click('text=Salvar Alterações');

    // Validar diálogo de sugestão financeira
    const dialog = page.locator('text=Deseja criar um registro financeiro');
    await expect(dialog).toBeVisible();

    // 6. Aceitar sugestão
    await page.click('text=Sim, Criar');

    // 7. Validar que navegou para aba financeira do paciente com modal aberto
    await expect(page).toHaveURL(/.*tab=financial&autoCreate=true.*/);
    const financialModal = page.locator('text=Novo Registro');
    await expect(financialModal).toBeVisible();
  });
});
