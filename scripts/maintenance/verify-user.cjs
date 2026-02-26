const admin = require('firebase-admin');

// Inicializa com as credenciais padrão do Firebase
admin.initializeApp({
  projectId: 'fisioflow-migration'
});

const uid = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2';

admin.auth().updateUser(uid, {
  emailVerified: true
}).then(userRecord => {
  console.log('SUCCESS: Email verificado para', userRecord.email);
  console.log('  - emailVerified:', userRecord.emailVerified);
  process.exit(0);
}).catch(error => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
