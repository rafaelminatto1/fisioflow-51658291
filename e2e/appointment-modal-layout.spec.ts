import { test, expect, type Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

async function dismissTransientOverlays(page: Page) {
  // Tenta fechar overlays transitórios (ex.: tour guiado) que bloqueiam cliques na agenda.
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  const tourCard = page.locator('div').filter({ hasText: /FISIOTOUR|Seu QG/i }).first();
  const isTourVisible = await tourCard.isVisible({ timeout: 1200 }).catch(() => false);
  if (isTourVisible) {
    const closeButton = tourCard.locator('button').first();
    await closeButton.click({ force: true }).catch(() => undefined);
  }

  const backdrop = page.locator('div.absolute.inset-0.bg-black\\/20.pointer-events-auto').first();
  const hasBackdrop = await backdrop.isVisible({ timeout: 1200 }).catch(() => false);
  if (hasBackdrop) {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}

test.describe('Modal de Agendamento - layout Info/Pagamento/Observações', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"], input[name="email"]', testUsers.fisio.email);
    await page.fill('input[name="password"], input[name="password"]', testUsers.fisio.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 20000 });

    await page.goto('/schedule');
    await page.waitForLoadState('domcontentloaded');
    await dismissTransientOverlays(page);
  });

  test('deve remover aba Pagamento, mostrar campos de pagamento em Informações e manter Observações recolhível', async ({ page }) => {
    const newAppointmentButton = page
      .locator('button:has-text("Novo Agendamento"), button:has-text("Novo")')
      .first();

    await expect(newAppointmentButton).toBeVisible({ timeout: 15000 });
    await newAppointmentButton.click();

    const dialog = page.locator('[role="dialog"]').filter({
      has: page.getByRole('heading', { name: /Novo Agendamento|Editar Agendamento|Detalhes do Agendamento/i }),
    });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(dialog.getByRole('tab', { name: /Informações|Info/i })).toBeVisible();
    await expect(dialog.getByRole('tab', { name: /Opções|Opç\./i })).toBeVisible();
    await expect(dialog.getByRole('tab', { name: /Pagamento|Pag\./i })).toHaveCount(0);

    await expect(dialog.getByText('Tipo de Pagamento')).toBeVisible();

    const notesTextarea = dialog.getByPlaceholder('Informações importantes sobre o atendimento...');
    await expect(notesTextarea).not.toBeVisible();

    const notesTrigger = dialog
      .locator('button')
      .filter({ hasText: /Observações/i })
      .first();
    await expect(notesTrigger).toBeVisible();
    await notesTrigger.click();

    await expect(notesTextarea).toBeVisible();
  });
});
