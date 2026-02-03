/**
 * Firebase Admin Helper para Scripts
 *
 * Carrega a credencial do Firebase Admin SDK a partir de:
 * 1. Variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)
 * 2. Variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY_PATH (caminho do arquivo)
 * 3. Caminho padrão: ../functions/service-account-key.json
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

/**
 * Obtém a credencial de conta de serviço Firebase
 * @returns {Object} Service account credentials
 */
function getServiceAccount() {
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
      'Ou coloque o arquivo em: ' + defaultPath
    );
  }

  return require(defaultPath);
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

  // Inicializar novo app
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

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

  return dbInstance;
}

/**
 * Obtém instância do Auth
 * @returns {Object} Auth instance
 */
function getAuth() {
  const serviceAccount = getServiceAccount();
  initFirebaseAdmin(serviceAccount);
  return admin.auth();
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
