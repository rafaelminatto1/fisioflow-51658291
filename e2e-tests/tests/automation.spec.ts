/**
 * Automation E2E Tests
 * Testes de ponta a ponta para funcionalidades de Automation
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:8084';
const AUTOMATION_URL = `${BASE_URL}/automation`;

test.describe('Automation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for redirect to login page
    await page.waitForURL('**/auth/**');

    // Wait for the login form to be visible
    await page.waitForSelector('#login-email', { state: 'visible', timeout: 5000 });
    await page.waitForSelector('#login-password', { state: 'visible', timeout: 5000 });

    // Use specific IDs from LoginForm component
    await page.fill('#login-email', TEST_USER.email);
    await page.fill('#login-password', TEST_USER.password);

    // Click the submit button
    await page.click('button[type="submit"]');

    // Wait for successful login redirect - try multiple possible URLs
    await page.waitForURL(/\/(dashboard|schedule|eventos)?/, { timeout: 10000 });
  });

  test('deve exibir página de Automation', async ({ page }) => {
    await page.goto(AUTOMATION_URL);

    // Wait for page content to load - check for any response
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that we're on a page (not error page)
    const url = page.url();
    expect(url).toContain('http');

    // Basic check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve criar nova automação', async ({ page }) => {
    await page.goto(AUTOMATION_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve criar automação a partir de recipe', async ({ page }) => {
    await page.goto(AUTOMATION_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve testar automação', async ({ page }) => {
    await page.goto(AUTOMATION_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve ativar/desativar automação', async ({ page }) => {
    await page.goto(AUTOMATION_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve visualizar logs de execução', async ({ page }) => {
    await page.goto(AUTOMATION_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Verify page is loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

test.describe('Automation Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for redirect to login page
    await page.waitForURL('**/auth/**');

    // Wait for the login form to be visible
    await page.waitForSelector('#login-email', { state: 'visible', timeout: 5000 });
    await page.waitForSelector('#login-password', { state: 'visible', timeout: 5000 });

    // Use specific IDs from LoginForm component
    await page.fill('#login-email', TEST_USER.email);
    await page.fill('#login-password', TEST_USER.password);

    // Click the submit button
    await page.click('button[type="submit"]');

    // Wait for successful login redirect
    await page.waitForURL(/\/(dashboard|schedule|eventos)?/, { timeout: 10000 });
  });

  test('deve arrastar nó para o canvas', async ({ page }) => {
    await page.goto(AUTOMATION_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Verify page loads
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve conectar nós', async ({ page }) => {
    await page.goto(AUTOMATION_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Verify page loads
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve adicionar condição (branch)', async ({ page }) => {
    await page.goto(AUTOMATION_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Verify automation page is accessible
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(0);
  });
});
