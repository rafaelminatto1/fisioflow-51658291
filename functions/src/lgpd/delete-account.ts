/**
 * LGPD Compliance - Data Deletion (Direito ao Esquecimento)
 *
 * Implementa deleção de dados do usuário conforme LGPD Art. 16, II
 *
 * IMPORTANTE: A deleção deve ser feita de forma segura e permanente,
 * mantendo apenas registros mínimos obrigatórios por lei (fiscais, médicos).
 */

import { firestore, auth } from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

/**
 * Níveis de retenção de dados conforme LGPD e leis brasileiras
 */
enum RetentionPolicy {
  IMMEDIATE = 'immediate',           // Deletar imediatamente
  DAYS_30 = '30_days',              // Manter por 30 dias (direito de arrependimento)
  MONTHS_6 = '6_months',            // Manter por 6 meses (contingência)
  YEAR_1 = '1_year',                // Manter por 1 ano (obrigações fiscais básicas)
  YEARS_5 = '5_years',              // Manter por 5 anos (obrigações fiscais completas)
  MEDICAL_INDEFINITE = 'medical',   // Manter indefinidamente (prontuário médico)
}

/**
 * Mapeamento de coleções para política de retenção
 */
const COLLECTION_RETENTION_POLICY: Record<string, RetentionPolicy> = {
  // Dados pessoais - deletar imediatamente após período de graça
  'users': RetentionPolicy.IMMEDIATE,
  'user_privacy_preferences': RetentionPolicy.IMMEDIATE,
  'user_consents': RetentionPolicy.IMMEDIATE,

  // Dados de contato - deletar imediatamente
  'contacts': RetentionPolicy.IMMEDIATE,

  // Agendamentos - 6 meses para contingência
  'appointments': RetentionPolicy.MONTHS_6,

  // Dados financeiros - 5 anos (obrigação fiscal)
  'payments': RetentionPolicy.YEARS_5,
  'vouchers': RetentionPolicy.YEARS_5,
  'invoices': RetentionPolicy.YEARS_5,

  // Prontuário médico - INDEFINIDO (obrigação legal Código de Ética Médica)
  'patients': RetentionPolicy.MEDICAL_INDEFINITE,
  'evolutions': RetentionPolicy.MEDICAL_INDEFINITE,
  'evaluations': RetentionPolicy.MEDICAL_INDEFINITE,
  'medical_records': RetentionPolicy.MEDICAL_INDEFINITE,

  // Planos de exercício - anonimizar após 1 ano
  'exercise_plans': RetentionPolicy.YEAR_1,

  // Notificações - deletar imediatamente
  'notifications': RetentionPolicy.IMMEDIATE,

  // Logs de auditoria - 6 meses
  'audit_logs': RetentionPolicy.MONTHS_6,

  // Uploads de arquivos - 30 dias
  'uploads': RetentionPolicy.DAYS_30,
};

/**
 * Cloud Function: Solicitar deleção de conta (direito ao esquecimento)
 *
 * LGPD Art. 16, II - "a eliminação de dados pessoais tratados com o
 * consentimento do titular"
 *
 * Processo:
 * 1. Marcar conta para deleção
 * 2. Aguardar período de graça de 30 dias (direito de arrependimento)
 * 3. Anonimizar/deletar dados conforme políticas de retenção
 * 4. Manter apenas dados legalmente obrigatórios
 */
