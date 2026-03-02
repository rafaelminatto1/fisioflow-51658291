import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import type { Page } from '@playwright/test';

/**
 * Valida que a agenda semanal exibe todos os horários sem barra de rolagem
 * em telas de notebook/monitor (viewport ≥ 1366×768).
 */

async function loginAndGoToWeek(page: Page) {
    await page.goto('/auth/login', { waitUntil: 'commit', timeout: 30000 });
    await page.waitForSelector('#login-email', { timeout: 30000 });
    await page.fill('#login-email', testUsers.fisio.email);
    await page.fill('#login-password', testUsers.fisio.password);
    await page.click('button[type="submit"]');
    await expect.poll(() => page.url(), { timeout: 30000 }).not.toContain('/auth');

    await page.goto('/?view=week', { waitUntil: 'commit', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000); // aguarda ResizeObserver + isSlotHeightMeasured settle
}

async function getGridScrollInfo(page: Page) {
    return page.evaluate(() => {
        const grid = document.querySelector('#calendar-grid-dndkit');
        if (!grid) return null;
        // O VirtualizedCalendarGrid usa um div com style overflow-y: auto
        const scrollEl = grid.querySelector('[style*="overflow"]') as HTMLElement | null
            ?? grid as HTMLElement;
        return {
            scrollHeight: scrollEl.scrollHeight,
            clientHeight: scrollEl.clientHeight,
            scrollTop: scrollEl.scrollTop,
            hasVerticalScroll: scrollEl.scrollHeight > scrollEl.clientHeight + 4,
        };
    });
}

test.describe('Agenda - todos os horários visíveis sem scroll', () => {
    test.setTimeout(120000);

    test('1366×768 (notebook): sem scrollbar, 20:00 visível', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 });
        await loginAndGoToWeek(page);

        // Grid deve estar visível
        await expect(page.locator('#calendar-grid-dndkit')).toBeVisible({ timeout: 15000 });

        // Horário 20:00 deve estar presente e visível
        const slot20 = page.locator('#calendar-grid-dndkit').getByText('20:00');
        await expect(slot20.first()).toBeVisible({ timeout: 8000 });

        // Não deve haver scroll vertical no grid
        const info = await getGridScrollInfo(page);
        console.log('📊 1366×768 scroll info:', info);
        expect(info).not.toBeNull();
        expect(info!.hasVerticalScroll).toBe(false);
    });

    test('1920×1080 (monitor): sem scrollbar, 20:00 visível', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await loginAndGoToWeek(page);

        await expect(page.locator('#calendar-grid-dndkit')).toBeVisible({ timeout: 15000 });

        const slot20 = page.locator('#calendar-grid-dndkit').getByText('20:00');
        await expect(slot20.first()).toBeVisible({ timeout: 8000 });

        const info = await getGridScrollInfo(page);
        console.log('📊 1920×1080 scroll info:', info);
        expect(info).not.toBeNull();
        expect(info!.hasVerticalScroll).toBe(false);
    });
});
