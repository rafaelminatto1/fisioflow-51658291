
import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test('agenda drag and drop', async ({ page }) => {
    test.setTimeout(90000);
    console.log('Starting test...');

    // 1. Login
    console.log('Navigating to /auth');
    await page.goto('/auth');

    // Debug: Print page content or title if needed
    const title = await page.title();
    console.log('Page title:', title);

    console.log('Filling credentials...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', testUsers.rafael.email);
    await page.fill('input[type="password"]', testUsers.rafael.password);

    console.log('Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for redirect after login (Schedule is at / or /schedule)
    console.log('Waiting for redirect after login...');
    await page.waitForURL((u) => u.pathname === '/' || u.pathname.startsWith('/schedule') || u.pathname.startsWith('/dashboard'), { timeout: 25000 });

    // Ensure we are on schedule page; use week view and fixed date so cards are present
    await page.goto('/?view=week&date=2026-02-03');
    await page.waitForLoadState('domcontentloaded');

    // 2. Wait for appointments to load (card class: appointment-card or calendar-appointment-card)
    console.log('Waiting for appointment card...');
    await page.waitForSelector('.appointment-card, .calendar-appointment-card', { timeout: 25000 });
    console.log('Appointment card found.');

    // 3. Find an appointment card to drag
    const appointment = page.locator('.appointment-card, .calendar-appointment-card').first();
    const appointmentBox = await appointment.boundingBox();
    console.log('Appointment box:', appointmentBox);

    // 4. Find a target slot; week view uses [data-testid^="time-slot-"]
    console.log('Finding target slot...');
    const targetSlot = page.locator('[data-testid^="time-slot-"]').first();
    const targetBox = await targetSlot.boundingBox({ timeout: 15000 });
    console.log('Target box:', targetBox);

    if (!appointmentBox || !targetBox) {
        throw new Error('Positions not found');
    }

    // 5. Perform Drag and Drop
    console.log('Dragging...');
    await appointment.dragTo(targetSlot);

    // 6. Verify Modal Appears (no "Invalid time value" - fix: parseDate handles ISO date strings)
    console.log('Waiting for modal...');
    const modal = page.getByRole('heading', { name: 'Confirmar Reagendamento' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    console.log('Confirming...');
    // 7. Confirm (button text: "Confirmar Reagendamento" or "Confirmar")
    await page.getByRole('button', { name: /Confirmar Reagendamento|Confirmar/ }).click();

    // 8. Verify success toast (main fix: dialog no longer throws "Invalid time value" for ISO date strings)
    await expect(page.locator('text=/Reagendado.*sucesso|reagendado com sucesso/i')).toBeVisible({ timeout: 15000 });
    console.log('Success!');
});
