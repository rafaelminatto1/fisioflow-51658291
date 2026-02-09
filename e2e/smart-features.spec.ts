import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Smart Features - Agenda', () => {
  // Setup: Login and navigate to schedule
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth');

    // Login
    await page.fill('input[name="email"]', testUsers.fisio.email);
    await page.fill('input[name="password"]', testUsers.fisio.password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/');
    
    // Navigate to Schedule
    await page.goto('/schedule');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should toggle selection mode and show bulk actions bar', async ({ page }) => {
    // 1. Toggle Selection Mode
    const selectionButton = page.locator('button[title="Modo de Seleção"]');
    await expect(selectionButton).toBeVisible();
    await selectionButton.click();
    
    // Check if button state changed (variant default usually has primary background color or class)
    // We can check class or attribute
    await expect(selectionButton).toHaveClass(/bg-primary/); // Assuming default variant has primary bg

    // 2. Select an appointment
    // Find an appointment card. We assume there is at least one.
    // If empty, this test might fail, but for E2E in dev env usually we have data.
    // Alternatively, we create one first.
    
    // Let's create a quick appointment to ensure we have something to select
    await page.click('button:has-text("Novo Agendamento")');
    await page.click('[role="combobox"]');
    await page.keyboard.type('Test Bulk');
    await page.keyboard.press('Enter');
    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(1000); // Wait for creation

    // Re-enable selection mode if it reset (it shouldn't, but good to be safe or check state)
    // Actually, creating appointment closes modal, but selection mode might persist? 
    // Let's assume we need to re-enable or check.
    if (!await selectionButton.evaluate(el => el.classList.contains('bg-primary'))) {
        await selectionButton.click();
    }

    // Click on the appointment card
    const appointmentCard = page.locator('.calendar-appointment-card').first();
    await expect(appointmentCard).toBeVisible();
    await appointmentCard.click();

    // 3. Verify Bulk Actions Bar appears
    const bulkBar = page.locator('text=selecionados');
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText('1');

    // 4. Clear selection
    const clearButton = page.locator('button:has-text("X")').or(page.locator('button > svg.lucide-x').locator('..')); 
    // Specific selector for the clear button in BulkActionsBar might be tricky without test-id
    // Let's use the icon or position
    await page.click('button:has-text("X"), button:has(.lucide-x)'); 
    
    await expect(bulkBar).not.toBeVisible();
  });

  test('should use auto-schedule suggestion', async ({ page }) => {
    // 1. Open New Appointment Modal
    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.locator('text=Novo Agendamento')).toBeVisible();

    // 2. Select a Date (Important for auto-schedule to work)
    await page.click('button:has-text("Selecione uma data")');
    // Pick tomorrow to avoid "past time" issues if any
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.click(`button[name="day"]:has-text("${tomorrow.getDate()}")`);
    await page.keyboard.press('Escape'); // Close calendar popover if it stays open

    // 3. Click Magic Wand (Auto Schedule)
    const magicWand = page.locator('button[title="Sugerir melhor horário"]');
    await expect(magicWand).toBeVisible();
    await magicWand.click();

    // 4. Verify Toast and Input Change
    await expect(page.locator('text=Horário sugerido')).toBeVisible();
    
    // Verify the select has a value (not empty)
    // The select trigger usually displays the selected value
    const timeSelectValue = page.locator('button[role="combobox"]').filter({ hasText: /:/ }); 
    // Or check the specific time select trigger
    // It's the second SelectTrigger in DateTimeSection typically.
    // Let's look for text matching a time pattern (HH:mm)
    await expect(page.locator('button[role="combobox"]:has-text(":")')).toBeVisible();
  });
});
