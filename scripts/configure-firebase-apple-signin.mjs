#!/usr/bin/env node
/**
 * Configura o provedor "Sign in with Apple" no Firebase (Identity Platform)
 * usando a REST API. Requer credenciais Apple (Service ID, Team ID, Key ID, chave .p8).
 *
 * Uso:
 *   node scripts/configure-firebase-apple-signin.mjs
 *
 * Variáveis de ambiente:
 *   FIREBASE_SERVICE_ACCOUNT_KEY ou FIREBASE_SERVICE_ACCOUNT_KEY_PATH  (conta de serviço Firebase)
 *   APPLE_SERVICE_ID   - Services ID do Apple Developer (Identifiers > Services ID)
 *   APPLE_TEAM_ID      - Apple Developer Team ID
 *   APPLE_KEY_ID       - Key ID da chave "Sign in with Apple" (Keys)
 *   APPLE_PRIVATE_KEY  - Conteúdo do arquivo .p8 (ou use APPLE_PRIVATE_KEY_PATH)
 *   APPLE_PRIVATE_KEY_PATH - Caminho para o arquivo .p8
 *
 * Projeto: lido de .firebaserc (default) ou FIREBASE_PROJECT_ID
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JWT } from 'google-auth-library';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || readFirebaseProjectId();
const API_BASE = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}`;
const IDP_ID = 'apple.com';

function readFirebaseProjectId() {
  const path = resolve(__dirname, '../.firebaserc');
  if (!existsSync(path)) throw new Error('.firebaserc não encontrado. Defina FIREBASE_PROJECT_ID.');
  const rc = JSON.parse(readFileSync(path, 'utf-8'));
  return rc.projects?.default || process.env.FIREBASE_PROJECT_ID;
}

function getServiceAccount() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    try {
      return typeof key === 'string' ? JSON.parse(key) : key;
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY JSON inválido: ' + e.message);
    }
  }
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
    || resolve(__dirname, '../functions/service-account-key.json');
  if (!existsSync(keyPath)) {
    throw new Error(
      'Credencial Firebase não encontrada. Defina FIREBASE_SERVICE_ACCOUNT_KEY ou FIREBASE_SERVICE_ACCOUNT_KEY_PATH, ou coloque service-account-key.json em functions/'
    );
  }
  return JSON.parse(readFileSync(keyPath, 'utf-8'));
}

function getApplePrivateKey() {
  const path = process.env.APPLE_PRIVATE_KEY_PATH;
  if (path) {
    const full = resolve(path);
    if (!existsSync(full)) throw new Error('APPLE_PRIVATE_KEY_PATH não encontrado: ' + full);
    return readFileSync(full, 'utf-8').trim();
  }
  const key = process.env.APPLE_PRIVATE_KEY;
  if (!key) throw new Error('Defina APPLE_PRIVATE_KEY (conteúdo do .p8) ou APPLE_PRIVATE_KEY_PATH');
  return key.trim();
}

async function getAccessToken(serviceAccount) {
  const jwt = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const { access_token } = await jwt.authorize();
  return access_token;
}

async function getCurrentConfig(accessToken) {
  const res = await fetch(
    `${API_BASE}/defaultSupportedIdpConfigs/${IDP_ID}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET IdP config: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createAppleConfig(accessToken, body) {
  const res = await fetch(
    `${API_BASE}/defaultSupportedIdpConfigs?idpId=${IDP_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 409) throw new Error('Provedor Apple já existe. Use PATCH para atualizar.');
    throw new Error(`POST IdP config: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function updateAppleConfig(accessToken, body) {
  const res = await fetch(
    `${API_BASE}/defaultSupportedIdpConfigs/${IDP_ID}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH IdP config: ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  console.log('Projeto Firebase:', PROJECT_ID);
  console.log('IdP:', IDP_ID);

  const serviceId = process.env.APPLE_SERVICE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  if (!serviceId || !teamId || !keyId) {
    console.error(`
Configure as variáveis de ambiente Apple (obtidas no Apple Developer):

  APPLE_SERVICE_ID   - Services ID (Identifiers > Identifiers > Services ID)
  APPLE_TEAM_ID      - Team ID (Membership > Membership details)
  APPLE_KEY_ID       - Key ID (Keys > Sign in with Apple)
  APPLE_PRIVATE_KEY  - Conteúdo do arquivo .p8 (ou APPLE_PRIVATE_KEY_PATH=/caminho/para/AuthKey_XXXXX.p8)

No Apple Developer:
  1. Certificates, Identifiers & Profiles > Identifiers > + > Services IDs
  2. Configurar "Sign in with Apple" e Return URL: https://${PROJECT_ID}.firebaseapp.com/__/auth/handler
  3. Keys > + > Sign in with Apple > baixar .p8 e anotar Key ID
`);
    process.exit(1);
  }

  const privateKey = getApplePrivateKey();
  const serviceAccount = getServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);

  const body = {
    name: `projects/${PROJECT_ID}/defaultSupportedIdpConfigs/${IDP_ID}`,
    enabled: true,
    clientId: serviceId,
    appleSignInConfig: {
      codeFlowConfig: {
        teamId,
        keyId,
        privateKey,
      },
    },
  };

  try {
    const current = await getCurrentConfig(accessToken);
    if (current) {
      console.log('Provedor Apple já configurado. Atualizando...');
      const updated = await updateAppleConfig(accessToken, body);
      console.log('Atualizado:', updated.name);
    } else {
      console.log('Criando configuração do provedor Apple...');
      const created = await createAppleConfig(accessToken, body);
      console.log('Criado:', created.name);
    }
    console.log('Sign in with Apple habilitado no Firebase.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
