import * as admin from 'firebase-admin';
import { logger } from '../lib/logger';

/**
 * Publicador de Eventos em Tempo Real via Firebase Realtime Database
 */
export const publishToRTDB = async (organizationId: string, path: string, data: any) => {
  try {
    const db = admin.database();
    const ref = db.ref(`orgs/${organizationId}/${path}`);
    
    // Atualiza o estado e adiciona um timestamp para forçar o trigger no frontend
    await ref.set({
      ...data,
      _updatedAt: admin.database.ServerValue.TIMESTAMP
    });
    
    logger.info(`[RTDB] Event published to orgs/${organizationId}/${path}`);
  } catch (error) {
    logger.error(`[RTDB] Error publishing to path ${path}:`, error);
  }
};

// Helpers específicos para o FisioFlow
export const realtime = {
  syncAppointment: (orgId: string, appointment: any) => 
    publishToRTDB(orgId, 'last_appointment_change', appointment),
    
  syncActivity: (orgId: string, activity: any) => 
    publishToRTDB(orgId, 'activity_feed', activity),
    
  syncPatient: (orgId: string, patientId: string, data: any) => 
    publishToRTDB(orgId, `patients/${patientId}`, data)
};
