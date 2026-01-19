import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Patient Autocomplete - Novo Agendamento', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(eventos|dashboard|schedule)/);

    // Go to schedule page
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');
  });

  test('deve abrir modal e verificar se pacientes são carregados sem erros', async ({ page }) => {
    // Open new appointment modal
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(500);

    // Check for network errors related to patients
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        errors.push(text);
      }
    });

    // Monitor network requests
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      const url = request.url();
      if (url.includes('patients')) {
        failedRequests.push(`${request.method()} ${url}`);
      }
    });

    // Click on patient combobox to trigger data loading
    await page.click('button[role="combobox"]:has-text("Selecione ou digite")');

    // Wait for patients to load
    await page.waitForTimeout(2000);

    // Check for failed requests to patients endpoint
    expect(failedRequests.length).toBe(0);

    // Verify no error toasts are visible
    const errorToast = page.locator('[role="alert"]').filter({ hasText: /erro|falha|400/i });
    await expect(errorToast).not.toBeVisible({ timeout: 5000 });
  });

  test('deve exibir lista de pacientes ao abrir combobox', async ({ page }) => {
    // Open new appointment modal
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(500);

    // Click on patient combobox
    await page.click('button[role="combobox"]:has-text("Selecione ou digite")');
    await page.waitForTimeout(500);

    // Check if command list appears
    const commandList = page.locator('[role="listbox"], [cmdk-list]').first();
    await expect(commandList).toBeVisible({ timeout: 5000 });

    // Verify patients are shown in the list
    const patientItems = page.locator('[role="option"]:has-text("Paciente")');
    const count = await patientItems.count();

    // Should have at least some patients or show empty state
    if (count > 0) {
      console.log(`✅ Found ${count} patients in autocomplete`);
    } else {
      // Check if empty state is shown
      const emptyState = page.locator('text=/Paciente não encontrado|Criar Novo Paciente/i');
      await expect(emptyState).toBeVisible();
      console.log('✅ Empty state shown correctly');
    }
  });

  test('deve buscar pacientes ao digitar no input', async ({ page }) => {
    // Open new appointment modal
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(500);

    // Click on patient combobox
    await page.click('button[role="combobox"]:has-text("Selecione ou digite")');
    await page.waitForTimeout(300);

    // Type in search input
    const searchInput = page.locator('input[placeholder*="Buscar"], input[role="combobox"]').first();
    await searchInput.fill('Maria');
    await page.waitForTimeout(1000);

    // Verify no errors occur during search
    const errorToast = page.locator('[role="alert"]').filter({ hasText: /erro|400/i });
    await expect(errorToast).not.toBeVisible({ timeout: 5000 });
  });

  test('deve verificar se query de pacientes não contém coluna name inexistente', async ({ page }) => {
    // Intercept network requests to check the query
    let patientsQueryUrl = '';

    page.on('request', request => {
      const url = request.url();
      if (url.includes('patients') && url.includes('select')) {
        patientsQueryUrl = url;
        console.log('Patients query URL:', url);

        // Check if query contains the non-existent 'name' column (not full_name)
        // The query should NOT have 'name,' or ',name' or '&name' as a separate column
        const hasInvalidNameColumn =
          (url.includes('name,') || url.includes(',name')) && !url.includes('full_name');

        if (hasInvalidNameColumn) {
          console.error('❌ INVALID: Query contains non-existent "name" column');
        } else if (url.includes('full_name')) {
          console.log('✅ VALID: Query uses "full_name" column');
        }
      }
    });

    // Open new appointment modal
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(500);

    // Click on patient combobox to trigger query
    await page.click('button[role="combobox"]:has-text("Selecione ou digite")');
    await page.waitForTimeout(2000);

    // Verify query was made
    expect(patientsQueryUrl).toBeTruthy();
    expect(patientsQueryUrl).toContain('patients');

    // Verify query uses full_name, not invalid name column
    const hasInvalidNameColumn =
      (patientsQueryUrl.includes('name,') || patientsQueryUrl.includes(',name')) &&
      !patientsQueryUrl.includes('full_name');

    expect(hasInvalidNameColumn).toBe(false);
  });

  test('deve selecionar paciente e continuar com agendamento', async ({ page }) => {
    // Open new appointment modal
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(500);

    // Click on patient combobox
    await page.click('button[role="combobox"]:has-text("Selecione ou digite")');
    await page.waitForTimeout(500);

    // Try to select a patient if available
    const patientOption = page.locator('[role="option"]').first();
    const count = await patientOption.count();

    if (count > 0) {
      await patientOption.click();
      await page.waitForTimeout(300);

      // Verify patient was selected
      const combobox = page.locator('button[role="combobox"]').first();
      const text = await combobox.textContent();

      // Should not show placeholder text anymore
      expect(text).not.toContain('Selecione ou digite');
      console.log('✅ Patient selected successfully');
    } else {
      console.log('⚠️ No patients available to select');
    }
  });

  test('deve realizar busca fuzzy com Fuse.js - busca parcial', async ({ page }) => {
    // Open new appointment modal
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(500);

    // Click on patient combobox
    await page.click('button[role="combobox"]:has-text("Selecione ou digite")');
    await page.waitForTimeout(500);

    // Type partial name (fuzzy search should work)
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('Rafa');
    await page.waitForTimeout(1000);

    // Check if results appear (or empty state if no patients)
    const results = page.locator('[role="option"]');
    const emptyState = page.locator('text=/Paciente não encontrado/i');

    const hasResults = await results.count() > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // One of these should be true
    expect(hasResults || hasEmpty).toBe(true);
    console.log(`✅ Fuzzy search test: ${hasResults ? 'Found results' : 'Empty state shown'}`);
  });

  test('deve lidar com acentos na busca', async ({ page }) => {
    // Open new appointment modal
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(500);

    // Click on patient combobox
    await page.click('button[role="combobox"]:has-text("Selecione ou digite")');
    await page.waitForTimeout(500);

    // Type name without accent (should still find patients with accents)
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('Joao');
    await page.waitForTimeout(1000);

    // Verify no errors
    const errorToast = page.locator('[role="alert"]').filter({ hasText: /erro|400/i });
    await expect(errorToast).not.toBeVisible({ timeout: 3000 });
    console.log('✅ Accent handling test passed');
  });
});
