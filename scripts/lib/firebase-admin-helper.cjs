/**
 * Firebase Admin Helper para Scripts
 *
 * Carrega a credencial do Firebase Admin SDK a partir de:
 * 1. Variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)
 * 2. Variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY_PATH (caminho do arquivo)
 * 3. Caminho padrão: ../functions/service-account-key.json
 *
 * Suporte a Emulator:
 * - Se FIRESTORE_EMULATOR_HOST estiver definido, conecta ao Firestore Emulator
 * - Se FIREBASE_AUTH_EMULATOR_HOST estiver definido, conecta ao Auth Emulator
 *
 * Uso:
 *   const { getServiceAccount, initFirebaseAdmin, getDb } = require('./lib/firebase-admin-helper');
 *   const serviceAccount = getServiceAccount();
 *   const admin = initFirebaseAdmin(serviceAccount);
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let dbInstance = null;
let adminInstance = null;
let authInstance = null;

/**
 * Obtém a credencial de conta de serviço Firebase
 * @returns {Object} Service account credentials
 */
function getServiceAccount() {
  // Se estiver usando emulador, retorna config mínima
  if (shouldUseEmulator()) {
    return {
      project_id: 'fisioflow-migration'
    };
  }

  // 1. Tentar ler da variável de ambiente (JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY definido mas JSON inválido: ' + e.message);
    }
  }

  // 2. Tentar ler do arquivo especificado na variável de ambiente
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
    const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Arquivo não encontrado: ${keyPath}`);
    }
    return require(keyPath);
  }

  // 3. Usar caminho padrão (relative to scripts/ directory)
  const defaultPath = path.join(__dirname, '../../functions/service-account-key.json');
  if (!fs.existsSync(defaultPath)) {
    throw new Error(
      'Credencial Firebase não encontrada.\n' +
      'Defina FIREBASE_SERVICE_ACCOUNT_KEY ou FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env\n' +
      'Ou use o Firebase Emulator (defina FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST)\n' +
      'Ou coloque o arquivo em: ' + defaultPath
    );
  }

  return require(defaultPath);
}

/**
 * Verifica se deve usar o Firebase Emulator
 */
function shouldUseEmulator() {
  return !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
}

/**
 * Inicializa Firebase Admin SDK
 * @param {Object} serviceAccount - Service account credentials
 * @returns {Object} Firebase Admin instance
 */
function initFirebaseAdmin(serviceAccount) {
  // Se já foi inicializado, reutilizar
  if (adminInstance) {
    return adminInstance;
  }

  // Verificar se já existe um app inicializado
  if (admin.apps.length > 0) {
    adminInstance = admin;
    return adminInstance;
  }

  // Configurar app
  const appConfig = {
    projectId: serviceAccount?.project_id || 'fisioflow-migration'
  };

  // Se estiver usando emulador, não precisa de credencial real
  if (shouldUseEmulator()) {
    // Usar credencial vazia para emulador
    appConfig.credential = admin.credential.applicationDefault();
  } else if (serviceAccount) {
    appConfig.credential = admin.credential.cert(serviceAccount);
  }

  // Inicializar app
  admin.initializeApp(appConfig);

  adminInstance = admin;
  return adminInstance;
}

/**
 * Obtém instância do Firestore
 * @returns {Object} Firestore instance
 */
function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const serviceAccount = getServiceAccount();
  initFirebaseAdmin(serviceAccount);
  dbInstance = admin.firestore();

  // Conectar ao Firestore Emulator se configurado
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    // No firebase-admin, usamos settings() para conectar ao emulador
    const [host, port] = emulatorHost.split(':');
    dbInstance.settings({
      host: `${host}:${port}`,
      ssl: false
    });
    console.log(`📦 Firestore conectado ao emulador: ${emulatorHost}`);
  }

  return dbInstance;
}

/**
 * Obtém instância do Auth
 * @returns {Object} Auth instance
 */
function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  const serviceAccount = getServiceAccount();
  initFirebaseAdmin(serviceAccount);
  authInstance = admin.auth();

  // NOTA: Auth Emulator no firebase-admin v12+ não suporta useEmulator() diretamente
  // O usuário de teste é criado via API REST no script bash
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost) {
    console.log(`🔐 Auth: modo emulador detectado (${emulatorHost}) - usuário criado via API REST`);
  }

  return authInstance;
}

/**
 * Wrapper principal que retorna tudo pronto para uso
 * @returns {Object} { admin, db, auth, serviceAccount }
 */
function getFirebaseAdmin() {
  const serviceAccount = getServiceAccount();
  const adminApp = initFirebaseAdmin(serviceAccount);

  return {
    admin: adminApp,
    db: getDb(),
    auth: getAuth(),
    serviceAccount
  };
}

module.exports = {
  getServiceAccount,
  initFirebaseAdmin,
  getDb,
  getAuth,
  getFirebaseAdmin
};
