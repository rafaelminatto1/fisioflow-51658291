
import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test('agenda drag and drop', async ({ page }) => {
    console.log('Starting test...');

    // 1. Login
    console.log('Navigating to /auth');
    await page.goto('/auth');

    // Debug: Print page content or title if needed
    const title = await page.title();
    console.log('Page title:', title);

    console.log('Filling credentials...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);

    console.log('Submitting login...');
    await page.click('button[type="submit"]');

    console.log('Waiting for redirect to schedule...');
    await page.waitForURL('/schedule', { timeout: 20000 }).catch(async (e) => {
        console.log('Login timeout. Current URL:', page.url());
        // Try forcing navigation if we are stuck but logged in?
        // Or maybe we landed on dashboard?
        throw e;
    });

    // Force navigation just in case we are on dashboard
    if (!page.url().includes('/schedule')) {
        console.log('Redirecting to /schedule manually');
        await page.goto('/schedule');
    }

    // 2. Wait for appointments to load
    console.log('Waiting for appointment card...');
    await page.waitForSelector('.appointment-card', { timeout: 15000 });
    console.log('Appointment card found.');

    // 3. Find an appointment card to drag
    const appointment = page.locator('.appointment-card').first();
    const appointmentBox = await appointment.boundingBox();
    console.log('Appointment box:', appointmentBox);

    // 4. Find a target slot (different from current)
    // We'll target the last available slot to maximize distance
    console.log('Finding target slot...');
    const targetSlot = page.locator('.calendar-time-slot').last();
    const targetBox = await targetSlot.boundingBox();
    console.log('Target box:', targetBox);

    if (!appointmentBox || !targetBox) {
        throw new Error('Positions not found');
    }

    // 5. Perform Drag and Drop
    console.log('Dragging...');
    // Use mouse manually for better control if dragTo fails, but try dragTo first
    await appointment.dragTo(targetSlot);

    // 6. Verify Modal Appears
    console.log('Waiting for modal...');
    const modal = page.locator('text=Confirmar Reagendamento');
    await expect(modal).toBeVisible({ timeout: 5000 });

    console.log('Confirming...');
    // 7. Confirm
    await modal.locator('button:has-text("Confirmar")').click();

    // 8. Verify Success Toast
    console.log('Waiting for success toast...');
    await expect(page.locator('text=/Reagendado.*sucesso/i')).toBeVisible({ timeout: 10000 });
    console.log('Success!');
});
