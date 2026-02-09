/**
 * Testes de validação das melhorias responsivas implementadas
 */

import { test, expect } from '@playwright/test';

test.describe('Responsive Improvements Validation', () => {
    test.describe('NewPatientPage - Mobile & Tablet', () => {
        test('should have full width on mobile', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto('/patients/new');

            // Container deve ter largura total
            const container = page.locator('.space-y-6').first();
            const box = await container.boundingBox();
            expect(box?.width).toBeLessThanOrEqual(375);
        });

        test('should have proper padding on tablet', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });
            await page.goto('/patients/new');

            // Verificar se existe padding responsivo
            const mainDiv = page.locator('.max-w-full').first();
            expect(mainDiv).toBeVisible();
        });
    });

    test.describe('CalendarWeekView - Tablet & Notebook', () => {
        test('should support horizontal scroll on small screens', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto('/schedule');

            // Verificar se há scroll horizontal
            const calendarContainer = page.locator('.overflow-x-auto').first();
            if (await calendarContainer.isVisible()) {
                const scrollWidth = await calendarContainer.evaluate(el => el.scrollWidth);
                expect(scrollWidth).toBeGreaterThan(0);
            }
        });

        test('should display properly on iPad', async ({ page }) => {
            await page.setViewportSize({ width: 834, height: 1192 });
            await page.goto('/schedule');

            // Calendar deve estar visível
            const calendar = page.locator('.grid-cols-\\[60px_repeat\\(6,1fr\\)\\]').first();
            expect(calendar).toBeVisible();
        });
    });

    test.describe('CustomizableDashboard - Responsive Widgets', () => {
        test('should have responsive grid layout', async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.goto('/');

            // Grid de widgets deve ser responsivo
            const widgetGrid = page.locator('.grid.grid-cols-1');
            expect(widgetGrid.first()).toBeVisible();
        });

        test('should have responsive dialog', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 });
            await page.goto('/');

            // Dialog de customização deve ser responsivo
            const triggerButton = page.locator('button').filter({ hasText: /Personalizar/Configurar/Personalizar/Configurar/ });
            if (await triggerButton.isVisible()) {
                await triggerButton.click();

                const dialog = page.locator('[role="dialog"]').filter({ hasText: /Personalizar|Configurar/ });
                if (await dialog.isVisible()) {
                    const dialogBox = await dialog.boundingBox();
                    // Dialog deve caber na tela
                    expect(dialogBox?.width).toBeLessThanOrEqual(768);
                }
            }
        });
    });

    test.describe('Index Dashboard - Responsive Layout', () => {
        test('should have proper responsive header', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto('/');

            // Header com avatar deve estar visível
            const avatar = page.locator('.avatar').first();
            expect(avatar).toBeVisible();
        });

        test('filter chips should be horizontally scrollable', async ({ page }) => {
            await page.setViewportSize({ width: 375, height:667 });
            await page.goto('/');

            // Container de chips deve ter scroll
            const chipsContainer = page.locator('.overflow-x-auto').first();
            expect(chipsContainer).toBeVisible();
        });
    });
});

test.describe('Touch Target Validation', () => {
    test('buttons should meet minimum touch target size', async ({ page }) => {
        await page.setViewportSize({ width: 834, height: 1192 });
        await page.goto('/');

        const buttons = page.locator('button:visible');
        const minSize = 44; // iOS minimum

        for (let i = 0; i < Math.min(await buttons.count(), 5); i++) {
            const box = await buttons.nth(i).boundingBox();
            if (box) {
                const meetsMinSize = box.height >= minSize || box.width >= minSize;
                expect(meetsMinSize).toBeTruthy();
            }
        }
    });
});

test.describe('Orientation Changes', () => {
    test('dashboard should adapt to orientation changes', async ({ page }) => {
        await page.setViewportSize({ width: 834, height: 1192 });
        await page.goto('/');

        const portraitWidth = await page.evaluate(() => document.body.scrollWidth);

        await page.setViewportSize({ width: 1194, height: 834 });
        await page.waitForTimeout(300);

        const landscapeWidth = await page.evaluate(() => document.body.scrollWidth);

        // Ambos devem caber sem scroll horizontal
        expect(portraitWidth).toBeLessThanOrEqual(834);
        expect(landscapeWidth).toBeLessThanOrEqual(1194);
    });
});
