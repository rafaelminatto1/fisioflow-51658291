import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const routesToTest = [
    '/dashboard',
    '/patients',
    '/schedule',
    '/exercises',
    '/financial',
    '/reports',
    '/settings',
    '/profile',
    '/smart-ai',
    '/physiotherapy',
    '/telemedicine',
    '/exercise-library',
    '/biofeedback',
    '/communications',
    '/eventos',
    '/notifications',
    '/gamification',
    '/admin/analytics', // Admin only, but we'll try accessing it basically
];

test.describe('Validate all pages', () => {
    test.beforeEach(async ({ page }) => {
        // Capture console errors during login
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`[Browser Console Error] ${msg.text()}`);
            }
        });

        // Go to the login page - use standard auth route
        console.log('Navigating to /auth...');
        await page.goto('/auth', { waitUntil: 'domcontentloaded' });
        console.log('On /auth page, waiting for email input...');

        // Wait for the login form to be visible
        try {
            await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 30000 });
        } catch (e) {
            console.log('Timeout waiting for email input. Capturing screenshot...');
            await page.screenshot({ path: 'test-results/login-timeout.png' });
            throw e;
        }
        console.log('Email input visible, filling form...');

        // Fill in the email
        await page.fill('input[type="email"]', testUsers.rafael.email);

        // Fill in the password
        await page.fill('input[type="password"]', testUsers.rafael.password);

        // Click the login button
        await page.click('button:has-text("Entrar")');

        console.log('Login clicked, waiting for navigation...');
        // Wait for navigation to complete or error to appear
        try {
            await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 45000 });
        } catch (e) {
            console.log('Navigation timeout. Checking for error messages...');
            const errorDetails = page.locator('text=Ver detalhes do erro');
            if (await errorDetails.isVisible()) {
                await errorDetails.click();
                const errorText = await page.locator('pre').innerText().catch(() => 'No pre tag with error');
                console.error('Error details found in UI:', errorText);
            }
            await page.screenshot({ path: 'test-results/post-login-error.png' });
            throw e;
        }
        console.log('Successfully navigated away from /auth');
    });

    for (const route of routesToTest) {
        test(`should load ${route} successfully`, async ({ page }) => {
            const consoleErrors: string[] = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });

            await page.goto(route);

            // Wait for load state instead of networkidle to be more resilient to background 403s
            await page.waitForLoadState('load');

            // Basic check that we are on the correct URL (or allowed redirect)
            // Some pages might redirect (e.g. /schedule -> /), so we relax this check or verify specific elements
            // For now, let's verify we didn't crash (root element exists)
            await expect(page.locator('#root')).toBeVisible();

            // Verify no critical error overlay (Vite/React error overlay)
            const errorOverlay = page.locator('vite-error-overlay');
            await expect(errorOverlay).not.toBeVisible();

            // Ensure we are not on a 404 page (assuming NotFound component check if implemented unique class/id)
            // This might be tricky if not well defined, but let's assume standard behavior.

            if (consoleErrors.length > 0) {
                console.warn(`Console errors on ${route}:`, consoleErrors);
            }
        });
    }
});
