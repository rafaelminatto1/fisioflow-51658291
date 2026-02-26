const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'fisioflow-migration'
});

const uid = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2';

admin.auth().createCustomToken(uid)
  .then(customToken => {
    console.log('CUSTOM_TOKEN:', customToken);
    process.exit(0);
  })
  .catch(error => {
    console.error('ERROR:', error.message);
    process.exit(1);
  });
