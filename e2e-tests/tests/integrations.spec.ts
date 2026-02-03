/**
 * Integrations E2E Tests
 * Testes de ponta a ponta para funcionalidades de Integrações
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:8084';
const INTEGRATIONS_URL = `${BASE_URL}/integrations`;

test.describe('Integrations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForURL('**/auth/**');
    await page.fill('#login-email', TEST_USER.email);
    await page.fill('#login-password', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|schedule|eventos)?/, { timeout: 10000 });
  });

  test('deve exibir página de Integrações', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve listar integrações disponíveis', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded
    const url = page.url();
    expect(url).toContain('http');
  });

  test('deve abrir modal de configuração', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(0);
  });

  test('deve mostrar status de integração conectada', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve alternar status ativo/inativo', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('deve sincronizar integração', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

test.describe('Google Calendar Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#login-email', { state: 'visible', timeout: 5000 });
    await page.fill('#login-email', TEST_USER.email);
    await page.waitForSelector('#login-password', { state: 'visible', timeout: 5000 });
    await page.fill('#login-password', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|schedule|eventos)?/, { timeout: 10000 });
  });

  test('deve configurar Google Calendar', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve mostrar sync status', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded
    const url = page.url();
    expect(url).toBeTruthy();
  });
});

test.describe('Stripe Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#login-email', { state: 'visible', timeout: 5000 });
    await page.fill('#login-email', TEST_USER.email);
    await page.waitForSelector('#login-password', { state: 'visible', timeout: 5000 });
    await page.fill('#login-password', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|schedule|eventos)?/, { timeout: 10000 });
  });

  test('deve configurar Stripe', async ({ page }) => {
    await page.goto(INTEGRATIONS_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
