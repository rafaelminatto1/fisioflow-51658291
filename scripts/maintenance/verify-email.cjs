const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/.firebase/projects/-home-rafael-antigravity-fisioflow-fisioflow-51658291/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2';

admin.auth().updateUser(uid, {
  emailVerified: true
}).then(userRecord => {
  console.log('Email verificado com sucesso:', userRecord.email);
  process.exit(0);
}).catch(error => {
  console.error('Erro ao verificar email:', error);
  process.exit(1);
});
