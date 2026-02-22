
// Credentials provided by user for verification

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Verified Login Flow', () => {
    test('should login successfully with test credentials', async ({ page }) => {
        console.log(`Attempting login with: ${testUsers.fisio.email}`);

        // Navigate to login page
        await page.goto('/auth/login');

        // Check if we are on the login page
        await expect(page).toHaveURL(/.*auth\/login/);
        // Wait for email input to be visible which confirms page load
        await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });

        // Fill in credentials
        await page.fill('input[name="email"]', testUsers.fisio.email);
        await page.fill('input[name="password"]', testUsers.fisio.password);

        // Submit
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        // Verify successful login
        // Expectation: Redirect to dashboard or home, or see "Dashboard" in title/text
        // Waiting for URL change or specific element

        // Wait for navigation - adjusting timeout for potential slow network/auth
        await page.waitForTimeout(2000);

        // Assuming dashboard is at '/' or '/dashboard', or checking for a common element like "Painel" or user profile
        // Checking for a generic "Dashboard" link or Header usually present after login
        // Adjust selector based on actual app structure if this fails

        // Attempt to verify successful state by URL or common UI element
        await Promise.any([
            page.waitForURL('**/dashboard/**'),
            page.waitForURL('**/app/**'),
            page.waitForURL('**/'), // Root if redirected there
            page.waitForSelector('text=Painel'),
            page.waitForSelector('text=Agendamentos'),
            page.waitForSelector('text=Bem-vindo')
        ]);

        console.log('Login successful - navigation occured or dashboard element found');
    });
});
