import { test, expect } from '@playwright/test';

test('click calendar card', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    console.log('Navigating...');
    await page.goto('http://localhost:5173/?view=week&date=2026-03-03');

    console.log('Waiting for appointment card...');
    const cardLocator = page.locator('[data-appointment-popover-anchor]').first();
    await cardLocator.waitFor({ state: 'visible', timeout: 25000 });

    console.log('Found card. Waiting a bit for handlers to attach...');
    await page.waitForTimeout(1000);

    console.log('Clicking card...');
    await cardLocator.click({ force: true });

    console.log('Waiting 2 seconds...');
    await page.waitForTimeout(2000);

    const dialogCount = await page.locator('[role="dialog"]').count();
    console.log('Dialog count:', dialogCount);

    expect(dialogCount).toBeGreaterThan(0);

    if (dialogCount > 0) {
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        const dialogHtml = await dialog.innerHTML();
        console.log('Dialog HTML size:', dialogHtml.length);

        // Check for specific button text
        await expect(dialog.getByText('INICIAR ATENDIMENTO').or(dialog.getByText('INICIAR AVALIAÇÃO'))).toBeVisible();
    }
});
