import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

/**
 * FisioFlow Comprehensive Validation Test
 * Covers: Patient CRUD, Appointment CRUD, SOAP Evolution.
 */

test.describe('FisioFlow Comprehensive Validation', () => {
  
  const waitForLoadingFinished = async (page) => {
    console.log('Waiting for loading to finish...');
    // Wait for any global loading overlays or skeletons to disappear
    await page.waitForSelector('[data-testid="loading-skeleton"]', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForSelector('text=Carregando', { state: 'detached', timeout: 30000 }).catch(() => {});
    // Small buffer for transitions
    await page.waitForTimeout(2000);
  };

  test.beforeEach(async ({ page }) => {
    // Increase default timeout for slow local servers
    test.setTimeout(150000);
    
    console.log('Logging in...');
    await page.goto('/auth');
    await page.fill('input[name="email"]', testUsers.rafael.email);
    await page.fill('input[name="password"]', testUsers.rafael.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard or home
    await page.waitForURL((url) => /\/(dashboard|eventos|schedule|smart-dashboard)?$/.test(url.pathname), { timeout: 40000 });
    await waitForLoadingFinished(page);
    console.log('Login successful.');
  });

  test('Flow: Patient CRUD', async ({ page }) => {
    const patientName = `Test Patient ${Date.now()}`;
    const updatedName = `${patientName} Updated`;

    console.log('Navigating to Patients...');
    await page.goto('/patients');
    await waitForLoadingFinished(page);
    
    // Check if we are on the right page
    await expect(page).toHaveURL(/\/patients/);
    console.log('Current URL:', page.url());

    // CREATE
    console.log('Creating patient...');
    const createBtn = page.locator('button:has-text("Novo Paciente")');
    await createBtn.click({ force: true });
    
    console.log('Waiting for modal...');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 15000 });
    
    // Check if organization is loading
    const loader = modal.locator('text=Carregando organização');
    if (await loader.isVisible()) {
      console.log('Waiting for organization loader to disappear...');
      await expect(loader).toBeHidden({ timeout: 30000 });
    }

    console.log('Filling form...');
    await modal.locator('input[placeholder*="Nome completo"]').first().fill(patientName);
    
    // Switch to medical tab for main condition
    await modal.locator('button:has-text("Médico")').click();
    await modal.locator('input[placeholder*="Lombalgia"]').fill('Test Condition');
    
    // Back to basic for birth date
    await modal.locator('button:has-text("Básico")').click();
    await modal.locator('input[type="date"]').fill('1990-01-01');
    
    console.log('Clicking save...');
    await modal.locator('button:has-text("Cadastrar"), button:has-text("Salvar")').click();
    
    await page.waitForSelector('text=sucesso', { timeout: 20000 });
    console.log('Patient created.');

    // EDIT
    console.log('Editing patient...');
    await page.fill('input[placeholder*="Buscar"]', patientName);
    await page.waitForTimeout(3000); // Wait for filter
    
    const patientRow = page.locator(`text=${patientName}`).first();
    await expect(patientRow).toBeVisible();
    await patientRow.click({ force: true });
    
    await page.click('button:has-text("Editar")', { force: true });
    await modal.locator('input[placeholder*="Nome completo"]').first().fill(updatedName);
    await modal.locator('button:has-text("Salvar")').click();
    
    await page.waitForSelector('text=sucesso', { timeout: 20000 });
    console.log('Patient updated.');

    // CLEANUP / DELETE
    console.log('Deleting patient...');
    await page.click(`text=${updatedName}`, { force: true });
    await page.click('button:has-text("Excluir")', { force: true });
    await page.click('button:has-text("Confirmar")', { force: true });
    
    await page.waitForSelector('text=excluído', { timeout: 20000 });
    console.log('Patient deleted.');
  });

  test('Flow: Appointment CRUD and Evolution', async ({ page }) => {
    // Maria Silva Santos is a reliable test user
    const patientName = "Maria Silva Santos"; 
    
    console.log('Navigating to Schedule...');
    await page.goto('/');
    await waitForLoadingFinished(page);
    
    // Some pages might redirect to /smart-dashboard or others
    if (page.url().includes('dashboard')) {
       await page.goto('/'); // Try again to get to agenda
       await waitForLoadingFinished(page);
    }

    // CREATE APPOINTMENT
    console.log('Creating appointment...');
    await page.click('button:has-text("Novo Agendamento")', { force: true });
    await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
    
    // Select patient in the modal
    const dialog = page.locator('[role="dialog"]');
    const patientSearch = dialog.locator('input[placeholder*="paciente"]');
    await patientSearch.click();
    await patientSearch.fill(patientName);
    await page.waitForSelector(`text=${patientName}`, { timeout: 10000 });
    await page.click(`text=${patientName}`, { force: true });

    await page.fill('input[type="time"]', '14:00');
    await page.click('button:has-text("Confirmar")');
    
    await page.waitForSelector('text=sucesso', { timeout: 20000 });
    console.log('Appointment created.');

    // EDIT APPOINTMENT
    console.log('Editing appointment...');
    await page.click(`text=${patientName}`, { force: true });
    await page.click('button:has-text("Editar")', { force: true });
    await page.fill('input[type="time"]', '15:00');
    await page.click('button:has-text("Salvar")');
    
    await page.waitForSelector('text=sucesso', { timeout: 20000 });
    await expect(page.locator('text=15:00')).toBeVisible();
    console.log('Appointment edited.');

    // FILL EVOLUTION (SOAP)
    console.log('Filling evolution...');
    await page.click(`text=${patientName}`, { force: true });
    await page.click('button:has-text("Evoluir")', { force: true });
    await waitForLoadingFinished(page);
    
    const subjectiveV2 = page.locator('textarea[placeholder*="paciente relatou"]');
    const subjectiveV1 = page.locator('textarea').first();
    
    if (await subjectiveV2.count() > 0) {
      console.log('Using Evolution V2 interface');
      await subjectiveV2.fill('Paciente relata melhora significativa.');
      await page.locator('textarea[placeholder*="evolução da sessão"]').fill('Realizado mobilização articular e exercícios de CORE.');
      await page.locator('button:has-text("Salvar Evolução")').click();
    } else {
      console.log('Using fallback evolution interface');
      await subjectiveV1.fill('Relato de teste genérico');
      await page.click('button:has-text("Salvar")');
    }
    
    await page.waitForSelector('text=salva', { timeout: 20000 });
    console.log('Evolution saved.');

    // DELETE APPOINTMENT
    console.log('Deleting appointment...');
    await page.goto('/');
    await waitForLoadingFinished(page);
    await page.click(`text=${patientName}`, { force: true });
    await page.click('button:has-text("Excluir")', { force: true });
    await page.click('button:has-text("Confirmar")', { force: true });
    
    await page.waitForSelector('text=removido', { timeout: 20000 });
    console.log('Appointment deleted.');
  });
});
