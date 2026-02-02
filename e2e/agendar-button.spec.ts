/**
 * E2E: Botão "Agendar" no modal Novo Agendamento (status Avaliação).
 * Garante que ao clicar em "Agendar" o agendamento é salvo e o modal fecha,
 * sem navegar para a tela de avaliação.
 */
import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const loginEmail = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const loginPassword = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;

test.describe('Botão Agendar no modal Novo Agendamento', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: /email/i }).fill(loginEmail);
    await page.getByRole('textbox', { name: /senha/i }).fill(loginPassword);
    await page.getByRole('button', { name: /entrar na plataforma/i }).click();
    await page.waitForURL(/\/($|eventos|dashboard|schedule)/, { timeout: 25000 });
    await page.goto('/schedule');
    await page.waitForLoadState('domcontentloaded');
  });

  test('deve salvar agendamento ao clicar em Agendar (status Avaliação)', async ({ page }) => {
    await page.getByRole('button', { name: 'Novo Agendamento' }).click();
    const modal = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /Novo Agendamento/i }) });
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Paciente: abrir combobox (texto "Selecione o paciente...") e escolher primeira opção
    await modal.getByRole('combobox').filter({ hasText: /selecione o paciente/i }).click();
    await page.waitForTimeout(600);
    const firstPatient = page.locator('[role="option"]').first();
    await expect(firstPatient).toBeVisible({ timeout: 5000 });
    await firstPatient.click();

    // Com DateTimeSection: comboboxes = Paciente(0), Horário(1), Duração(2), Tipo(3), Status(4)
    const statusCombobox = modal.getByRole('combobox').nth(4);
    await statusCombobox.click();
    await page.waitForTimeout(400);
    await page.getByRole('option', { name: /Avaliação/i }).click();

    // Clicar no botão "Agendar" (não em "Iniciar Avaliação" nem "Criar")
    const agendarBtn = modal.getByRole('button', { name: 'Agendar' });
    await expect(agendarBtn).toBeVisible({ timeout: 5000 });
    await agendarBtn.click();

    // Modal deve fechar (sucesso); se não fechar, verificar toast de erro
    await expect(modal).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Ocorreu um Erro')).not.toBeVisible({ timeout: 3000 });
  });
});
