const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/.config/firebase-tools/fisioflow-migration-firebase-adminsdk-xxx.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fisioflow-migration'
});

const db = admin.firestore();

async function checkPatients() {
  console.log('Checking patients in Firestore...');
  const snapshot = await db.collection('patients').get();
  
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }  

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(doc.id, '=>', {
      name: data.name,
      organizationId: data.organizationId || data.organization_id,
      status: data.status,
      active: data.active
    });
  });
}

checkPatients();
