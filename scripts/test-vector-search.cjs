const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function testVectorSearch() {
  console.log('🔍 Testando Busca Vetorial Semântica...');
  
  const queryText = "paciente com dor lombar e suspeita de hernia de disco";
  console.log(`Query: "${queryText}"`);

  try {
    const { semanticSearchHandler } = require('../functions/lib/ai/semantic-search');
    
    const result = await semanticSearchHandler({
      data: {
        query: queryText,
        limit: 3
      }
    });

    console.log('\n✅ Resultados da Busca:');
    if (result.results && result.results.length > 0) {
      result.results.forEach((res, i) => {
        console.log(`\n[${i+1}] ID: ${res.id}`);
        console.log(`    Subjetivo: ${res.subjective ? res.subjective.substring(0, 80).replace(/\n/g, ' ') + '...' : 'N/A'}`);
        console.log(`    Avaliação: ${res.assessment ? res.assessment.substring(0, 80).replace(/\n/g, ' ') + '...' : 'N/A'}`);
        console.log(`    Distância: ${res.distance}`);
      });
    } else {
      console.log('Nenhum resultado encontrado.');
    }

  } catch (e) {
    console.error('❌ Erro no teste:', e.message);
  }
  
  process.exit(0);
}

testVectorSearch();