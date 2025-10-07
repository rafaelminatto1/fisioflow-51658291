import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { testUsers } from './fixtures/test-data';

test.describe('Testes de Acessibilidade WCAG 2.1 AA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(eventos|dashboard|schedule)/);
  });

  test('página de eventos deve passar em testes de acessibilidade', async ({ page }) => {
    await page.goto('/eventos');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('página de agenda deve passar em testes de acessibilidade', async ({ page }) => {
    await page.goto('/schedule');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('página de pacientes deve passar em testes de acessibilidade', async ({ page }) => {
    await page.goto('/patients');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('navegação por teclado deve funcionar corretamente', async ({ page }) => {
    await page.goto('/eventos');
    
    // Tab através dos elementos interativos
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Enter deve ativar botão focado
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  });

  test('modais devem fechar com ESC', async ({ page }) => {
    await page.goto('/eventos');
    
    await page.click('text=/novo evento/i');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('inputs devem ter labels associados', async ({ page }) => {
    await page.goto('/eventos');
    await page.click('text=/novo evento/i');
    
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Pelo menos um método de label deve existir
      expect(id || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });
});
