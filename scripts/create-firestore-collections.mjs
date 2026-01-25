/**
 * Script para criar coleções no Firebase Firestore
 * Usa as mesmas credenciais do frontend (variáveis de ambiente)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuração do Firebase (mesma do frontend)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.projectId) {
  console.error('❌ VITE_FIREBASE_PROJECT_ID não encontrado no .env');
  process.exit(1);
}

console.log('🔥 Firebase Project ID:', firebaseConfig.projectId);

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Coleções a serem criadas
const COLLECTIONS = [
  // Críticas para "Iniciar Atendimento"
  { name: 'patients', desc: 'Dados dos pacientes' },
  { name: 'appointments', desc: 'Agendamentos' },
  { name: 'soap_records', desc: 'Registros SOAP (Evolução)' },
  { name: 'treatment_sessions', desc: 'Sessões de tratamento' },
  { name: 'patient_goals', desc: 'Objetivos dos pacientes' },
  { name: 'patient_surgeries', desc: 'Cirurgias dos pacientes' },
  { name: 'patient_pathologies', desc: 'Patologias dos pacientes' },
  { name: 'evolution_measurements', desc: 'Medições de evolução' },

  // Gamificação
  { name: 'patient_gamification', desc: 'Perfis de gamificação' },
  { name: 'daily_quests', desc: 'Missões diárias' },
  { name: 'achievements', desc: 'Conquistas disponíveis' },
  { name: 'achievements_log', desc: 'Conquistas desbloqueadas' },
  { name: 'xp_transactions', desc: 'Transações de XP' },
  { name: 'shop_items', desc: 'Itens da loja' },
  { name: 'user_inventory', desc: 'Inventário dos usuários' },

  // Outras
  { name: 'eventos', desc: 'Eventos financeiros' },
  { name: 'medical_records', desc: 'Prontuários médicos' },
  { name: 'prescribed_exercises', desc: 'Exercícios prescritos' },
  { name: 'notifications', desc: 'Notificações' },
];

async function createCollection(col) {
  try {
    // Criar documento _init para criar a coleção
    const initRef = doc(db, col.name, '_init');
    await setDoc(initRef, {
      _init: true,
      description: col.desc,
      created_at: new Date().toISOString(),
    });
    console.log(`✅ ${col.name} - ${col.desc}`);
    return true;
  } catch (e) {
    console.log(`⚠️  ${col.name} - Erro: ${e.message}`);
    return false;
  }
}

async function deleteInitDoc(colName) {
  try {
    // Para deletar, precisamos importar deleteDoc
    const { deleteDoc } = await import('firebase/firestore');
    const initRef = doc(db, colName, '_init');
    await deleteDoc(initRef);
    console.log(`   🧹 ${colName}`);
  } catch (e) {
    // Ignorar erros na limpeza
  }
}

async function main() {
  console.log('\n📁 Criando coleções no Firebase Firestore...\n');

  const results = {
    created: [],
    failed: [],
  };

  for (const col of COLLECTIONS) {
    const created = await createCollection(col);
    if (created) {
      results.created.push(col.name);
    } else {
      results.failed.push(col.name);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Criadas: ${results.created.length}`);
  console.log(`❌ Falharam: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nColeções que falharam:');
    results.failed.forEach(name => console.log(`  - ${name}`));
  }

  // Limpar documentos _init
  if (results.created.length > 0) {
    console.log('\n🧹 Limpando documentos de inicialização...');
    for (const name of results.created) {
      await deleteInitDoc(name);
    }
  }

  console.log('\n✅ Concluído!\n');
}

main().catch(console.error);
