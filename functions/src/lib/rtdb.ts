
/**
 * Publica atualizações no Firebase Realtime Database
 * Usado para sincronizar estado entre clientes via triggers
 */

import * as admin from 'firebase-admin';
import { logger } from './logger';

export const publishRealtime = async (path: string, data: any) => {
  try {
    const db = admin.database();
    const ref = db.ref(path);
    
    // Adiciona timestamp para garantir que o cliente perceba a mudança
    await ref.set({
      data,
      _timestamp: admin.database.ServerValue.TIMESTAMP
    });
    
    logger.info(`[RTDB] Published to ${path}`);
  } catch (error) {
    logger.error(`[RTDB] Error publishing to ${path}:`, error);
  }
};

/**
 * Helpers específicos de domínio
 */
export const rtdb = {
  // Atualiza a agenda de uma organização
  refreshAppointments: (orgId: string) =>
    publishRealtime(`orgs/${orgId}/agenda/refresh_trigger`, { force: true }),

  // Atualiza a lista de pacientes (V1 - Firestore)
  refreshPatients: (orgId: string) =>
    publishRealtime(`orgs/${orgId}/patients/refresh_trigger`, { force: true }),

  // Atualiza a lista de pacientes (V2 - Postgres)
  refreshPatientsV2: (orgId: string) =>
    publishRealtime(`orgs/${orgId}/patients-v2/refresh_trigger`, { force: true }),

  // Adiciona item ao feed de atividades
  pushActivity: (orgId: string, activity: { type: string; title: string; user: string }) => {
    const db = admin.database();
    return db.ref(`orgs/${orgId}/activity_feed`).push({
      ...activity,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
  }
};
