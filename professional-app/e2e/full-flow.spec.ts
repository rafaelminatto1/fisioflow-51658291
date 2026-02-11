import { test, expect } from '@playwright/test';

test.describe('Professional Lifecycle Flow', () => {
  test('Fluxo completo: Dashboard -> Paciente -> Agendamento -> Evolução -> Financeiro', async ({ page }) => {
    // 1. Dashboard e Notificações
    await page.goto('/');
    await page.click('notifications-outline');
    await expect(page).toHaveURL(/.*notifications/);
    await page.goBack();

    // 2. Criar Paciente
    await page.click('text=Novo Paciente');
    await page.fill('input[placeholder="Nome do paciente"]', 'Paciente de Teste Playwright');
    await page.click('text=Salvar Paciente');
    await expect(page.locator('text=Sucesso')).toBeVisible();

    // 3. Agendar Consulta
    await page.click('text=Nova Consulta');
    await page.click('text=Selecione o paciente');
    await page.click('text=Paciente de Teste Playwright');
    await page.fill('input[placeholder="DD/MM/AAAA"]', '20/02/2026');
    await page.fill('input[placeholder="HH:MM"]', '10:00');
    await page.click('text=Agendar');
    await expect(page.locator('text=Agendamento criado')).toBeVisible();

    // 4. Concluir e Gerar Financeiro
    await page.click('text=Agenda');
    await page.click('text=Paciente de Teste Playwright');
    await page.click('text=Status');
    await page.click('text=Concluído');
    await page.click('text=Salvar Alterações');
    
    // Validar Sugestão Financeira
    await page.click('text=Sim, Criar');
    await expect(page).toHaveURL(/.*tab=financial/);
    await expect(page.locator('text=Novo Registro')).toBeVisible();

    // 5. Registrar Evolução SOAP
    await page.click('text=Evoluções');
    await page.click('text=Nova Evolução SOAP');
    await page.fill('placeholder="O que o paciente relatou?"', 'Melhora significativa na dor.');
    await page.click('text=Salvar Evolução');
    await expect(page.locator('text=Evolução registrada')).toBeVisible();
  });
});
