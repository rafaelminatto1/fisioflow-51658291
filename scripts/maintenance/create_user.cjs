const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/.config/firebase-tools/fisioflow-migration-firebase-adminsdk-xxx.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fisioflow-migration'
});

const auth = admin.auth();

async function createUser() {
  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: 'rafael.minatto@yahoo.com.br',
      password: 'Yukari30@',
      emailVerified: true,
    });

    console.log('✓ Firebase Auth user created:', userRecord.uid);

    // Add user to Firestore
    const db = admin.firestore();
    const userData = {
      uid: userRecord.uid,
      email: 'rafael.minatto@yahoo.com.br',
      nome: 'Rafael Minatto',
      nomeCompleto: 'Rafael Minatto',
      displayName: 'Rafael Minatto',
      tipoUsuario: 'fisioterapeuta',
      role: 'fisioterapeuta',
      roles: ['fisioterapeuta', 'admin'],
      ativo: true,
      status: 'ativo',
      aprovado: true,
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('usuarios').doc(userRecord.uid).set(userData);
    console.log('✓ Firestore document created for:', userRecord.uid);

    console.log('\n✓ User created successfully!');
    console.log('Email: rafael.minatto@yahoo.com.br');
    console.log('Password: Yukari30@');
    console.log('UID:', userRecord.uid);

    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser();
