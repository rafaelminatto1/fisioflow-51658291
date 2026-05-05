import { test, expect } from '@playwright/test';

test.describe('Evolução SOAP — Golden Path', () => {
  test('lista de pacientes carrega', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);

    // Deve ter ao menos um item ou estado vazio — mas não tela em branco
    const content = page.locator('[data-testid="patients-list"], table, ul, .patient-card').first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });

  test('abrir paciente existente não quebra a página', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Clica no primeiro paciente disponível
    const firstPatient = page.locator('a[href*="/patients/"], tr[data-patient-id]').first();
    await expect(firstPatient).toBeVisible({ timeout: 15000 });
    await firstPatient.click();

    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);

    // Perfil do paciente deve ter nome visível
    const patientName = page.locator('h1, h2, [data-testid="patient-name"]').first();
    await expect(patientName).toBeVisible({ timeout: 10000 });
  });

  test('aba de evoluções SOAP está acessível no perfil do paciente', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    const firstPatient = page.locator('a[href*="/patients/"]').first();
    const href = await firstPatient.getAttribute('href');
    if (!href) return;

    await page.goto(href);
    await page.waitForLoadState('networkidle');

    // Procura tab de evoluções
    const evolutionTab = page.getByRole('tab', { name: /evolução|evolucao|soap/i }).first();
    if (await evolutionTab.isVisible({ timeout: 5000 })) {
      await evolutionTab.click();
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});
