import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

const project = process.env.GCLOUD_PROJECT || 'fisioflow-migration';
const location = 'us-central1';

/**
 * Handler para Busca Semântica em registros clínicos
 */
export const semanticSearchHandler = async (request: any) => {
  const { query, limit = 5 } = request.data;

  if (!query) {
    throw new Error('O parâmetro "query" é obrigatório para busca semântica.');
  }

  try {
    // 1. Gerar embedding para a query via Vertex AI
    const vertexAI = new VertexAI({ project, location });
    
    // Tentando obter o modelo de forma estável
    const generativeModel: any = vertexAI.preview.getGenerativeModel({
      model: 'text-embedding-004',
    });

    let queryVector;
    
    try {
        // Sintaxe SDK Vertex AI
        const embeddingResult = await generativeModel.embedContent({
            content: { role: 'user', parts: [{ text: query }] },
        });
        queryVector = embeddingResult.embeddings[0].values;
    } catch (err) {
        // Fallback manual se o SDK falhar no método
        console.log('Falling back to direct model access...');
        const modelInstance = vertexAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await (modelInstance as any).embedContent({
            content: { parts: [{ text: query }] },
        });
        queryVector = result.embeddings[0].values;
    }

    if (!queryVector) throw new Error('Não foi possível gerar o vetor de busca.');

    // 2. Realizar busca vetorial no Firestore
    const db = admin.firestore();
    const soapRef = db.collection('soap_records');
    
    const vectorQuery = soapRef.findNearest({
      vectorField: 'embedding',
      queryVector: queryVector,
      limit: limit,
      distanceMeasure: 'COSINE'
    });

    const snapshot = await vectorQuery.get();
    
    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      const { embedding, ...rest } = data;
      return {
        id: doc.id,
        ...rest,
        distance: (doc as any).distance ?? null
      };
    });

    return {
      success: true,
      query,
      resultsCount: results.length,
      results
    };

  } catch (error: any) {
    console.error('[semanticSearchHandler] Error:', error);
    throw new Error(`Falha na busca semântica: ${error.message}`);
  }
};