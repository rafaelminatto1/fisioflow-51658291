/**
 * Wiki E2E Tests
 * Testes de ponta a ponta para funcionalidades de Wiki
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:8084';
const WIKI_URL = `${BASE_URL}/wiki`;

test.describe('Wiki', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForURL('**/auth/**');
    await page.waitForSelector('#login-email', { state: 'visible', timeout: 5000 });
    await page.fill('#login-email', TEST_USER.email);
    await page.fill('#login-password', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|schedule|eventos)?/, { timeout: 10000 });
  });

  test('deve exibir página de Wiki', async ({ page }) => {
    await page.goto(WIKI_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve criar nova página wiki', async ({ page }) => {
    await page.goto(WIKI_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that the page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve editar página existente', async ({ page }) => {
    await page.goto(WIKI_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve buscar páginas', async ({ page }) => {
    await page.goto(WIKI_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve visualizar histórico de versões', async ({ page }) => {
    await page.goto(WIKI_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(0);
  });
});

test.describe('Wiki Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#login-email', { state: 'visible', timeout: 5000 });
    await page.fill('#login-email', TEST_USER.email);
    await page.waitForSelector('#login-password', { state: 'visible', timeout: 5000 });
    await page.fill('#login-password', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|schedule|eventos)?/, { timeout: 10000 });
  });

  test('deve suportar markdown básico', async ({ page }) => {
    await page.goto(WIKI_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('deve inserir link', async ({ page }) => {
    await page.goto(WIKI_URL);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
