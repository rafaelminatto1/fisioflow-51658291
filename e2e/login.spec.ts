import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test('login flow with test credentials', async ({ page }) => {
    // Go to the login page - use standard auth route
    await page.goto('/auth');

    // Wait for the login form to be visible
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });

    // Fill in the email
    await page.fill('input[type="email"]', testUsers.fisio.email);

    // Fill in the password
    await page.fill('input[type="password"]', testUsers.fisio.password);

    // Click the login button
    await page.click('button:has-text("Entrar na Plataforma")');

    // Wait for navigation to dashboard - the app seems to redirect to / or /dashboard
    // We'll wait for URL to not contain /auth anymore
    await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 30000 });

    // Check if we are in a protected area (dashboard usually has specific headers or text)
    // Based on routes.tsx, '/' redirects to Schedule, and '/dashboard' is also valid
    await expect(page).toHaveURL(/.*dashboard|.*schedule|.*\//);

    // Check for some dashboard/logged-in indicator
    // Assuming there's a logout button or user profile indicator
    await expect(page.locator('body')).toContainText(/Dashboard|Agenda|Sair/i);
});
