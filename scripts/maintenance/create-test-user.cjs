const admin = require('firebase-admin');

// Tenta inicializar com diferentes fontes de credenciais
try {
  admin.initializeApp({
    projectId: 'fisioflow-migration'
  });
} catch (e) {
  console.log('Init error (ignoring):', e.message);
}

const testEmail = 'test.user+' + Date.now() + '@example.com';
const testPassword = 'Test123456@';

admin.auth().createUser({
  email: testEmail,
  emailVerified: true,
  password: testPassword
})
.then(userRecord => {
  console.log('USER_CREATED:');
  console.log('  Email:', userRecord.email);
  console.log('  UID:', userRecord.uid);
  console.log('  Password:', testPassword);
  process.exit(0);
})
.catch(error => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
