/**
 * Data Retention and TTL Management
 *
 * Gerencia automaticamente a retenção de dados no Firestore para economizar armazenamento
 * Free Tier: 1GB de armazenamento + operações diárias
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { logger } from '../lib/logger';

/**
 * Define TTL (Time To Live) para novos documentos
 * O Firestore tem um recurso nativo de TTL que deleta documentos com base em um campo timestamp.
 */
export const setDocumentTTL = onDocumentWritten(
  {
    document: '{collection}/{docId}',
    region: 'southamerica-east1',
  },
  async (event) => {
    const { collection } = event.params;
    const collectionsWithTTL: Record<string, number> = {
      'logs': 30, // 30 dias
      'notifications': 60, // 60 dias
      'ai_usage_records': 90, // 90 dias
      'feedback_tasks': 30, // 30 dias
    };

    if (!collectionsWithTTL[collection]) return;

    const data = event.data?.after.data();
    if (!data || data.expiresAt) return;

    const days = collectionsWithTTL[collection];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    try {
      await event.data?.after.ref.update({
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      });
    } catch (error) {
      logger.error('[DataRetention] Erro ao definir TTL', { collection, error });
    }
  }
);

/**
 * Limpeza manual para documentos expirados (Fallback para o TTL nativo)
 */
export const deleteExpiredDocuments = onSchedule(
  {
    schedule: '0 3 * * *', // 3 AM diário
    region: 'southamerica-east1',
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const collections = ['logs', 'notifications', 'ai_usage_records'];
    let totalDeleted = 0;

    for (const col of collections) {
      try {
        const snapshot = await db.collection(col)
          .where('expiresAt', '<=', now)
          .limit(500)
          .get();

        if (snapshot.empty) continue;

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        totalDeleted += snapshot.size;
        logger.info(`[DataRetention] Limpeza concluída para ${col}`, { deleted: snapshot.size });
      } catch (error) {
        logger.error(`[DataRetention] Erro ao limpar ${col}`, { error });
      }
    }

    logger.info('[DataRetention] Limpeza diária finalizada', { totalDeleted });
  }
);

export const enforceDataRetention = async () => {};
export const scheduledDataRetention = async () => {};
export const compactLogs = async () => {};
export const getDataRetentionStats = async () => {
  return { status: 'active' };
};
