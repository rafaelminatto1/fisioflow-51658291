
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Tentar localizar a conta de serviço
const serviceAccountPath = '/home/rafael/antigravity/fisioflow/fisioflow-51658291/fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json';

if (!fs.existsSync(serviceAccountPath)) {
    console.error('Arquivo de conta de serviço não encontrado:', serviceAccountPath);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanInvalidPaths() {
    console.log('Iniciando limpeza de caminhos inválidos no Firestore...');
    
    const exercisesRef = db.collection('exercises');
    const snapshot = await exercisesRef.get();
    
    console.log(`Total de exercícios para analisar: ${snapshot.size}`);
    
    let count = 0;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const updates = {};
        
        ['image_url', 'thumbnail_url', 'imageUrl'].forEach(field => {
            if (data[field] && typeof data[field] === 'string' && (
                data[field].startsWith('/brain/') || 
                data[field].startsWith('/home/') || 
                data[field].startsWith('/tmp/')
            )) {
                console.log(`Limpando campo ${field} no exercício: ${data.name || doc.id} (valor: ${data[field]})`);
                updates[field] = admin.firestore.FieldValue.delete();
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            batch.update(doc.ref, updates);
            count++;
            batchCount++;
            
            // Firestore batch limit is 500
            if (batchCount >= 400) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }
    }
    
    if (batchCount > 0) {
        await batch.commit();
    }
    
    console.log(`
Concluído: ${count} exercícios limpos.`);
    process.exit(0);
}

cleanInvalidPaths().catch(error => {
    console.error('Erro durante a limpeza:', error);
    process.exit(1);
});
