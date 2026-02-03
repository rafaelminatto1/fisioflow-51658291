/**
 * Lista todos os pacientes do Firestore
 * Uso: node scripts/list-patients.cjs
 */

const { getFirebaseAdmin } = require('./lib/firebase-admin-helper.cjs');

const { db } = getFirebaseAdmin();

db.collection('patients').get().then(snapshot => {
  console.log('📋 Todos os pacientes disponíveis:');
  console.log('Total:', snapshot.size, '\n');
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('ID:', doc.id);
    console.log('Nome:', data.name || data.full_name || 'N/A');
    console.log('Email:', data.email || 'N/A');
    console.log('---');
  });
  process.exit(0);
}).catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
