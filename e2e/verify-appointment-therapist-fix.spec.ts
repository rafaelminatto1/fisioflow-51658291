/**
 * Verifica correção: fisioterapeuta opcional + conflito por capacidade (0/4 = livre).
 * - Sem fisioterapeuta: permitir agendar (não exibir toast de obrigatoriedade).
 * - Com fisioterapeuta e slot 0/4: não deve mostrar "Este horário já está ocupado para você."
 *
 * Usa testUsers.rafael (Firebase válido); fallback admin se .env.test tiver credenciais.
 */
import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const loginUser = testUsers.rafael ?? testUsers.admin;

test.describe('Correção agendamento: fisioterapeuta opcional e conflito por capacidade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByText(/Bem-vindo|Entre com suas credenciais|Login/).first().waitFor({ state: 'visible', timeout: 15000 });
    const textboxes = page.getByRole('textbox');
    await textboxes.first().fill(loginUser.email);
    await textboxes.nth(1).fill(loginUser.password);
    await page.getByRole('button', { name: /Entrar|submit/i }).click();
    await page.waitForURL(/\/($|eventos|dashboard|schedule)/, { timeout: 20000 });
    await page.goto('/schedule');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
  });

  test('sem fisioterapeuta deve permitir agendar (campo opcional)', async ({ page }) => {
    // Abrir modal Novo Agendamento clicando no slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const testId = `time-slot-${dateStr}-09:00`;
    await page.click('button:has-text("Semana")');
    await page.waitForTimeout(500);
    const slot = page.getByTestId(testId);
    await expect(slot).toBeVisible({ timeout: 10000 });
    await slot.click();

    await expect(page.getByRole('dialog').filter({ hasText: 'Agendamento' })).toBeVisible({ timeout: 8000 });

    const modal = page.getByRole('dialog').filter({ hasText: 'Agendamento' });
    await expect(modal).toBeVisible();

    // Selecionar paciente (deixar fisioterapeuta vazio)
    await modal.getByRole('combobox').filter({ hasText: /Selecione o paciente|Paciente/i }).first().click();
    await page.waitForTimeout(400);
    const firstPatient = page.locator('[role="option"]').first();
    await expect(firstPatient).toBeVisible({ timeout: 5000 });
    await firstPatient.click();

    // Garantir que Fisioterapeuta está vazio (não selecionar)
    const therapistCombobox = modal.getByRole('combobox').filter({ hasText: /Escolher fisioterapeuta|Fisioterapeuta/i });
    await expect(therapistCombobox).toBeVisible();

    // Clicar em "Agendar" — fisioterapeuta é opcional, não deve aparecer toast de obrigatoriedade
    await modal.getByRole('button', { name: 'Agendar' }).click();

    // Não deve aparecer toast "Escolha um fisioterapeuta no formulário."
    await page.waitForTimeout(2000);
    const toastObrigatorio = page.getByText('Escolha um fisioterapeuta', { exact: false });
    await expect(toastObrigatorio).not.toBeVisible();
  });

  test('com fisioterapeuta em slot livre não deve mostrar "horário ocupado"', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const testId = `time-slot-${dateStr}-09:00`;
    await page.click('button:has-text("Semana")');
    await page.waitForTimeout(500);

    const slot = page.getByTestId(testId);
    await expect(slot).toBeVisible({ timeout: 10000 });
    await slot.click();

    await expect(page.getByRole('dialog').filter({ hasText: 'Novo Agendamento' })).toBeVisible({ timeout: 8000 });
    const modal = page.getByRole('dialog').filter({ hasText: 'Agendamento' });

    // Paciente
    await modal.getByRole('combobox').filter({ hasText: /Selecione o paciente|Paciente/i }).first().click();
    await page.waitForTimeout(400);
    await page.locator('[role="option"]').first().click();

    // Fisioterapeuta: selecionar o primeiro da lista
    await modal.getByRole('combobox').filter({ hasText: /Escolher fisioterapeuta|Fisioterapeuta/i }).click();
    await page.waitForTimeout(400);
    const firstTherapist = page.locator('[role="option"]').first();
    if (await firstTherapist.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstTherapist.click();
    }

    // Agendar
    await modal.getByRole('button', { name: 'Agendar' }).click();

    // Não deve aparecer "Este horário já está ocupado para você" (correção do bug)
    await page.waitForTimeout(4000);
    const ocupadoToast = page.getByText('Este horário já está ocupado para você', { exact: false });
    await expect(ocupadoToast).not.toBeVisible();
  });
});
