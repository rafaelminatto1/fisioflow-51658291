/**
 * Global Setup for Playwright E2E Tests
 * 
 * Otimizado para Neon Auth + Dashboard Redirection
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { testUsers } from './fixtures/test-data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, '../playwright/.auth/user.json');

export default async function globalSetup(config: FullConfig) {
  console.log('\n🧪 Playwright Global Setup - Iniciando...');

  if (process.env.E2E_SKIP_AUTH_SETUP === 'true') {
    console.log('ℹ️  Auth setup automático desativado');
    return;
  }

  const projectUse = (config.projects?.[0]?.use || {}) as Record<string, unknown>;
  const baseURL = String(projectUse.baseURL || process.env.BASE_URL || 'http://localhost:5173');
  const authBaseURL = baseURL.split('?')[0];

  mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  rmSync(AUTH_STATE_PATH, { force: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: authBaseURL });
  const page = await context.newPage();

  try {
    page.on('response', resp => {
      if (!resp.ok() && resp.status() !== 200 && resp.status() !== 204 && resp.status() !== 302 && resp.status() !== 304 && resp.status() !== 201) {
        console.log(`[NETWORK] ${resp.request().method()} ${resp.url()} -> Status: ${resp.status()}`);
      }
    });

    const authUrl = `${authBaseURL}/auth?e2e=true`;
    console.log(`⏳ Navegando para ${authUrl} (tentativa 1)...`);
    await page.goto(authUrl, { waitUntil: 'domcontentloaded' });

    // Seletores específicos baseados no LoginForm.tsx
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 20000 });
    await emailInput.fill(testUsers.admin.email);
    await passwordInput.fill(testUsers.admin.password);

    console.log('🚀 Tentativa de login enviada, aguardando dashboard...');
    await submitButton.click();

    // Aguardar redirecionamento para fora do auth
    try {
      await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 30000 });
    } catch (e) {
      console.error('❌ Timeout aguardando redirecionamento pós-login. Capturando estado...');
      await page.screenshot({ path: path.join(__dirname, '../playwright-setup-timeout.png'), fullPage: true });
      const html = await page.content();
      writeFileSync(path.join(__dirname, '../playwright-setup-timeout.html'), html);
      throw e;
    }

    console.log(`✅ Redirecionado para: ${page.url()}`);

    // Verificar se o cookie do Neon Auth apareceu (HttpOnly e SameSite=None)
    console.log('⏳ Verificando cookies de sessão...');
    let sessionCookie = null;
    for (let i = 0; i < 15; i++) {
      const cookies = await context.cookies();
      sessionCookie = cookies.find(c => c.name.includes('session_token'));
      if (sessionCookie) break;
      await page.waitForTimeout(1000);
    }

    if (sessionCookie) {
      console.log(`✅ Cookie de sessão encontrado: ${sessionCookie.name}`);
    } else {
      console.warn('⚠️ Aviso: Cookie de sessão não detectado via context.cookies(), mas continuando...');
    }

    // Verificar se elementos do dashboard carregaram (garante hidratação)
    await page.waitForSelector('[data-testid="main-layout"], [data-testid="user-menu"], h1', { timeout: 30000 });
    console.log('✅ Dashboard detectado!');

    // Pausa técnica para garantir que o LocalStorage de sessão seja gravado (se o app herdar algo via JS)
    await page.waitForTimeout(2000);

    console.log('🔐 Sessão estabilizada. Gravando storageState...');
    await context.storageState({ path: AUTH_STATE_PATH });

    console.log(`🔐 Auth storageState criado com sucesso em: ${AUTH_STATE_PATH}`);
  } catch (error) {
    console.error('❌ Falha crítica ao criar storageState autenticado:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global Setup concluído\n');
}
