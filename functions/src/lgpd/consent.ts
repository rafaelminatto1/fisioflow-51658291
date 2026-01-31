/**
 * LGPD Compliance - Consent Management
 *
 * Implementa gerenciamento de consentimento de dados conforme LGPD
 */

import { firestore } from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { CORS_ORIGINS } from '../init';

// Tipos de consentimento LGPD
export enum ConsentType {
  PERSONAL_DATA = 'personal_data',           // Dados pessoais básicos
  HEALTH_DATA = 'health_data',               // Dados de saúde
  CONTACT_DATA = 'contact_data',             // Dados de contato
  FINANCIAL_DATA = 'financial_data',         // Dados financeiros
  BIOMETRIC_DATA = 'biometric_data',         // Dados biométricos
  MARKETING_COMMUNICATIONS = 'marketing',    // Comunicações de marketing
  ANALYTICS = 'analytics',                   // Analytics e estatísticas
}

// Interface para registro de consentimento
export interface ConsentRecord {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  timestamp: firestore.Timestamp;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Versão do documento de política
  purposes: string[]; // Finalidades específicas
}

// Interface para preferências de privacidade do usuário
export interface PrivacyPreferences {
  userId: string;
  consents: Record<ConsentType, ConsentRecord>;
  dataRetentionPolicy: 'strict' | 'standard' | 'extended';
  marketingOptIn: boolean;
  analyticsOptIn: boolean;
  shareWithPartners: boolean;
  updatedAt: firestore.Timestamp;
}

/**
 * Cloud Function: Registrar consentimento do usuário
 */
export const recordConsent = onCall({
  cors: CORS_ORIGINS,
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;
  const { consentType, granted, purposes } = request.data as {
    consentType: ConsentType;
    granted: boolean;
    purposes?: string[];
  };

  // Validar tipo de consentimento
  if (!Object.values(ConsentType).includes(consentType)) {
    throw new HttpsError('invalid-argument', 'Tipo de consentimento inválido');
  }

  // Buscar versão atual da política de privacidade
  const policyDoc = await firestore()
    .collection('settings')
    .doc('privacy_policy')
    .get();

  if (!policyDoc.exists) {
    throw new HttpsError('failed-precondition', 'Política de privacidade não configurada');
  }

  const policyVersion = policyDoc.data()?.version || '1.0';

  // Criar registro de consentimento
  const consentRecord: Partial<ConsentRecord> = {
    userId,
    consentType,
    granted,
    timestamp: firestore.Timestamp.now(),
    version: policyVersion,
    purposes: purposes || [],
  };

  // Salvar registro de consentimento
  await firestore()
    .collection('user_consents')
    .add(consentRecord);

  // Atualizar preferências do usuário
  const preferencesRef = firestore()
    .collection('user_privacy_preferences')
    .doc(userId);

  await preferencesRef.set({
    consents: {
      [consentType]: consentRecord,
    },
    updatedAt: firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Log de auditoria
  await firestore()
    .collection('audit_logs')
    .add({
      action: 'consent_recorded',
      userId,
      consentType,
      granted,
      timestamp: firestore.FieldValue.serverTimestamp(),
      ipAddress: request.rawRequest.ip,
      userAgent: request.rawRequest.headers['user-agent'],
    });

  return { success: true, timestamp: consentRecord.timestamp };
});

/**
 * Cloud Function: Revogar consentimento (direito ao arrependimento)
 */
export const revokeConsent = onCall({
  cors: CORS_ORIGINS,
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;
  const { consentType } = request.data as { consentType: ConsentType };

  // Atualizar registro de consentimento como revogado
  const consentsQuery = await firestore()
    .collection('user_consents')
    .where('userId', '==', userId)
    .where('consentType', '==', consentType)
    .where('granted', '==', true)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  if (!consentsQuery.empty) {
    const doc = consentsQuery.docs[0];
    await doc.ref.update({
      granted: false,
      revokedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  // Log de auditoria
  await firestore()
    .collection('audit_logs')
    .add({
      action: 'consent_revoked',
      userId,
      consentType,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });

  return { success: true };
});

/**
 * Cloud Function: Obter todos os consentimentos do usuário
 */
export const getUserConsents = onCall({
  cors: CORS_ORIGINS,
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;

  const consentsSnapshot = await firestore()
    .collection('user_consents')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .get();

  const consents = consentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { consents };
});

/**
 * Cloud Function: Aceitar todos os termos (onboarding)
 */
export const acceptAllTerms = onCall({
  cors: CORS_ORIGINS,
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;
  const timestamp = firestore.FieldValue.serverTimestamp();

  // Aceitar todos os tipos de consentimento essenciais
  const essentialConsents: ConsentType[] = [
    ConsentType.PERSONAL_DATA,
    ConsentType.CONTACT_DATA,
  ];

  const batch = firestore().batch();

  for (const consentType of essentialConsents) {
    const consentRef = firestore()
      .collection('user_consents')
      .doc();

    batch.set(consentRef, {
      userId,
      consentType,
      granted: true,
      timestamp,
      version: '1.0',
      purposes: ['gerenciamento_conta', 'prestacao_servicos'],
    });
  }

  await batch.commit();

  // Atualizar documento do usuário
  await firestore()
    .collection('users')
    .doc(userId)
    .update({
      termsAcceptedAt: timestamp,
      termsAcceptedVersion: '1.0',
    });

  return { success: true };
});
