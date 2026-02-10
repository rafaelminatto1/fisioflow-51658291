import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Handler para Busca Semântica em registros clínicos
 */
export const semanticSearchHandler = async (request: any) => {
  const { query, limit = 5 } = request.data;

  if (!query) {
    throw new Error('O parâmetro "query" é obrigatório para busca semântica.');
  }

  try {
    // 1. Gerar embedding para a query usando Gemini API
    const API_KEY = process.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error('API_KEY do Gemini não configurada');
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const result = await model.embedContent(query);
    const queryVector = result.embedding.values;

    if (!queryVector || queryVector.length === 0) {
      throw new Error('Não foi possível gerar o vetor de busca.');
    }

    // 2. Realizar busca vetorial no Firestore
    const db = admin.firestore();
    const soapRef = db.collection('soap_records');

    // @ts-ignore - findNearest é um método experimental do Firestore
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
