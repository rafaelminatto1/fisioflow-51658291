import { test, expect } from '@playwright/test';

test.describe('Protocol Modal Theme Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to protocols page
    await page.goto('/protocols');
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText(/Protocolos/i);
  });

  test('NewProtocolModal should use system theme colors (no hardcoded teal)', async ({ page }) => {
    // Click "Novo Protocolo" button
    const newProtocolBtn = page.locator('button:has-text("Novo Protocolo"), button:has-text("Criar Protocolo")').first();
    await newProtocolBtn.click();

    // Verify modal is open
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // 1. Check DialogContent styling (should not have premium-shadow)
    // We check that it has bg-background and border-border (standard system theme)
    await expect(modal).toHaveClass(/bg-background/);
    await expect(modal).toHaveClass(/border-border/);
    await expect(modal).not.toHaveClass(/shadow-premium-lg/);

    // 2. Check Stepper (Circle 1 should be active/primary)
    const firstStepCircle = modal.locator('div.rounded-full').first();
    await expect(firstStepCircle).toHaveClass(/bg-primary/);
    
    // Check computed style of the circle to ensure it's not teal (#13ecc8)
    const bgColor = await firstStepCircle.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // Teal #13ecc8 is rgb(19, 236, 200)
    expect(bgColor).not.toBe('rgb(19, 236, 200)');

    // 3. Check "Continuar" button
    const nextBtn = modal.locator('button:has-text("Continuar")');
    await expect(nextBtn).toHaveClass(/bg-primary/);
    
    const btnBgColor = await nextBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(btnBgColor).not.toBe('rgb(19, 236, 200)');

    // Take a screenshot for manual verification if needed
    await page.screenshot({ path: 'test-results/protocol-modal-theme-check.png' });
  });

  test('ApplyProtocolModal should follow system theme', async ({ page }) => {
    // Assuming there's at least one protocol card
    const firstProtocolCard = page.locator('.group\\/card').first();
    if (await firstProtocolCard.isVisible()) {
        const applyBtn = firstProtocolCard.locator('button:has-text("Aplicar"), button[title*="Aplicar"]').first();
        await applyBtn.click();

        const modal = page.locator('div[role="dialog"]');
        await expect(modal).toBeVisible();
        await expect(modal).toHaveClass(/bg-background/);
        
        // Check "Confirmar" button
        const confirmBtn = modal.locator('button:has-text("Confirmar")');
        await expect(confirmBtn).toHaveClass(/bg-primary/);
        
        await page.screenshot({ path: 'test-results/apply-protocol-modal-theme-check.png' });
    } else {
        console.log('No protocols found to test ApplyProtocolModal');
    }
  });
});
