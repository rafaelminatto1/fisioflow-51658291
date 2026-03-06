#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const envFiles = ['.env.local', '.env'];

function parseEnv(filePath) {
  const result = {};
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadEnv() {
  const merged = {};
  for (const file of envFiles) {
    const path = resolve(cwd, file);
    if (!existsSync(path)) continue;
    Object.assign(merged, parseEnv(path));
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value.length > 0) merged[key] = value;
  }
  return merged;
}

const env = loadEnv();
const webUrl = (env.VERIFY_WEB_URL || 'https://fisioflow.pages.dev').replace(/\/$/, '');
const apiUrl = (env.VERIFY_API_URL || env.VITE_WORKERS_API_URL || 'https://fisioflow-api.rafalegollas.workers.dev').replace(/\/$/, '');
const neonAuthUrl = env.VITE_NEON_AUTH_URL || '';

const checks = [];
let failed = 0;

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
}

function fail(name, detail) {
  checks.push({ ok: false, name, detail });
  failed += 1;
}

async function checkWebBundleHasNeonAuth() {
  try {
    const htmlRes = await fetch(webUrl, { redirect: 'follow' });
    if (!htmlRes.ok) return fail('Frontend online', `HTTP ${htmlRes.status} em ${webUrl}`);
    const html = await htmlRes.text();
    pass('Frontend online', webUrl);

    const bundleMatch = html.match(/assets\/js\/index-[^"'\s]+\.js/);
    if (!bundleMatch) return fail('Bundle index localizado', 'Arquivo assets/js/index-*.js não encontrado');
    const bundlePath = bundleMatch[0];
    const jsRes = await fetch(`${webUrl}/${bundlePath}`);
    if (!jsRes.ok) return fail('Bundle acessível', `HTTP ${jsRes.status} em ${bundlePath}`);

    const js = await jsRes.text();
    const expectedHost = (() => {
      try {
        if (!neonAuthUrl) return '';
        return new URL(neonAuthUrl).host;
      } catch {
        return '';
      }
    })();

    if (!expectedHost) {
      return fail('VITE_NEON_AUTH_URL configurada', 'Defina VITE_NEON_AUTH_URL em .env/.env.local');
    }

    if (!js.includes(expectedHost)) {
      return fail('Bundle com Neon Auth URL', `Host ${expectedHost} não encontrado no bundle publicado`);
    }
    pass('Bundle com Neon Auth URL', `${bundlePath} contém ${expectedHost}`);
  } catch (error) {
    fail('Verificação do frontend', String(error instanceof Error ? error.message : error));
  }
}

async function checkApiHealth() {
  try {
    const res = await fetch(`${apiUrl}/api/health`);
    if (!res.ok) return fail('API health', `HTTP ${res.status}`);
    const body = await res.json();
    if (body?.status !== 'ok') return fail('API health payload', `status inesperado: ${JSON.stringify(body)}`);
    pass('API health', `${apiUrl}/api/health status=ok`);
  } catch (error) {
    fail('API health', String(error instanceof Error ? error.message : error));
  }
}

async function checkProtectedRoutesRejectAnonymous() {
  try {
    const res = await fetch(`${apiUrl}/api/patients?limit=1`);
    if (res.status !== 401) {
      return fail('JWT obrigatório em /api/patients', `Esperado 401 sem token, recebido ${res.status}`);
    }
    pass('JWT obrigatório em /api/patients', 'Retornou 401 sem Authorization');
  } catch (error) {
    fail('JWT obrigatório em /api/patients', String(error instanceof Error ? error.message : error));
  }
}

function checkRequiredEnv() {
  if (!env.VITE_NEON_AUTH_URL) {
    fail('Env VITE_NEON_AUTH_URL', 'ausente');
  } else {
    pass('Env VITE_NEON_AUTH_URL', env.VITE_NEON_AUTH_URL);
  }

  if (!env.VITE_WORKERS_API_URL) {
    fail('Env VITE_WORKERS_API_URL', 'ausente');
  } else {
    pass('Env VITE_WORKERS_API_URL', env.VITE_WORKERS_API_URL);
  }
}

async function main() {
  console.log('\nFisioFlow - Verificacao Pos-Migracao (Cloudflare + Neon)\n');
  checkRequiredEnv();
  await checkWebBundleHasNeonAuth();
  await checkApiHealth();
  await checkProtectedRoutesRejectAnonymous();

  for (const check of checks) {
    const icon = check.ok ? 'OK' : 'FAIL';
    console.log(`${icon} | ${check.name} | ${check.detail}`);
  }

  if (failed > 0) {
    console.error(`\nResultado: ${failed} verificacao(oes) falharam.`);
    process.exit(1);
  }

  console.log('\nResultado: todas as verificacoes passaram.');
}

await main();
