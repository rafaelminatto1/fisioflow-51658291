import { test, expect } from '@playwright/test';

test.describe('Production Verification', () => {
  const BASE_URL = 'https://fisioflow-migration.web.app';
  const EMAIL = 'rafael.minatto@yahoo.com.br';
  const PASSWORD = 'Yukari30';

  test('should login and verify patients and agenda', async ({ page }) => {
    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL);

    // Login process
    // Based on common patterns in this project (checking e2e/auth.spec.ts might be better but let's assume standard login fields)
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    
    console.log('Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    console.log('Waiting for dashboard load...');
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify Schedule (Agenda)
    console.log('Verifying Schedule...');
    // Navigation to schedule if not default
    await page.goto(`${BASE_URL}/schedule`);
    await page.waitForSelector('.rbc-calendar, .schedule-container, [data-testid="calendar"]', { timeout: 30000 });
    
    // Check for appointment items
    const appointments = page.locator('.rbc-event, .appointment-item');
    const count = await appointments.count();
    console.log(`Found ${count} appointments in the schedule.`);
    // Even if 0, we check if the container is there and not an error state
    await expect(page.locator('body')).not.toContainText('Erro ao carregar');

    // Verify Patients
    console.log('Verifying Patients List...');
    await page.goto(`${BASE_URL}/patients`);
    await page.waitForSelector('.patient-card, table, [data-testid="patient-list"]', { timeout: 30000 });
    
    const patients = page.locator('.patient-card, tr.patient-row');
    const patientCount = await patients.count();
    console.log(`Found ${patientCount} patients in the list.`);
    
    expect(patientCount).toBeGreaterThan(0);
    
    console.log('Verification completed successfully.');
    
    // Take a screenshot for confirmation
    await page.screenshot({ path: 'production-verification-patients.png' });
    await page.goto(`${BASE_URL}/schedule`);
    await page.screenshot({ path: 'production-verification-schedule.png' });
  });
});
