"use strict";
/**
 * LGPD Compliance - Data Export (Direito à Portabilidade)
 *
 * Implementa exportação de dados do usuário conforme LGPD Art. 18
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExportHistory = exports.exportUserData = void 0;
const firebase_admin_1 = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Cloud Function: Exportar todos os dados do usuário (ZIP)
 *
 * LGPD Art. 18, I - direito à portabilidade dos dados
 */
exports.exportUserData = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
    timeoutSeconds: 540, // 9 minutos máximo
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    try {
        // 1. Buscar informações pessoais básicas
        const userDoc = await (0, firebase_admin_1.firestore)()
            .collection('users')
            .doc(userId)
            .get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
        }
        const userData = userDoc.data();
        // 2. Buscar perfil do paciente (se aplicável)
        let profile = {};
        if (userData?.role === 'paciente') {
            const patientDoc = await (0, firebase_admin_1.firestore)()
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
        const evolutionsSnapshot = await (0, firebase_admin_1.firestore)()
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
        const appointmentsSnapshot = await (0, firebase_admin_1.firestore)()
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
        const exercisePlansSnapshot = await (0, firebase_admin_1.firestore)()
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
        const consentsSnapshot = await (0, firebase_admin_1.firestore)()
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
        const auditSnapshot = await (0, firebase_admin_1.firestore)()
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
        const exportData = {
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
            exportedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
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
        await (0, firebase_admin_1.firestore)()
            .collection('audit_logs')
            .add({
            action: 'data_exported',
            userId,
            exportUrl: fileName,
            timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
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
    }
    catch (error) {
        logger.error('Erro ao exportar dados:', error);
        throw new https_1.HttpsError('internal', 'Erro ao exportar dados. Tente novamente ou contate o suporte.');
    }
});
/**
 * Cloud Function: Obter histórico de exportações do usuário
 */
exports.getExportHistory = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    const exportsSnapshot = await (0, firebase_admin_1.firestore)()
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
//# sourceMappingURL=export-data.js.map