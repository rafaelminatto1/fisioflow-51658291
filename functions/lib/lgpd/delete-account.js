"use strict";
/**
 * LGPD Compliance - Data Deletion (Direito ao Esquecimento)
 *
 * Implementa deleção de dados do usuário conforme LGPD Art. 16, II
 *
 * IMPORTANTE: A deleção deve ser feita de forma segura e permanente,
 * mantendo apenas registros mínimos obrigatórios por lei (fiscais, médicos).
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
exports.executeAccountDeletion = exports.cancelDeletionRequest = exports.requestAccountDeletion = void 0;
const firebase_admin_1 = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Níveis de retenção de dados conforme LGPD e leis brasileiras
 */
var RetentionPolicy;
(function (RetentionPolicy) {
    RetentionPolicy["IMMEDIATE"] = "immediate";
    RetentionPolicy["DAYS_30"] = "30_days";
    RetentionPolicy["MONTHS_6"] = "6_months";
    RetentionPolicy["YEAR_1"] = "1_year";
    RetentionPolicy["YEARS_5"] = "5_years";
    RetentionPolicy["MEDICAL_INDEFINITE"] = "medical";
})(RetentionPolicy || (RetentionPolicy = {}));
/**
 * Mapeamento de coleções para política de retenção
 */
const COLLECTION_RETENTION_POLICY = {
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
exports.requestAccountDeletion = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    // Verificar se já existe solicitação pendente
    const existingRequest = await (0, firebase_admin_1.firestore)()
        .collection('deletion_requests')
        .where('userId', '==', userId)
        .where('status', '==', 'pending')
        .get();
    if (!existingRequest.empty) {
        const doc = existingRequest.docs[0];
        const data = doc.data();
        const scheduledDate = new Date(data.scheduledDate);
        const daysRemaining = Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
    await (0, firebase_admin_1.firestore)()
        .collection('deletion_requests')
        .add({
        userId,
        status: 'pending',
        requestedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        scheduledDate,
        ipAddress: request.rawRequest.ip,
        userAgent: request.rawRequest.headers['user-agent'],
    });
    // Log de auditoria
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'account_deletion_requested',
        userId,
        scheduledDate,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
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
exports.cancelDeletionRequest = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    const deletionRequests = await (0, firebase_admin_1.firestore)()
        .collection('deletion_requests')
        .where('userId', '==', userId)
        .where('status', '==', 'pending')
        .get();
    if (deletionRequests.empty) {
        throw new https_1.HttpsError('not-found', 'Nenhuma solicitação de deleção encontrada');
    }
    const batch = (0, firebase_admin_1.firestore)().batch();
    deletionRequests.docs.forEach(doc => {
        batch.update(doc.ref, {
            status: 'cancelled',
            cancelledAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
    // Log de auditoria
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'account_deletion_cancelled',
        userId,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
/**
 * Cloud Function: Executar deleção de conta (agendada/manual admin)
 *
 * Esta função é chamada automaticamente após o período de 30 dias
 * ou manualmente por um administrador
 */
exports.executeAccountDeletion = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '1GiB',
    maxInstances: 1,
    timeoutSeconds: 540,
    cors: true,
}, async (request) => {
    // Verificar se é admin (para deleção manual)
    if (request.auth) {
        const userDoc = await (0, firebase_admin_1.firestore)()
            .collection('users')
            .doc(request.auth.uid)
            .get();
        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Apenas administradores podem executar esta ação');
        }
    }
    const { userId, forceDelete } = request.data;
    if (!userId && !forceDelete) {
        throw new https_1.HttpsError('invalid-argument', 'userId é obrigatório');
    }
    try {
        // Se for força bruta, buscar todas as solicitações pendentes vencidas
        let usersToDelete = [];
        if (forceDelete) {
            const pendingRequests = await (0, firebase_admin_1.firestore)()
                .collection('deletion_requests')
                .where('status', '==', 'pending')
                .where('scheduledDate', '<=', new Date().toISOString())
                .get();
            usersToDelete = pendingRequests.docs.map(doc => doc.data().userId);
        }
        else {
            usersToDelete = [userId];
        }
        logger.info(`Iniciando deleção de ${usersToDelete.length} contas`);
        for (const uid of usersToDelete) {
            await deleteUserData(uid);
        }
        return {
            success: true,
            deletedCount: usersToDelete.length,
        };
    }
    catch (error) {
        logger.error('Erro ao executar deleção:', error);
        throw new https_1.HttpsError('internal', 'Erro ao executar deleção de conta');
    }
});
/**
 * Função auxiliar: Deletar dados do usuário conforme políticas de retenção
 */
async function deleteUserData(userId) {
    logger.info(`Processando deleção de dados para usuário: ${userId}`);
    const storage = require('firebase-admin/storage').bucket();
    const batch = (0, firebase_admin_1.firestore)().batch();
    const deletedCollections = [];
    const anonymizedCollections = [];
    const retainedCollections = [];
    // 1. Processar cada coleção conforme política de retenção
    for (const [collection, policy] of Object.entries(COLLECTION_RETENTION_POLICY)) {
        const snapshot = await (0, firebase_admin_1.firestore)()
            .collection(collection)
            .where('userId', '==', userId)
            .get();
        if (snapshot.empty)
            continue;
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
                        anonymizedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    });
                });
                anonymizedCollections.push(collection);
                break;
            case RetentionPolicy.YEARS_5:
                // Marcar para deleção futura, manter dados fiscais
                snapshot.docs.forEach(doc => {
                    batch.update(doc.ref, {
                        userId: 'deleted_user_' + doc.id.substring(0, 8),
                        anonymizedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
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
                        userDeletedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
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
        await (0, firebase_admin_1.auth)().deleteUser(userId);
    }
    catch (error) {
        if (error.code !== 'auth/user-not-found') {
            logger.warn(`Erro ao deletar usuário Auth: ${error.message}`);
        }
    }
    // 4. Executar batch
    await batch.commit();
    // 5. Atualizar status da solicitação
    const deletionRequests = await (0, firebase_admin_1.firestore)()
        .collection('deletion_requests')
        .where('userId', '==', userId)
        .where('status', '==', 'pending')
        .get();
    for (const doc of deletionRequests.docs) {
        await doc.ref.update({
            status: 'completed',
            completedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
    }
    // 6. Log final
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'account_deleted',
        userId,
        deletedCollections,
        anonymizedCollections,
        retainedCollections,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`Deleção completada para usuário: ${userId}`, {
        deletedCollections,
        anonymizedCollections,
        retainedCollections,
    });
}
//# sourceMappingURL=delete-account.js.map