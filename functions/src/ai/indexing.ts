/**
 * Cloud Functions para Indexação de Embeddings
 *
 * Indexa evoluções existentes para busca semântica
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Criar cliente de autenticação
const authClient = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

/**
 * Gera embedding para um texto SOAP usando Vertex AI REST API
 */
async function generateSOAPEmbedding(evolution: {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}): Promise<number[]> {
  const text = [
    evolution.subjective || '',
    evolution.objective || '',
    evolution.assessment || '',
    evolution.plan || '',
  ].filter(Boolean).join('\n');

  const projectId = process.env.GCP_PROJECT || 'fisioflow-migration';
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-004:predict`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            content: text,
          },
        ],
        parameters: {
          autoTruncate: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI error: ${error}`);
  }

  const data = await response.json() as any;
  return data.predictions[0].embeddings.values;
}

/**
 * Obtém access token para autenticação
 */
async function getAccessToken(): Promise<string> {
  const accessToken = await authClient.getAccessToken();
  return accessToken || '';
}

/**
 * Indexa evoluções sem embedding (roda diariamente às 2 AM)
 */
export const indexExistingEvolutions = onSchedule(
  {
    schedule: '0 2 * * *', // 2 AM diário
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1, // Mínimo 0.5 para memória > 512MiB
    timeoutSeconds: 540, // 9 minutos
  },
  async (event) => {
    logger.info('[Indexing] Iniciando indexação de evoluções');

    const db = admin.firestore();

    try {
      // Buscar evoluções sem embedding
      const snapshot = await db
        .collection('evolutions')
        .where('embedding', '==', null)
        .limit(100)
        .get();

      if (snapshot.empty) {
        logger.info('[Indexing] Nenhuma evolução para indexar');
        return;
      }

      logger.info(`[Indexing] Encontradas ${snapshot.size} evoluções para indexar`);

      let success = 0;
      let failed = 0;
      const batch = db.batch();

      for (const doc of snapshot.docs) {
        try {
          const evolution = doc.data();

          // Gerar embedding
          const embedding = await generateSOAPEmbedding({
            subjective: evolution.subjective,
            objective: evolution.objective,
            assessment: evolution.assessment,
            plan: evolution.plan,
          });

          // Atualizar documento
          const ref = db.collection('evolutions').doc(doc.id);
          batch.update(ref, {
            embedding,
            embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            embeddingVersion: 1,
          });

          success++;
        } catch (error) {
          logger.error(`[Indexing] Erro ao indexar evolução ${doc.id}:`, error);
          failed++;
        }
      }

      // Commit batch (max 500 operações)
      await batch.commit();

      logger.info(`[Indexing] Concluído: ${success} sucessos, ${failed} falhas`);
    } catch (error) {
      logger.error('[Indexing] Erro na indexação:', error);
      throw error;
    }
  }
);

/**
 * Indexa uma evolução específica (callable)
 */
export const indexEvolution = onCall(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
  },
  async (request) => {
    const { evolutionId } = request.data;

    if (!evolutionId) {
      throw new HttpsError('invalid-argument', 'evolutionId is required');
    }

    logger.info(`[Indexing] Indexando evolução ${evolutionId}`);

    const db = admin.firestore();

    try {
      const doc = await db.collection('evolutions').doc(evolutionId).get();

      if (!doc.exists) {
        throw new HttpsError('not-found', 'Evolution not found');
      }

      const evolution = doc.data();
      if (!evolution) {
        throw new HttpsError('not-found', 'Evolution data not found');
      }

      // Gerar embedding
      const embedding = await generateSOAPEmbedding({
        subjective: evolution.subjective,
        objective: evolution.objective,
        assessment: evolution.assessment,
        plan: evolution.plan,
      });

      // Atualizar
      await doc.ref.update({
        embedding,
        embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        embeddingVersion: 1,
      });

      logger.info(`[Indexing] Evolução ${evolutionId} indexada com sucesso`);

      return { success: true };
    } catch (error) {
      logger.error(`[Indexing] Erro ao indexar evolução ${evolutionId}:`, error);
      throw new HttpsError('internal', 'Failed to index evolution');
    }
  }
);

/**
 * Reindexa todas as evoluções de um paciente
 */
