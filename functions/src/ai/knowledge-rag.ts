import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import { logger } from 'firebase-functions';

// Interface for the Vertex AI Embedding response
interface EmbeddingResponse {
  predictions: {
    embeddings: {
      values: number[];
    };
  }[];
}

const authClient = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getAccessToken(): Promise<string> {
  const token = await authClient.getAccessToken();
  return token || '';
}

async function generateEmbedding(text: string): Promise<number[]> {
  const projectId = process.env.GCP_PROJECT || admin.instanceId().app.options.projectId;
  const accessToken = await getAccessToken();
  const location = 'us-central1';
  const modelId = 'text-embedding-004';

  const response = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ content: text, task_type: 'RETRIEVAL_DOCUMENT' }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Vertex AI Embedding Error: ${response.statusText}`);
  }

  const data = await response.json() as EmbeddingResponse;
  return data.predictions[0].embeddings.values;
}

async function generateAnswer(context: string, query: string): Promise<string> {
  const projectId = process.env.GCP_PROJECT || admin.instanceId().app.options.projectId;
  const accessToken = await getAccessToken();
  const location = 'us-central1';
  const modelId = 'gemini-1.5-flash-001'; // Using Flash for speed/cost

  const prompt = `
    Você é um assistente clínico especializado em fisioterapia baseada em evidências.
    Use o contexto abaixo (extraído de um artigo científico ou diretriz clínica) para responder à pergunta do usuário.
    
    Se a resposta não estiver no contexto, diga que não encontrou a informação no documento fornecido.
    Cite a seção ou página se possível (ex: "Segundo a seção de Métodos...").
    
    Contexto:
    ${context}
    
    Pergunta:
    ${query}
  `;

  const response = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui gerar uma resposta.";
}

/**
 * Process a PDF Artifact (Mocked PDF Parsing for now)
 * In a real scenario, this would use 'pdf-parse' to extract text from Storage
 */
export const processArtifact = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (request) => {
    const { artifactId, textContent } = request.data;
    
    if (!artifactId) {
      throw new HttpsError('invalid-argument', 'artifactId is required');
    }

    // In a real implementation, we would download the file from Storage here.
    // For this prototype, we accept 'textContent' directly or use a placeholder if empty.
    const text = textContent || "Conteúdo simulado do artigo para fins de demonstração.";
    
    // Simple chunking strategy (e.g., by paragraph or fixed size)
    const chunks = text.match(/[\s\S]{1,1000}/g) || [text];
    
    const db = admin.firestore();
    const batch = db.batch();
    const chunksRef = db.collection(`knowledge_articles/${artifactId}/chunks`);

    // Process chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      try {
        const embedding = await generateEmbedding(chunkText);
        const docRef = chunksRef.doc();
        batch.set(docRef, {
          text: chunkText,
          embedding: admin.firestore.FieldValue.vector(embedding),
          index: i,
          artifactId
        });
      } catch (err) {
        logger.error(`Error embedding chunk ${i}`, err);
      }
    }

    await batch.commit();
    
    // Update artifact status
    await db.doc(`knowledge_articles/${artifactId}`).update({
      vectorStatus: 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, chunksProcessed: chunks.length };
  }
);

/**
 * Query an Artifact using RAG
 */
export const queryArtifact = onCall(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
  },
  async (request) => {
    const { artifactId, query } = request.data;
    
    if (!artifactId || !query) {
      throw new HttpsError('invalid-argument', 'artifactId and query are required');
    }

    const db = admin.firestore();
    
    // 1. Embed Query
    const queryEmbedding = await generateEmbedding(query);
    
    // 2. Vector Search (Brute force for now, efficient for single document)
    // For a single document with < 100 chunks, in-memory cosine similarity is extremely fast.
    const chunksSnapshot = await db.collection(`knowledge_articles/${artifactId}/chunks`).get();
    
    if (chunksSnapshot.empty) {
        // Fallback if not indexed
        return { answer: "Este documento ainda não foi processado para busca inteligente." };
    }

    const scoredChunks = chunksSnapshot.docs.map(doc => {
      const data = doc.data();
      const embedding = data.embedding.toArray(); // Firestore Vector to array
      
      // Cosine Similarity
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < embedding.length; i++) {
        dotProduct += embedding[i] * queryEmbedding[i];
        normA += embedding[i] ** 2;
        normB += queryEmbedding[i] ** 2;
      }
      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      
      return { text: data.text, score: similarity };
    });

    // Top 3 chunks
    const topChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(c => c.text)
      .join('\n\n');

    // 3. Generate Answer
    const answer = await generateAnswer(topChunks, query);

    return { answer, contextUsed: topChunks };
  }
);
