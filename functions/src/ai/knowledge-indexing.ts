/**
 * Indexacao e busca semantica da base de conhecimento
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';

if (!admin.apps.length) {
  admin.initializeApp();
}

const authClient = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getAccessToken(): Promise<string> {
  const accessToken = await authClient.getAccessToken();
  return accessToken || '';
}

async function generateEmbedding(content: string): Promise<number[]> {
  const projectId = process.env.GCP_PROJECT || 'fisioflow-migration';
  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-004:predict`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ content }],
        parameters: { autoTruncate: true },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI error: ${error}`);
  }

  const data = (await response.json()) as any;
  return data.predictions[0].embeddings.values;
}

function buildEmbeddingText(article: Record<string, any>): string {
  return [
    article.title,
    article.group,
    article.subgroup,
    ...(Array.isArray(article.focus) ? article.focus : []),
    ...(Array.isArray(article.highlights) ? article.highlights : []),
    ...(Array.isArray(article.observations) ? article.observations : []),
    ...(Array.isArray(article.tags) ? article.tags : []),
  ]
    .filter(Boolean)
    .join('\n');
}

async function indexArticleDoc(docSnap: admin.firestore.QueryDocumentSnapshot) {
  const data = docSnap.data();
  const text = buildEmbeddingText(data);

  if (!text || text.trim().length < 12) {
    return false;
  }

  const embedding = await generateEmbedding(text);
  const updateData: Record<string, unknown> = {
    embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    embeddingVersion: 1,
  };

  try {
    updateData.embedding = admin.firestore.FieldValue.vector(embedding);
  } catch (error) {
    updateData.embedding = embedding;
  }

  await docSnap.ref.update(updateData);
  return true;
}

export const indexKnowledgeArticles = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async (request) => {
    const { organizationId } = request.data;
    if (!organizationId) {
      throw new HttpsError('invalid-argument', 'organizationId is required');
    }

    const db = admin.firestore();
    const snapshot = await db
      .collection('knowledge_articles')
      .where('organization_id', '==', organizationId)
      .get();

    if (snapshot.empty) {
      return { indexed: 0 };
    }

    let indexed = 0;
    for (const docSnap of snapshot.docs) {
      try {
        const updated = await indexArticleDoc(docSnap);
        if (updated) indexed++;
      } catch (error) {
        logger.error(`[KnowledgeIndex] erro ao indexar ${docSnap.id}`, error as Error);
      }
    }

    return { indexed };
  }
);

export const indexKnowledgeArticlesScheduled = onSchedule(
  {
    schedule: '0 3 * * *',
    region: 'southamerica-east1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = admin.firestore();
    const snapshot = await db
      .collection('knowledge_articles')
      .where('embedding', '==', null)
      .limit(200)
      .get();

    if (snapshot.empty) {
      logger.info('[KnowledgeIndex] Nenhum artigo para indexar');
      return;
    }

    let indexed = 0;
    for (const docSnap of snapshot.docs) {
      try {
        const updated = await indexArticleDoc(docSnap);
        if (updated) indexed++;
      } catch (error) {
        logger.error(`[KnowledgeIndex] erro ao indexar ${docSnap.id}`, error as Error);
      }
    }

    logger.info(`[KnowledgeIndex] indexacao concluida: ${indexed}`);
  }
);

export const semanticSearchKnowledge = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    const { query, organizationId, limit = 20 } = request.data as {
      query?: string;
      organizationId?: string;
      limit?: number;
    };

    if (!query || !organizationId) {
      throw new HttpsError('invalid-argument', 'query and organizationId are required');
    }

    const db = admin.firestore();
    const snapshot = await db
      .collection('knowledge_articles')
      .where('organization_id', '==', organizationId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const queryEmbedding = await generateEmbedding(query);
    const scores: Array<{ article_id: string; score: number }> = [];

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const embedding = data.embedding as number[] | undefined;
      if (!embedding || !Array.isArray(embedding)) return;
      let score = 0;
      for (let i = 0; i < Math.min(embedding.length, queryEmbedding.length); i += 1) {
        score += embedding[i] * queryEmbedding[i];
      }
      scores.push({ article_id: data.article_id, score });
    });

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(limit, 50)));
  }
);
