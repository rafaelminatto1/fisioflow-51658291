const admin = require('firebase-admin');
const fs = require('fs');

// Load service account
let serviceAccount;
try {
  serviceAccount = require('./functions/service-account-key.json');
} catch (e) {
  console.error('Could not load service account file:', e.message);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'fisioflow-migration'
  });
} catch (e) {
  console.log('Init error (ignoring):', e.message);
}

const testEmail = 'paciente@moocafisio.com.br';
const testPassword = 'teste123';

console.log('Checking/creating test user:', testEmail);

// First try to get the user
admin.auth().getUserByEmail(testEmail)
  .then(userRecord => {
    console.log('USER_EXISTS:');
    console.log('  Email:', userRecord.email);
    console.log('  UID:', userRecord.uid);
    console.log('  Email Verified:', userRecord.emailVerified);
    console.log('  Disabled:', userRecord.disabled);
    console.log('  Password:', testPassword);
    console.log('\nUser exists and should be able to login.');
    process.exit(0);
  })
  .catch(error => {
    if (error.code === 'auth/user-not-found') {
      console.log('User not found. Creating...');

      return admin.auth().createUser({
        email: testEmail,
        emailVerified: true,
        password: testPassword
      });
    } else {
      throw error;
    }
  })
  .then(userRecord => {
    if (userRecord) {
      console.log('USER_CREATED:');
      console.log('  Email:', userRecord.email);
      console.log('  UID:', userRecord.uid);
      console.log('  Email Verified:', userRecord.emailVerified);
      console.log('  Password:', testPassword);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('ERROR:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  });
