import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Diagnose Agenda Errors', () => {
    test('should capture console errors on agenda page', async ({ page }) => {
        const consoleErrors: { type: string, text: string, location: any }[] = [];

        page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                consoleErrors.push({
                    type: msg.type(),
                    text: msg.text(),
                    location: msg.location()
                });
                console.log(`[Browser ${msg.type().toUpperCase()}] ${msg.text()}`);
            }
        });

        page.on('pageerror', error => {
            consoleErrors.push({
                type: 'pageerror',
                text: error.message,
                location: error.stack
            });
            console.error(`[Page Error] ${error.message}`);
        });

        // 1. Login
        console.log('Navigating to /auth...');
        await page.goto('/auth', { waitUntil: 'domcontentloaded' });

        await page.fill('input[name="email"]', testUsers.rafael.email);
        await page.fill('input[name="password"]', testUsers.rafael.password);
        await page.click('button:has-text("Entrar")');

        await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 45000 });
        console.log('Login successful');

        // 2. Navigate to Agenda
        console.log('Navigating to /schedule...');
        await page.goto('/schedule', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for some time to let all errors surface
        await page.waitForTimeout(10000);

        // 3. Take screenshot for visual inspection
        await page.screenshot({ path: 'test-results/agenda-diagnosis.png', fullPage: true });

        // 4. Report errors
        if (consoleErrors.length > 0) {
            console.log('\n--- CAPTURED ERRORS ---');
            consoleErrors.forEach((err, i) => {
                console.log(`${i + 1}. [${err.type}] ${err.text}`);
            });
            console.log('-----------------------\n');
        } else {
            console.log('No console errors detected on /schedule');
        }

        // We don't fail the test here, just report.
        // But for the sake of the task, we want to know if there are errors.
    });
});
