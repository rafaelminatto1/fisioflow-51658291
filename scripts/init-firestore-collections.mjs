/**
 * Script para inicializar coleções do Firebase Firestore
 * Cria as coleções necessárias para o FisioFlow
 */

import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuração do Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
let serviceAccount;

// Resolver caminho relativo para absoluto
const resolvedKeyPath = serviceAccountPath && serviceAccountPath.startsWith('./')
  ? path.join(__dirname, '..', serviceAccountPath)
  : serviceAccountPath;

if (resolvedKeyPath && fs.existsSync(resolvedKeyPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, 'utf8'));
  console.log('✅ Service account key carregada:', resolvedKeyPath);
} else {
  console.error('❌ Service account key não encontrada em:', resolvedKeyPath);
  // Tentar usar variáveis de ambiente individuais
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('❌ FIREBASE_PROJECT_ID não encontrado');
    process.exit(1);
  }

  serviceAccount = {
    projectId,
    // Para desenvolvimento, podemos usar credenciais padrão
  };
}

// Inicializar Firebase Admin
try {
  if (serviceAccount.private_key) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin inicializado com service account');
  } else {
    // Usar Application Default Credentials
    admin.initializeApp({
      projectId: serviceAccount.project_id
    });
    console.log('⚠️  Firebase Admin inicializado sem credenciais explícitas');
  }
} catch (e) {
  console.error('❌ Erro ao inicializar Firebase Admin:', e.message);
  console.error('Detalhes:', e);
  process.exit(1);
}

const db = admin.firestore();

// Coleções necessárias para o FisioFlow
const COLLECTIONS = {
  // Coleções críticas para "Iniciar Atendimento"
  patients: {
    description: 'Dados dos pacientes',
    indexes: [
      { fields: ['created_at'], order: 'desc' },
      { fields: ['therapist_id'] },
    ]
  },
  appointments: {
    description: 'Agendamentos',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['therapist_id'] },
      { fields: ['appointment_date'], order: 'desc' },
      { fields: ['status'] },
    ]
  },
  soap_records: {
    description: 'Registros SOAP (Evolução)',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['therapist_id'] },
      { fields: ['created_at'], order: 'desc' },
    ]
  },
  treatment_sessions: {
    description: 'Sessões de tratamento',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['appointment_id'] },
      { fields: ['session_date'], order: 'desc' },
    ]
  },
  patient_goals: {
    description: 'Objetivos dos pacientes',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['created_at'], order: 'desc' },
    ]
  },
  patient_surgeries: {
    description: 'Cirurgias dos pacientes',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['surgery_date'], order: 'desc' },
    ]
  },
  patient_pathologies: {
    description: 'Patologias dos pacientes',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['created_at'], order: 'desc' },
    ]
  },
  evolution_measurements: {
    description: 'Medições de evolução',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['measured_at'], order: 'desc' },
    ]
  },

  // Gamificação
  patient_gamification: {
    description: 'Perfis de gamificação dos pacientes',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['total_points'], order: 'desc' },
    ]
  },
  daily_quests: {
    description: 'Missões diárias',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['date'] },
    ]
  },
  achievements: {
    description: 'Conquistas disponíveis',
    indexes: [
      { fields: ['is_active'] },
    ]
  },
  achievements_log: {
    description: 'Conquistas desbloqueadas',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['unlocked_at'], order: 'desc' },
    ]
  },
  xp_transactions: {
    description: 'Transações de XP',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['created_at'], order: 'desc' },
    ]
  },
  shop_items: {
    description: 'Itens da loja',
    indexes: [
      { fields: ['is_active'] },
      { fields: ['cost'], order: 'asc' },
    ]
  },
  user_inventory: {
    description: 'Inventário dos usuários',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['item_id'] },
    ]
  },

  // Outras coleções importantes
  profiles: {
    description: 'Perfis de usuários',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['role'] },
    ]
  },
  eventos: {
    description: 'Eventos financeiros',
    indexes: [
      { fields: ['created_at'], order: 'desc' },
    ]
  },
  medical_records: {
    description: 'Prontuários médicos',
    indexes: [
      { fields: ['patient_id'] },
    ]
  },
  prescribed_exercises: {
    description: 'Exercícios prescritos',
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['prescribed_at'], order: 'desc' },
    ]
  },
  notifications: {
    description: 'Notificações',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['read'] },
      { fields: ['created_at'], order: 'desc' },
    ]
  },
};

async function initCollection(collectionName, config) {
  try {
    // Criar um documento dummy para criar a coleção
    const dummyRef = db.collection(collectionName).doc('_init');
    await dummyRef.set({
      _init: true,
      created_at: new Date().toISOString(),
      description: config.description,
    });
    console.log(`✅ ${collectionName} - ${config.description}`);
    return true;
  } catch (e) {
    console.log(`⚠️  ${collectionName} - Erro: ${e.message}`);
    return false;
  }
}

async function verifyCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).limit(1).get();
    return !snapshot.empty;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('🔥 Inicializando coleções do Firebase Firestore\n');
  console.log('Projeto:', serviceAccount.project_id || serviceAccount.projectId);
  console.log('');

  const results = {
    created: [],
    existing: [],
    failed: [],
  };

  for (const [name, config] of Object.entries(COLLECTIONS)) {
    const exists = await verifyCollection(name);

    if (exists) {
      console.log(`📁 ${name} - Já existe (${config.description})`);
      results.existing.push(name);
    } else {
      const created = await initCollection(name, config);
      if (created) {
        results.created.push(name);
      } else {
        results.failed.push(name);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO');
  console.log('='.repeat(60));
  console.log(`✅ Criadas: ${results.created.length}`);
  console.log(`📁 Já existiam: ${results.existing.length}`);
  console.log(`❌ Falharam: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nColeções que falharam:');
    results.failed.forEach(name => console.log(`  - ${name}`));
  }

  // Limpar documentos _init
  console.log('\n🧹 Limpando documentos de inicialização...');
  for (const name of results.created) {
    try {
      await db.collection(name).doc('_init').delete();
      console.log(`   ✅ ${name}`);
    } catch (e) {
      console.log(`   ⚠️  ${name}: ${e.message}`);
    }
  }

  console.log('\n✅ Inicialização concluída!');
}

main().catch(console.error);
