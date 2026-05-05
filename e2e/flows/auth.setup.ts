import { test as setup, expect } from '@playwright/test';
import path from 'path';

const SESSION_FILE = path.join(__dirname, '../.auth/session.json');

// Executa uma vez antes de todos os testes para reusar a sessão autenticada.
setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_EMAIL || 'rafael.minatto@yahoo.com.br';
  const password = process.env.E2E_PASSWORD || 'Yukari30@';

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Aguarda a sessão ser estabelecida (redireciona para dashboard ou agenda)
  await page.waitForURL(/\/(dashboard|agenda)/, { timeout: 20000 });

  // Persiste cookies e localStorage para os outros testes
  await page.context().storageState({ path: SESSION_FILE });
});
