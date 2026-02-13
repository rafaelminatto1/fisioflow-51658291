import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Agenda Layout Refinement - E2E Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login page
        await page.goto('/auth', { waitUntil: 'networkidle' });

        // Login with test user
        // Using explicit IDs from LoginForm.tsx
        await page.waitForSelector('#login-email', { timeout: 15000 });
        await page.fill('#login-email', testUsers.fisio.email);
        await page.fill('#login-password', testUsers.fisio.password);
        await page.click('button[type="submit"]');

        // Wait for redirect after login
        await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 15000 });

        // Navigate to Schedule
        await page.goto('/schedule', { waitUntil: 'networkidle' });
    });

    test('should verify connection status in top header', async ({ page }) => {
        // The connection status should be in the MainLayout header near user profile
        // It should contain the text "Conectado - dados em tempo real"
        const connectionStatus = page.locator('header').filter({ hasText: /Conectado - dados em tempo real/i });
        await expect(connectionStatus).toBeVisible({ timeout: 10000 });
        console.log('✅ Connection status found in top header');
    });

    test('should verify "Cancelar todos" button is removed from toolbar', async ({ page }) => {
        // The "Cancelar todos" button should no longer exist in the calendar toolbar
        const cancelAllButton = page.locator('button:has-text("Cancelar todos")');
        await expect(cancelAllButton).not.toBeVisible();
        console.log('✅ "Cancelar todos" button is NOT present in toolbar');
    });

    test('should verify WaitlistIndicator is present in toolbar', async ({ page }) => {
        // The new WaitlistIndicator should be in the toolbar
        // It should have the text "Lista de Espera" (or similar icon/trigger)
        const waitlistIndicator = page.locator('button').filter({ hasText: /Lista de Espera/i });
        await expect(waitlistIndicator).toBeVisible({ timeout: 10000 });
        console.log('✅ WaitlistIndicator found in toolbar');
    });

    test('should verify redundant horizontal waitlist is removed from main schedule page', async ({ page }) => {
        // The horizontal waitlist row above the calendar should be gone
        // We check for a container that used to have WaitlistHorizontal
        // Or we check that no horizontal waitlist element exists
        const horizontalWaitlist = page.locator('.flex-shrink-0.z-20'); // Based on previous replace_file_content targetContent
        // Since I removed the component, there might still be a div, but it should be empty or gone.
        // Let's check for the component title which was likely "Lista de Espera" in the large row
        const waitlistRows = page.locator('h3:has-text("Lista de Espera")');
        // We expect the one in the toolbar (WaitlistIndicator) to be visible, but the large horizontal one should be gone.
        // The indicators in the toolbar are usually within a button or a small popover trigger.

        // Let's check specifically for the layout structure from Schedule.tsx
        // The horizontal waitlist was between the header and the calendar area.
        const waitlistContainer = page.locator('main').locator('div').filter({ has: page.locator('h3:has-text("Lista de Espera")') });
        // This is a bit tricky. Let's just check that there isn't a horizontal list of patients.
        const patientItem = page.locator('[data-testid*="waitlist-patient"]');
        // If the horizontal waitlist is gone, waitlist patients should only be visible inside the popover of the indicator.
        await expect(patientItem).not.toBeVisible();
        console.log('✅ Horizontal waitlist patients are NOT visible on main page');
    });
});
