/**
 * Global Setup for Playwright E2E Tests
 *
 * Executa antes de todos os testes para preparar o ambiente:
 * 1. Executa seed data se E2E_AUTO_SEED=true
 * 2. Limpa dados de teste anteriores se E2E_CLEANUP=true
 *
 * Uso:
 *   E2E_AUTO_SEED=true npm run test:e2e
 */

import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { testUsers } from './fixtures/test-data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEED_SCRIPT = path.join(__dirname, '../scripts/seed-e2e-data.cjs');
const AUTH_STATE_PATH = path.join(__dirname, '../playwright/.auth/user.json');

export default async function globalSetup(config: FullConfig) {
  console.log('\n🧪 Playwright Global Setup - Iniciando...');

  // Verifica se deve executar seed data automaticamente
  const autoSeed = process.env.E2E_AUTO_SEED === 'true';
  const cleanup = process.env.E2E_CLEANUP === 'true';

  if (autoSeed) {
    console.log('📱 Executando seed data automaticamente...');

    try {
      // Executa o script de seed data
      execSync(`node "${SEED_SCRIPT}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 60000, // 60 segundos
      });

      console.log('✅ Seed data executado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao executar seed data:', error);
      // Não falhar os testes se seed data falhar
      console.log('⚠️  Continuando testes sem seed data...');
    }
  } else {
    console.log('ℹ️  Seed data automática desativada');
    console.log('   Para ativar: E2E_AUTO_SEED=true npm run test:e2e');
    console.log('   Ou execute manualmente: npm run db:seed:e2e');
  }

  if (cleanup) {
    console.log('🧹 Limpeza de dados de teste não implementada (use Firebase Console manualmente)');
  }

  // Build authenticated storageState for E2E to avoid flaky login per test
  if (process.env.E2E_SKIP_AUTH_SETUP !== 'true') {
    try {
      const projectUse = (config.projects?.[0]?.use || {}) as Record<string, unknown>;
      const baseURL = String(projectUse.baseURL || process.env.BASE_URL || 'http://127.0.0.1:5173?e2e=true');
      const authBaseURL = baseURL.split('?')[0];

      mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });

      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ baseURL: authBaseURL });
      const page = await context.newPage();

      await page.goto('/auth');
      const currentPath = new URL(page.url()).pathname;

      if (currentPath.startsWith('/auth')) {
        const formInputs = page.locator('form input');
        await formInputs.first().waitFor({ state: 'visible', timeout: 20000 });
        await formInputs.nth(0).fill(testUsers.admin.email);
        await formInputs.nth(1).fill(testUsers.admin.password);
        await page.getByRole('button', { name: /Acessar Minha Conta|Entrar na Plataforma/i }).first().click();
        await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 30000 });
      }

      await context.storageState({ path: AUTH_STATE_PATH });
      await browser.close();
      console.log(`🔐 Auth storageState criado: ${AUTH_STATE_PATH}`);
    } catch (error) {
      console.warn('⚠️ Não foi possível criar storageState autenticado no global-setup. Testes seguirão com login no próprio spec.');
      console.warn(error);
    }
  } else {
    console.log('ℹ️  Auth setup automático desativado (E2E_SKIP_AUTH_SETUP=true)');
  }

  console.log('✅ Global Setup concluído\n');
}
