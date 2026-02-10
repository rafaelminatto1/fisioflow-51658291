const admin = require('firebase-admin');
const { execSync } = require('child_process');
const serviceAccount = require('../functions/service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const project = 'fisioflow-migration';
const location = 'us-central1';

/**
 * Gera embedding usando o comando gcloud CLI (Vertex AI)
 */
async function generateEmbeddingGCloud(text) {
  if (!text) return null;
  
  // Escapar aspas simples para o comando bash
  const escapedText = text.replace(/'/g, "'\\''").replace(/\n/g, ' ');
  
  const command = `curl -s -X POST https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/text-embedding-004:predict \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
      "instances": [
        { "content": "${escapedText}" }
      ]
    }'`;

  try {
    const response = execSync(command).toString();
    const result = JSON.parse(response);
    if (result.predictions && result.predictions[0] && result.predictions[0].embeddings) {
      return result.predictions[0].embeddings.values;
    }
    console.error('Unexpected response format:', response);
    return null;
  } catch (err) {
    console.error('GCloud Embedding error:', err.message);
    return null;
  }
}

async function runClinicalRagSetup() {
  console.log('🚀 Iniciando Configuração de RAG Clínico via GCloud (Vertex AI)...');
  
  const soapRef = db.collection('soap_records');
  const snapshot = await soapRef.get();
  
  console.log(`Total de registros: ${snapshot.size}`);
  
  let success = 0;
  let skipped = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Pular se já tiver embedding (evitar reprocessamento e custo)
    if (data.embedding) {
      skipped++;
      continue;
    }

    const clinicalText = [
      data.subjective,
      data.objective,
      data.assessment,
      data.plan
    ].filter(val => val && typeof val === 'string' && val.trim().length > 5).join('\n\n');
    
    if (!clinicalText || clinicalText.trim().length < 10) {
      continue;
    }
    
    try {
      const embedding = await generateEmbeddingGCloud(clinicalText);
      if (embedding) {
        const updateData = {
          embedding_updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            // Tenta usar o tipo nativo Vector se o SDK permitir
            updateData.embedding = admin.firestore.FieldValue.vector(embedding);
        } catch (e) {
            // Senão salva como array normal (o índice do Firestore cuidará disso)
            updateData.embedding = embedding;
        }

        await doc.ref.update(updateData);
        success++;
        console.log(`[${success}] Embedding gerado com sucesso: ${doc.id}`);
      }
    } catch (e) {
      console.error(`Erro no registro ${doc.id}:`, e.message);
    }
    
    // Pequeno intervalo para não sobrecarregar
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`✅ Finalizado!`);
  console.log(`- Novos embeddings: ${success}`);
  console.log(`- Registros pulados: ${skipped}`);
  process.exit(0);
}

runClinicalRagSetup().catch(console.error);