import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

/**
 * Validation Test: Verifies recent fixes
 */
test.describe('FisioFlow Validation Fixes', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    await page.fill('input[type="email"]', testUsers.rafael.email);
    await page.fill('input[type="password"]', testUsers.rafael.password);
    
    // Click login and wait for redirect
    await page.click('button[type="submit"]');
    
    // Wait for either dashboard, patients or the agenda (root with query params)
    await expect(page).toHaveURL(/.*(dashboard|patients|view=week|date=).*/, { timeout: 30000 });
  });

  test('Exercise Library should have 3 columns on desktop', async ({ page }) => {
    await page.goto('/exercises');
    await page.waitForSelector('text=Biblioteca');
    
    // Check for lg:grid-cols-3 class in the library container
    const grid = page.locator('div.grid').filter({ hasClass: /lg:grid-cols-3/ }).first();
    await expect(grid).toBeVisible();
  });

  test('Protocols page should load without errors', async ({ page }) => {
    await page.goto('/protocols');
    
    // Check if error message is NOT visible
    const errorHeading = page.getByText('Erro ao carregar protocolos');
    await expect(errorHeading).not.toBeVisible();
    
    // Check if header is visible
    await expect(page.getByRole('heading', { name: 'Protocolos Clínicos' })).toBeVisible();
  });

  test('Financial pages should load without ReferenceErrors', async ({ page }) => {
    // 1. Main Financial
    await page.goto('/financial');
    await expect(page.getByRole('heading', { name: 'Gestão Financeira' })).toBeVisible();
    
    // 2. NFSe Page
    await page.goto('/financeiro/nfse');
    await expect(page.getByRole('heading', { name: /NFSe/i })).toBeVisible();
    
    // 3. Recibos Page
    await page.goto('/financeiro/recibos');
    await expect(page.getByRole('heading', { name: /^Recibos$/i })).toBeVisible();
  });

  test('AI Clinical Analysis page should load without ReferenceError', async ({ page }) => {
    await page.goto('/ai/clinical');
    await expect(page.getByRole('heading', { name: /IA Clínica/i })).toBeVisible();
    
    // Check if patient selection exists
    await expect(page.getByText('Selecione o Paciente')).toBeVisible();
  });

  test('Smart Dashboard should load metrics', async ({ page }) => {
    await page.goto('/smart-dashboard');
    // The title might be different or translated, let's just check for an h1
    await expect(page.locator('h1')).toBeVisible();
    
    // Wait for metrics to load (or at least no error)
    const errorMsg = page.getByText(/Erro ao carregar métricas|falhou/i);
    await expect(errorMsg).not.toBeVisible();
  });
});
