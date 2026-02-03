const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();

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