export const requestAccountDeletion = onCall({
  region: 'southamerica-east1',
  memory: '512MiB',
  maxInstances: 10,
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;

  // Verificar se já existe solicitação pendente
  const existingRequest = await firestore()
    .collection('deletion_requests')
    .where('userId', '==', userId)
    .where('status', '==', 'pending')
    .get();

  if (!existingRequest.empty) {
    const doc = existingRequest.docs[0];
    const data = doc.data();
    const scheduledDate = new Date(data.scheduledDate);
    const daysRemaining = Math.ceil(
      (scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return {
      success: true,
      status: 'already_scheduled',
      scheduledDate: data.scheduledDate,
      daysRemaining,
      message: `Deleção já agendada para ${scheduledDate.toLocaleDateString('pt-BR')}`,
    };
  }

  // Agendar deleção para 30 dias após (direito de arrependimento)
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 30);

  // Criar solicitação de deleção
  await firestore()
    .collection('deletion_requests')
    .add({
      userId,
      status: 'pending',
      requestedAt: firestore.FieldValue.serverTimestamp(),
      scheduledDate,
      ipAddress: request.rawRequest.ip,
      userAgent: request.rawRequest.headers['user-agent'],
    });

  // Log de auditoria
  await firestore()
    .collection('audit_logs')
    .add({
      action: 'account_deletion_requested',
      userId,
      scheduledDate,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });

  logger.info(`Solicitação de deleção de conta: ${userId}, agendada para ${scheduledDate}`);

  // Enviar email de confirmação (implementar)
  // await sendDeletionConfirmationEmail(userId, scheduledDate);

  return {
    success: true,
    status: 'scheduled',
    scheduledDate: scheduledDate.toISOString(),
    daysRemaining: 30,
    message: `Sua conta será deletada em ${scheduledDate.toLocaleDateString('pt-BR')}. Você pode cancelar a qualquer momento.`,
  };
});

/**
 * Cloud Function: Cancelar solicitação de deleção
 */
export const cancelDeletionRequest = onCall({
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;

  const deletionRequests = await firestore()
    .collection('deletion_requests')
    .where('userId', '==', userId)
    .where('status', '==', 'pending')
    .get();

  if (deletionRequests.empty) {
    throw new HttpsError('not-found', 'Nenhuma solicitação de deleção encontrada');
  }

  const batch = firestore().batch();

  deletionRequests.docs.forEach(doc => {
    batch.update(doc.ref, {
      status: 'cancelled',
      cancelledAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  // Log de auditoria
  await firestore()
    .collection('audit_logs')
    .add({
      action: 'account_deletion_cancelled',
      userId,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });

  return { success: true };
});

/**
 * Cloud Function: Executar deleção de conta (agendada/manual admin)
 *
 * Esta função é chamada automaticamente após o período de 30 dias
 * ou manualmente por um administrador
 */
export const executeAccountDeletion = onCall({
  region: 'southamerica-east1',
  memory: '1GiB',
  maxInstances: 1,
  timeoutSeconds: 540,
  cors: true,
}, async (request) => {
  // Verificar se é admin (para deleção manual)
  if (request.auth) {
    const userDoc = await firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Apenas administradores podem executar esta ação');
    }
  }

  const { userId, forceDelete } = request.data as {
    userId?: string;
    forceDelete?: boolean;
  };

  if (!userId && !forceDelete) {
    throw new HttpsError('invalid-argument', 'userId é obrigatório');
  }

  try {
    // Se for força bruta, buscar todas as solicitações pendentes vencidas
    let usersToDelete: string[] = [];

    if (forceDelete) {
      const pendingRequests = await firestore()
        .collection('deletion_requests')
        .where('status', '==', 'pending')
        .where('scheduledDate', '<=', new Date().toISOString())
        .get();

      usersToDelete = pendingRequests.docs.map(doc => doc.data().userId);
    } else {
      usersToDelete = [userId!];
    }

    logger.info(`Iniciando deleção de ${usersToDelete.length} contas`);

    for (const uid of usersToDelete) {
      await deleteUserData(uid);
    }

    return {
      success: true,
      deletedCount: usersToDelete.length,
    };
  } catch (error) {
    logger.error('Erro ao executar deleção:', error);
    throw new HttpsError('internal', 'Erro ao executar deleção de conta');
  }
});

/**
 * Função auxiliar: Deletar dados do usuário conforme políticas de retenção
 */
async function deleteUserData(userId: string) {
  logger.info(`Processando deleção de dados para usuário: ${userId}`);

  const storage = require('firebase-admin/storage').bucket();
  const batch = firestore().batch();
  const deletedCollections: string[] = [];
  const anonymizedCollections: string[] = [];
  const retainedCollections: string[] = [];

  // 1. Processar cada coleção conforme política de retenção
  for (const [collection, policy] of Object.entries(COLLECTION_RETENTION_POLICY)) {
    const snapshot = await firestore()
      .collection(collection)
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) continue;

    switch (policy) {
      case RetentionPolicy.IMMEDIATE:
        // Deletar imediatamente
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        deletedCollections.push(collection);
        break;

      case RetentionPolicy.DAYS_30:
      case RetentionPolicy.MONTHS_6:
      case RetentionPolicy.YEAR_1:
        // Anonimizar dados (remover identificadores pessoais)
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            userId: 'deleted_user_' + doc.id.substring(0, 8),
            email: null,
            displayName: null,
            phoneNumber: null,
            anonymizedAt: firestore.FieldValue.serverTimestamp(),
          });
        });
        anonymizedCollections.push(collection);
        break;

      case RetentionPolicy.YEARS_5:
        // Marcar para deleção futura, manter dados fiscais
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            userId: 'deleted_user_' + doc.id.substring(0, 8),
            anonymizedAt: firestore.FieldValue.serverTimestamp(),
            markedForDeletion: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
          });
        });
        anonymizedCollections.push(collection);
        break;

      case RetentionPolicy.MEDICAL_INDEFINITE:
        // Prontuário médico: NÃO deletar (obrigação legal)
        // Apenas marcar que o usuário foi deletado
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            userDeleted: true,
            userDeletedAt: firestore.FieldValue.serverTimestamp(),
          });
        });
        retainedCollections.push(collection);
        break;
    }
  }

  // 2. Deletar arquivos do Storage
  const [files] = await storage.getFiles({
    prefix: `users/${userId}/`,
  });

  for (const file of files) {
    await file.delete();
  }

  // 3. Deletar conta do Firebase Auth
  try {
    await auth().deleteUser(userId);
  } catch (error: any) {
    if (error.code !== 'auth/user-not-found') {
      logger.warn(`Erro ao deletar usuário Auth: ${error.message}`);
    }
  }

  // 4. Executar batch
  await batch.commit();

  // 5. Atualizar status da solicitação
  const deletionRequests = await firestore()
    .collection('deletion_requests')
    .where('userId', '==', userId)
    .where('status', '==', 'pending')
    .get();

  for (const doc of deletionRequests.docs) {
    await doc.ref.update({
      status: 'completed',
      completedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  // 6. Log final
  await firestore()
    .collection('audit_logs')
    .add({
      action: 'account_deleted',
      userId,
      deletedCollections,
      anonymizedCollections,
      retainedCollections,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });

  logger.info(`Deleção completada para usuário: ${userId}`, {
    deletedCollections,
    anonymizedCollections,
    retainedCollections,
  });
}
