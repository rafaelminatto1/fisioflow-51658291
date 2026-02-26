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
import { mkdirSync, rmSync } from 'fs';
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
      // Configura variáveis de ambiente do emulador para o script de seed
      const env = {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        GCLOUD_PROJECT: 'fisioflow-migration',
      };

      // Executa o script de seed data
      execSync(`node "${SEED_SCRIPT}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        env,
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
    const projectUse = (config.projects?.[0]?.use || {}) as Record<string, unknown>;
    const baseURL = String(projectUse.baseURL || process.env.BASE_URL || 'http://localhost:5173?e2e=true');
    const authBaseURL = baseURL.split('?')[0];

    mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
    rmSync(AUTH_STATE_PATH, { force: true });

    const maxAttempts = 3;
    let lastError: unknown;
    let created = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const browser = await chromium.launch({ headless: true });
      try {
        const context = await browser.newContext({
          baseURL: authBaseURL,
          serviceWorkers: 'block',
        });
        const page = await context.newPage();

        const performLogin = async () => {
          const emailInput = page
            .locator('input[name="email"], input[type="email"], input[autocomplete="email"]')
            .first();
          const passwordInput = page
            .locator('input[name="password"], input[type="password"], input[autocomplete="current-password"]')
            .first();
          await emailInput.waitFor({ state: 'visible', timeout: 20000 });
          await emailInput.fill(testUsers.admin.email);
          await passwordInput.fill(testUsers.admin.password);
          await page.getByRole('button', { name: /Acessar Minha Conta|Entrar na Plataforma|Entrar/i }).first().click();

          const loginError = page.getByTestId('login-error').first();
          const result = await Promise.race([
            page
              .waitForFunction(() => !window.location.pathname.startsWith('/auth'), undefined, { timeout: 15000 })
              .then(() => 'ok')
              .catch(() => null),
            loginError
              .waitFor({ state: 'visible', timeout: 15000 })
              .then(() => 'error')
              .catch(() => null),
          ]);

          if (result === 'error') {
            const errorText = (await loginError.textContent())?.trim() || 'Erro de login não identificado';
            throw new Error(`Falha no login automático: ${errorText}`);
          }
        };

        const ensureAuthenticatedWorkspace = async () => {
          for (let i = 0; i < 4; i += 1) {
            await page.goto('/wiki-workspace', { waitUntil: 'domcontentloaded' });
            const currentPath = new URL(page.url()).pathname;

            if (currentPath.startsWith('/auth')) {
              await performLogin();
              continue;
            }

            const authEmailVisible = await page
              .locator('input[name="email"], input[type="email"], input[autocomplete="email"]')
              .first()
              .isVisible()
              .catch(() => false);
            if (authEmailVisible) {
              await performLogin();
              continue;
            }

            const createButtonVisible = await page.getByTestId('create-wiki-page-button').isVisible().catch(() => false);
            if (createButtonVisible) return true;

            if (currentPath.startsWith('/wiki-workspace')) {
              return true;
            }

            // Em algumas execuções o shell carrega antes do conteúdo completo da Wiki.
            const appShellVisible = await page.getByText('FISIOFLOW').first().isVisible().catch(() => false);
            if (appShellVisible && !currentPath.startsWith('/auth')) {
              return true;
            }

            await page.waitForTimeout(1000);
          }
          return false;
        };

        await page.goto('/auth', { waitUntil: 'domcontentloaded' });
        const initialPath = new URL(page.url()).pathname;
        if (initialPath.startsWith('/auth')) {
          await performLogin();
        }

        const workspaceReady = await ensureAuthenticatedWorkspace();
        if (!workspaceReady) {
          throw new Error(`Workspace não ficou pronto após autenticação. URL atual: ${page.url()}`);
        }

        // Valida que a sessão sobrevive a reload antes de salvar storageState
        await page.reload({ waitUntil: 'domcontentloaded' });
        const afterReloadReady = await ensureAuthenticatedWorkspace();
        if (!afterReloadReady) {
          throw new Error(`Workspace não ficou pronto após reload. URL atual: ${page.url()}`);
        }

        await context.storageState({ path: AUTH_STATE_PATH, indexedDB: true });
        created = true;
        console.log(`🔐 Auth storageState criado: ${AUTH_STATE_PATH} (tentativa ${attempt}/${maxAttempts})`);
        await browser.close();
        break;
      } catch (error) {
        lastError = error;
        await browser.close();
      }
    }

    if (!created) {
      console.error('❌ Falha ao criar storageState autenticado após múltiplas tentativas.');
      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }
  } else {
    console.log('ℹ️  Auth setup automático desativado (E2E_SKIP_AUTH_SETUP=true)');
  }

  console.log('✅ Global Setup concluído\n');
}
