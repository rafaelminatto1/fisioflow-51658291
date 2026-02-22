#!/usr/bin/env node

/**
 * Script de Teste - Sistema de Protocolos
 * 
 * Testa a integração com Firestore e verifica se:
 * - Índices estão criados
 * - Regras de segurança estão ativas
 * - Operações CRUD funcionam corretamente
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp 
} = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Configuração do Firebase (usar as mesmas credenciais do app)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBxxx", // Substitua com sua chave
  authDomain: "fisioflow-migration.firebaseapp.com",
  projectId: "fisioflow-migration",
  storageBucket: "fisioflow-migration.appspot.com",
  messagingSenderId: "412418905255",
  appId: "1:412418905255:web:xxx" // Substitua com seu app ID
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let testProtocolId = null;
let testPatientProtocolId = null;

async function runTests() {
  log('\n🧪 Iniciando Testes do Sistema de Protocolos\n', 'cyan');
  
  try {
    // 1. Testar Autenticação
    info('1. Testando autenticação...');
    const email = process.env.TEST_EMAIL || 'rafael.minatto@yahoo.com.br';
    const password = process.env.TEST_PASSWORD || 'Yukari30@';
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      success(`Autenticado como: ${userCredential.user.email}`);
    } catch (err) {
      error(`Falha na autenticação: ${err.message}`);
      warning('Configure as variáveis TEST_EMAIL e TEST_PASSWORD');
      return;
    }

    // 2. Testar Criação de Protocolo
    info('\n2. Testando criação de protocolo...');
    try {
      const protocolData = {
        name: 'Protocolo de Teste Automatizado',
        description: 'Criado pelo script de teste',
        category: 'Ortopedia',
        condition: 'Teste',
        exercises: [
          {
            exerciseId: 'test1',
            sets: 3,
            reps: 15,
            order: 1,
            frequency: 'Diário'
          }
        ],
        professionalId: auth.currentUser.uid,
        isTemplate: false,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'treatment_protocols'), protocolData);
      testProtocolId = docRef.id;
      success(`Protocolo criado com ID: ${testProtocolId}`);
    } catch (err) {
      error(`Falha ao criar protocolo: ${err.message}`);
      if (err.code === 'permission-denied') {
        warning('Verifique as regras de segurança no Firebase Console');
      }
      return;
    }

    // 3. Testar Listagem com Índice
    info('\n3. Testando listagem de protocolos (com índice)...');
    try {
      const q = query(
        collection(db, 'treatment_protocols'),
        where('professionalId', '==', auth.currentUser.uid),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      success(`Encontrados ${snapshot.size} protocolos`);
      
      if (snapshot.size === 0) {
        warning('Nenhum protocolo encontrado. Isso pode ser normal se for a primeira execução.');
      }
    } catch (err) {
      error(`Falha ao listar protocolos: ${err.message}`);
      if (err.code === 'failed-precondition') {
        warning('Índice ainda não foi criado. Aguarde 2-5 minutos e tente novamente.');
        warning('Ou acesse: https://console.firebase.google.com/project/fisioflow-migration/firestore/indexes');
      }
      return;
    }

    // 4. Testar Atualização
    info('\n4. Testando atualização de protocolo...');
    try {
      const protocolRef = doc(db, 'treatment_protocols', testProtocolId);
      await updateDoc(protocolRef, {
        name: 'Protocolo de Teste Atualizado',
        updatedAt: serverTimestamp()
      });
      success('Protocolo atualizado com sucesso');
    } catch (err) {
      error(`Falha ao atualizar protocolo: ${err.message}`);
      return;
    }

    // 5. Testar Aplicação a Paciente
    info('\n5. Testando aplicação de protocolo a paciente...');
    try {
      const patientProtocolData = {
        patientId: 'test-patient-id',
        protocolId: testProtocolId,
        professionalId: auth.currentUser.uid,
        startDate: serverTimestamp(),
        isActive: true,
        progress: 0,
        notes: 'Teste automatizado',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'patient_protocols'), patientProtocolData);
      testPatientProtocolId = docRef.id;
      success(`Protocolo aplicado com ID: ${testPatientProtocolId}`);
    } catch (err) {
      error(`Falha ao aplicar protocolo: ${err.message}`);
      return;
    }

    // 6. Testar Listagem de Protocolos do Paciente
    info('\n6. Testando listagem de protocolos do paciente...');
    try {
      const q = query(
        collection(db, 'patient_protocols'),
        where('patientId', '==', 'test-patient-id'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      success(`Encontrados ${snapshot.size} protocolos do paciente`);
    } catch (err) {
      error(`Falha ao listar protocolos do paciente: ${err.message}`);
      if (err.code === 'failed-precondition') {
        warning('Índice ainda não foi criado. Aguarde 2-5 minutos e tente novamente.');
      }
      return;
    }

    // 7. Testar Exclusão (Soft Delete)
    info('\n7. Testando exclusão de protocolo (soft delete)...');
    try {
      const protocolRef = doc(db, 'treatment_protocols', testProtocolId);
      await updateDoc(protocolRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
      success('Protocolo excluído (soft delete) com sucesso');
    } catch (err) {
      error(`Falha ao excluir protocolo: ${err.message}`);
      return;
    }

    // 8. Limpar Dados de Teste
    info('\n8. Limpando dados de teste...');
    try {
      // Excluir protocolo de teste
      if (testProtocolId) {
        await deleteDoc(doc(db, 'treatment_protocols', testProtocolId));
        success('Protocolo de teste removido');
      }

      // Excluir protocolo do paciente de teste
      if (testPatientProtocolId) {
        await deleteDoc(doc(db, 'patient_protocols', testPatientProtocolId));
        success('Protocolo do paciente removido');
      }
    } catch (err) {
      warning(`Aviso ao limpar dados: ${err.message}`);
    }

    // Resumo Final
    log('\n' + '='.repeat(50), 'cyan');
    log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO!', 'green');
    log('='.repeat(50) + '\n', 'cyan');

    info('Próximos passos:');
    console.log('  1. Teste manualmente no app mobile');
    console.log('  2. Verifique os dados no Firebase Console');
    console.log('  3. Monitore o uso e performance');
    console.log('');

  } catch (err) {
    error(`\nErro inesperado: ${err.message}`);
    console.error(err);
  }
}

// Executar testes
runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  error(`Erro fatal: ${err.message}`);
  process.exit(1);
});
