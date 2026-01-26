"use strict";
/**
 * LGPD Compliance - Consent Management
 *
 * Implementa gerenciamento de consentimento de dados conforme LGPD
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptAllTerms = exports.getUserConsents = exports.revokeConsent = exports.recordConsent = exports.ConsentType = void 0;
const firebase_admin_1 = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
// Tipos de consentimento LGPD
var ConsentType;
(function (ConsentType) {
    ConsentType["PERSONAL_DATA"] = "personal_data";
    ConsentType["HEALTH_DATA"] = "health_data";
    ConsentType["CONTACT_DATA"] = "contact_data";
    ConsentType["FINANCIAL_DATA"] = "financial_data";
    ConsentType["BIOMETRIC_DATA"] = "biometric_data";
    ConsentType["MARKETING_COMMUNICATIONS"] = "marketing";
    ConsentType["ANALYTICS"] = "analytics";
})(ConsentType || (exports.ConsentType = ConsentType = {}));
/**
 * Cloud Function: Registrar consentimento do usuário
 */
exports.recordConsent = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    const { consentType, granted, purposes } = request.data;
    // Validar tipo de consentimento
    if (!Object.values(ConsentType).includes(consentType)) {
        throw new https_1.HttpsError('invalid-argument', 'Tipo de consentimento inválido');
    }
    // Buscar versão atual da política de privacidade
    const policyDoc = await (0, firebase_admin_1.firestore)()
        .collection('settings')
        .doc('privacy_policy')
        .get();
    if (!policyDoc.exists) {
        throw new https_1.HttpsError('failed-precondition', 'Política de privacidade não configurada');
    }
    const policyVersion = policyDoc.data()?.version || '1.0';
    // Criar registro de consentimento
    const consentRecord = {
        userId,
        consentType,
        granted,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        version: policyVersion,
        purposes: purposes || [],
    };
    // Salvar registro de consentimento
    await (0, firebase_admin_1.firestore)()
        .collection('user_consents')
        .add(consentRecord);
    // Atualizar preferências do usuário
    const preferencesRef = (0, firebase_admin_1.firestore)()
        .collection('user_privacy_preferences')
        .doc(userId);
    await preferencesRef.set({
        consents: {
            [consentType]: consentRecord,
        },
        updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // Log de auditoria
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'consent_recorded',
        userId,
        consentType,
        granted,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        ipAddress: request.rawRequest.ip,
        userAgent: request.rawRequest.headers['user-agent'],
    });
    return { success: true, timestamp: consentRecord.timestamp };
});
/**
 * Cloud Function: Revogar consentimento (direito ao arrependimento)
 */
exports.revokeConsent = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    const { consentType } = request.data;
    // Atualizar registro de consentimento como revogado
    const consentsQuery = await (0, firebase_admin_1.firestore)()
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
            revokedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
    }
    // Log de auditoria
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'consent_revoked',
        userId,
        consentType,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
/**
 * Cloud Function: Obter todos os consentimentos do usuário
 */
exports.getUserConsents = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    const consentsSnapshot = await (0, firebase_admin_1.firestore)()
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
exports.acceptAllTerms = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    const timestamp = firebase_admin_1.firestore.FieldValue.serverTimestamp();
    // Aceitar todos os tipos de consentimento essenciais
    const essentialConsents = [
        ConsentType.PERSONAL_DATA,
        ConsentType.CONTACT_DATA,
    ];
    const batch = (0, firebase_admin_1.firestore)().batch();
    for (const consentType of essentialConsents) {
        const consentRef = (0, firebase_admin_1.firestore)()
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
    await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(userId)
        .update({
        termsAcceptedAt: timestamp,
        termsAcceptedVersion: '1.0',
    });
    return { success: true };
});
//# sourceMappingURL=consent.js.map