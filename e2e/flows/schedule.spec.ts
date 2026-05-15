import { test, expect } from "@playwright/test";

test.describe("Agenda — Golden Path", () => {
  test("agenda carrega com slots visíveis", async ({ page }) => {
    await page.goto("/agenda");
    await page.waitForLoadState("networkidle");

    // Não deve ter redirecionado para login
    await expect(page).not.toHaveURL(/\/login/);

    // FullCalendar ou grid da agenda deve estar presente
    const calendar = page
      .locator('.fc, [data-testid="schedule-calendar"], [class*="calendar"]')
      .first();
    await expect(calendar).toBeVisible({ timeout: 15000 });
  });

  test("botão de novo agendamento abre modal", async ({ page }) => {
    await page.goto("/agenda");
    await page.waitForLoadState("networkidle");

    const newBtn = page.getByRole("button", { name: /novo agendamento|agendar|\+/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();

    // Modal ou drawer deve aparecer
    const modal = page.locator('[role="dialog"], [data-testid="appointment-modal"]').first();
    await expect(modal).toBeVisible({ timeout: 8000 });
  });

  test("navegar entre semanas não quebra a agenda", async ({ page }) => {
    await page.goto("/agenda?view=week");
    await page.waitForLoadState("networkidle");

    const nextBtn = page.getByRole("button", { name: /próxima|next|>/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
    }

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('.fc, [data-testid="schedule-calendar"]').first()).toBeVisible();
  });
});
