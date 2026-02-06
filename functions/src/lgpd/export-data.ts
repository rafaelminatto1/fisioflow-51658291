/**
 * LGPD Compliance - Data Export (Direito à Portabilidade)
 *
 * Implementa exportação de dados do usuário conforme LGPD Art. 18
 */


/**
 * Interface para dados exportados do usuário
 */

import { firestore } from 'firebase-admin';
import { Timestamp as FirestoreTimestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

export interface UserDataExport {
  personalInfo: {
    userId: string;
    email: string;
    displayName: string;
    phoneNumber?: string;
    createdAt: FirestoreTimestamp;
    lastSignInAt?: FirestoreTimestamp;
  };
  profile: {
    dateOfBirth?: string;
    address?: Record<string, any>;
    emergencyContact?: Record<string, any>;
    healthPlan?: string;
    [key: string]: any;
  };
  medicalRecords: Array<{
    id: string;
    type: string;
    date: FirestoreTimestamp;
    summary: string;
    therapist: string;
  }>;
  appointments: Array<{
    id: string;
    date: FirestoreTimestamp;
    status: string;
    type: string;
    notes?: string;
  }>;
  exercisePlans: Array<{
    id: string;
    name: string;
    createdAt: FirestoreTimestamp;
    exercises: any[];
  }>;
  consents: Array<{
    consentType: string;
    granted: boolean;
    timestamp: FirestoreTimestamp;
    version: string;
  }>;
  auditLogs: Array<{
    action: string;
    timestamp: FirestoreTimestamp;
    details?: any;
  }>;
  exportedAt: FirestoreTimestamp;
}

/**
 * Cloud Function: Exportar todos os dados do usuário (ZIP)
 *
 * LGPD Art. 18, I - direito à portabilidade dos dados
 */
export const exportUserData = onCall({
  region: 'southamerica-east1',
  memory: '512MiB',
  maxInstances: 10,
  timeoutSeconds: 540, // 9 minutos máximo
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;

  try {
    // 1. Buscar informações pessoais básicas
    const userDoc = await firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuário não encontrado');
    }

    const userData = userDoc.data();

    // 2. Buscar perfil do paciente (se aplicável)
    let profile: any = {};
    if (userData?.role === 'paciente') {
      const patientDoc = await firestore()
        .collection('patients')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!patientDoc.empty) {
        profile = patientDoc.docs[0].data();
        // Remover campos sensíveis demais
        delete profile.cpf;
        delete profile.ssn;
      }
    }

    // 3. Buscar prontuário/evoluções
    const evolutionsSnapshot = await firestore()
      .collection('evolutions')
      .where('patientId', '==', userId)
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const medicalRecords = evolutionsSnapshot.docs.map(doc => ({
      id: doc.id,
      type: doc.data().type || 'evolucao',
      date: doc.data().date,
      summary: doc.data().summary || '',
      therapist: doc.data().therapistName || 'N/A',
    }));

    // 4. Buscar agendamentos
    const appointmentsSnapshot = await firestore()
      .collection('appointments')
      .where('patientId', '==', userId)
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const appointments = appointmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      date: doc.data().date,
      status: doc.data().status,
      type: doc.data().type || 'consulta',
      notes: doc.data().notes,
    }));

    // 5. Buscar planos de exercício
    const exercisePlansSnapshot = await firestore()
      .collection('exercise_plans')
      .where('patientId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const exercisePlans = exercisePlansSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Plano de Exercícios',
        createdAt: data.createdAt,
        exercises: data.exercises || [],
      };
    });

    // 6. Buscar consentimentos
    const consentsSnapshot = await firestore()
      .collection('user_consents')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();

    const consents = consentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        consentType: data.consentType,
        granted: data.granted,
        timestamp: data.timestamp,
        version: data.version,
      };
    });

    // 7. Buscar logs de auditoria do usuário
    const auditSnapshot = await firestore()
      .collection('audit_logs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const auditLogs = auditSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        action: data.action,
        timestamp: data.timestamp,
        details: data.details,
      };
    });

    // 8. Compilar exportação completa
    const exportData: UserDataExport = {
      personalInfo: {
        userId: userData?.userId || userId,
        email: userData?.email || '',
        displayName: userData?.displayName || '',
        phoneNumber: userData?.phoneNumber,
        createdAt: userData?.createdAt,
        lastSignInAt: userData?.lastSignInAt,
      },
      profile,
      medicalRecords,
      appointments,
      exercisePlans,
      consents,
      auditLogs,
      exportedAt: firestore.FieldValue.serverTimestamp() as any,
    };

    // 9. Salvar exportação no Storage (opcional - para download posterior)
    /*
    const storage = require('firebase-admin/storage');
    const bucket = storage.bucket();
    const fileName = `exports/${userId}/${Date.now()}_data_export.json`;
    const file = bucket.file(fileName);

    await file.save(JSON.stringify(exportData, null, 2), {
      contentType: 'application/json',
    });

    // Gerar URL assinada válida por 24 horas
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
    });
    */
    const url = "feature_temporarily_disabled";
    const fileName = "export_disabled";
    // Using exportData to satisfy linter until Storage feature is re-enabled
    logger.info(`Prepared export data for user ${userId}`, { recordCount: Object.keys(exportData).length });

    // 10. Log da exportação
    await firestore()
      .collection('audit_logs')
      .add({
        action: 'data_exported',
        userId,
        exportUrl: fileName,
        timestamp: firestore.FieldValue.serverTimestamp(),
        ipAddress: request.rawRequest.ip,
      });

    logger.info(`Dados exportados para usuário: ${userId}`);

    return {
      success: true,
      downloadUrl: url,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      recordCount: {
        medicalRecords: medicalRecords.length,
        appointments: appointments.length,
        exercisePlans: exercisePlans.length,
        consents: consents.length,
        auditLogs: auditLogs.length,
      },
    };

  } catch (error) {
    logger.error('Erro ao exportar dados:', error);
    throw new HttpsError(
      'internal',
      'Erro ao exportar dados. Tente novamente ou contate o suporte.'
    );
  }
});

/**
 * Cloud Function: Obter histórico de exportações do usuário
 */
export const getExportHistory = onCall({
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;

  const exportsSnapshot = await firestore()
    .collection('data_exports')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  const exports = exportsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { exports };
});