export const reindexPatientEvolutions = onCall(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
  },
  async (request) => {
    const { patientId } = request.data;

    if (!patientId) {
      throw new HttpsError('invalid-argument', 'patientId is required');
    }

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    logger.info(`[Indexing] Reindexando evoluções do paciente ${patientId}`);

    const db = admin.firestore();

    try {
      // Buscar evoluções do paciente
      const snapshot = await db
        .collection('evolutions')
        .where('patientId', '==', patientId)
        .get();

      if (snapshot.empty) {
        logger.info(`[Indexing] Nenhuma evolução encontrada para paciente ${patientId}`);
        return { count: 0 };
      }

      logger.info(`[Indexing] Encontradas ${snapshot.size} evoluções`);

      let success = 0;
      let failed = 0;
      const batch = db.batch();

      for (const doc of snapshot.docs) {
        try {
          const evolution = doc.data();

          // Gerar embedding
          const embedding = await generateSOAPEmbedding({
            subjective: evolution.subjective,
            objective: evolution.objective,
            assessment: evolution.assessment,
            plan: evolution.plan,
          });

          // Atualizar
          batch.update(doc.ref, {
            embedding,
            embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            embeddingVersion: 1,
          });

          success++;
        } catch (error) {
          logger.error(`[Indexing] Erro ao indexar ${doc.id}:`, error);
          failed++;
        }
      }

      // Commit
      await batch.commit();

      logger.info(`[Indexing] Reindexação concluída: ${success} sucessos, ${failed} falhas`);

      return { count: success, failed };
    } catch (error) {
      logger.error(`[Indexing] Erro ao reindexar paciente ${patientId}:`, error);
      throw new HttpsError('internal', 'Failed to reindex patient evolutions');
    }
  }
);

/**
 * Remove embedding de uma evolução (quando deletada)
 */
export const removeEvolutionEmbedding = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
  },
  async (request) => {
    const { evolutionId } = request.data;

    if (!evolutionId) {
      throw new HttpsError('invalid-argument', 'evolutionId is required');
    }

    const db = admin.firestore();

    try {
      await db.collection('evolutions').doc(evolutionId).update({
        embedding: null,
        embeddingUpdatedAt: null,
        embeddingVersion: null,
      });

      logger.info(`[Indexing] Embedding removido da evolução ${evolutionId}`);

      return { success: true };
    } catch (error) {
      logger.error(`[Indexing] Erro ao remover embedding ${evolutionId}:`, error);
      throw new HttpsError('internal', 'Failed to remove embedding');
    }
  }
);

/**
 * Trigger automático ao criar evolução
 * NOTA: Para usar, configure o trigger no Firestore
 */
export const onEvolutionCreated = onCall(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
  },
  async (request) => {
    const { evolutionId, evolution } = request.data;

    if (!evolutionId || !evolution) {
      throw new HttpsError('invalid-argument', 'evolutionId and evolution are required');
    }

    logger.info(`[Indexing] Auto-indexando evolução ${evolutionId}`);

    try {
      // Gerar embedding
      const embedding = await generateSOAPEmbedding(evolution);

      const db = admin.firestore();

      // Atualizar
      await db.collection('evolutions').doc(evolutionId).update({
        embedding,
        embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        embeddingVersion: 1,
      });

      logger.info(`[Indexing] Evolução ${evolutionId} auto-indexada`);

      return { success: true };
    } catch (error) {
      logger.error(`[Indexing] Erro ao auto-indexar ${evolutionId}:`, error);
      // Não lança erro para não quebrar a criação da evolução
      return { success: false, error: String(error) };
    }
  }
);

/**
 * Estatísticas de indexação
 */
export const getIndexingStats = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const db = admin.firestore();

    try {
      // Total de evoluções
      const totalSnapshot = await db.collection('evolutions').count().get();
      const total = totalSnapshot.data().count;

      // Evoluções com embedding
      const indexedSnapshot = await db
        .collection('evolutions')
        .where('embedding', '!=', null)
        .count()
        .get();
      const indexed = indexedSnapshot.data().count;

      // Evoluções sem embedding
      const notIndexed = total - indexed;

      // Porcentagem indexada
      const percentage = total > 0 ? (indexed / total) * 100 : 0;

      return {
        total,
        indexed,
        notIndexed,
        percentage: Math.round(percentage * 10) / 10,
      };
    } catch (error) {
      logger.error('[Indexing] Erro ao buscar estatísticas:', error);
      throw new HttpsError('internal', 'Failed to get indexing stats');
    }
  }
);
