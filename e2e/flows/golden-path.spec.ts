import { test, expect } from '@playwright/test';

// Utilizando as variáveis injetadas via GitHub Actions / .env
const TEST_EMAIL = process.env.STAGING_TEST_USER_EMAIL || 'test@moocafisio.com.br';
const TEST_PASS = process.env.STAGING_TEST_USER_PASSWORD || '123456';

test.describe('FisioFlow Golden Path - Clínico & Operacional', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Login flow
    await page.goto('/login');
    
    // Supondo que exista um input de email e password e botão de login (Ajustar seletores conforme a UI real)
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/senha/i).fill(TEST_PASS);
    await page.getByRole('button', { name: /entrar/i }).click();

    // Aguarda carregar o dashboard
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Deve conseguir agendar uma nova consulta', async ({ page }) => {
    // Navega para agenda
    await page.getByRole('button', { name: /Agenda/i }).click();
    await expect(page).toHaveURL(/.*agenda/);

    // Clica em novo agendamento
    await page.getByRole('button', { name: /Novo/i }).click();

    // Preenche dados básicos do agendamento (Ajustar seletores)
    await page.getByLabel(/Paciente/i).fill('Paciente E2E Test');
    await page.getByLabel(/Serviço/i).click();
    await page.getByText(/Fisioterapia/i).click();
    
    await page.getByRole('button', { name: /Salvar/i }).click();

    // Verifica toast de sucesso ou modal fechado
    await expect(page.getByText(/Agendamento criado com sucesso/i)).toBeVisible();
  });

  test('Deve conseguir preencher evolução SOAP com Scribe', async ({ page }) => {
    // Navega para a lista de pacientes e entra no primeiro
    await page.getByRole('button', { name: /Pacientes/i }).click();
    await expect(page).toHaveURL(/.*patients/);

    // Clica no primeiro paciente da lista
    await page.locator('table tr').nth(1).click();
    
    // Abre aba de Evolução
    await page.getByRole('tab', { name: /Evolução/i }).click();
    await page.getByRole('button', { name: /Nova Evolução/i }).click();

    // Verifica se o painel do Scribe AI (Voz) está renderizado
    await expect(page.getByText(/Scribe/i)).toBeVisible();

    // Preenche campos manualmente para garantir o caminho feliz (Fallback)
    await page.getByLabel(/Subjetivo/i).fill('Paciente relata melhora na dor (E2E)');
    await page.getByLabel(/Objetivo/i).fill('ADM preservada');
    await page.getByLabel(/Avaliação/i).fill('Boa resposta ao tratamento conservador');
    await page.getByLabel(/Plano/i).fill('Manter conduta. Alta prevista para 2 sessões.');

    await page.getByRole('button', { name: /Salvar/i }).click();

    // Verifica se evolução foi salva
    await expect(page.getByText(/Evolução salva com sucesso/i)).toBeVisible();
  });

});
