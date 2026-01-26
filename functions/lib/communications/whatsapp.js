"use strict";
/**
 * WhatsApp Business API Integration
 *
 * Integração com WhatsApp Cloud API para envio de mensagens
 *
 * @module communications/whatsapp
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
exports.whatsappWebhookHttp = exports.sendWhatsAppExerciseAssigned = exports.sendWhatsAppCustomMessage = exports.sendWhatsAppWelcome = exports.sendWhatsAppAppointmentReminder = exports.sendWhatsAppAppointmentConfirmation = exports.WhatsAppTemplate = void 0;
exports.isValidWhatsAppPhone = isValidWhatsAppPhone;
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = require("firebase-admin");
const logger = __importStar(require("firebase-functions/logger"));
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
/**
 * Templates de WhatsApp aprovados
 */
var WhatsAppTemplate;
(function (WhatsAppTemplate) {
    WhatsAppTemplate["APPOINTMENT_CONFIRMATION"] = "appointment_confirmation";
    WhatsAppTemplate["APPOINTMENT_REMINDER"] = "appointment_reminder_24h";
    WhatsAppTemplate["APPOINTMENT_REMINDER_1H"] = "appointment_reminder_1h";
    WhatsAppTemplate["WELCOME"] = "welcome_message";
    WhatsAppTemplate["PAYMENT_CONFIRMATION"] = "payment_confirmation";
    WhatsAppTemplate["EXERCISE_ASSIGNED"] = "exercise_assigned";
})(WhatsAppTemplate || (exports.WhatsAppTemplate = WhatsAppTemplate = {}));
/**
 * Cloud Function: Enviar confirmação de agendamento via WhatsApp
 */
exports.sendWhatsAppAppointmentConfirmation = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Não autenticado');
    }
    const { patientId, appointmentId } = request.data;
    // Buscar dados do paciente
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    const patient = patientDoc.data();
    if (!patient?.phone) {
        throw new https_1.HttpsError('failed-precondition', 'Paciente não tem telefone cadastrado');
    }
    // Buscar dados do agendamento
    const appointmentDoc = await (0, firebase_admin_1.firestore)()
        .collection('appointments')
        .doc(appointmentId)
        .get();
    if (!appointmentDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
    }
    const appointment = appointmentDoc.data();
    // Formatar data e hora
    const date = new Date(appointment?.date);
    const formattedDate = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    // Formatar telefone para o formato do WhatsApp
    const whatsappPhone = formatPhoneForWhatsApp(patient?.phone);
    // Enviar mensagem template
    await sendWhatsAppTemplateMessage({
        to: whatsappPhone,
        template: WhatsAppTemplate.APPOINTMENT_CONFIRMATION,
        language: 'pt_BR',
        components: [
            {
                type: 'body',
                parameters: [
                    { type: 'text', text: patient?.fullName || patient?.name },
                    { type: 'text', text: formattedDate },
                    { type: 'text', text: appointment?.startTime },
                ],
            },
        ],
    });
    return { success: true };
});
/**
 * Cloud Function: Enviar lembrete de agendamento (24h antes)
 */
exports.sendWhatsAppAppointmentReminder = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    const { patientId, appointmentId } = request.data;
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    const patient = patientDoc.data();
    if (!patient?.phone) {
        logger.info(`Patient ${patientId} has no phone, skipping WhatsApp reminder`);
        return { skipped: true, reason: 'no_phone' };
    }
    const appointmentDoc = await (0, firebase_admin_1.firestore)()
        .collection('appointments')
        .doc(appointmentId)
        .get();
    if (!appointmentDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
    }
    const appointment = appointmentDoc.data();
    const date = new Date(appointment?.date);
    const formattedDate = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
    });
    const whatsappPhone = formatPhoneForWhatsApp(patient?.phone);
    await sendWhatsAppTemplateMessage({
        to: whatsappPhone,
        template: WhatsAppTemplate.APPOINTMENT_REMINDER,
        language: 'pt_BR',
        components: [
            {
                type: 'body',
                parameters: [
                    { type: 'text', text: patient?.fullName || patient?.name },
                    { type: 'text', text: formattedDate },
                    { type: 'text', text: appointment?.startTime },
                ],
            },
        ],
    });
    return { success: true };
});
/**
 * Cloud Function: Enviar mensagem de boas-vindas
 */
exports.sendWhatsAppWelcome = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    const { userId } = request.data;
    const userDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(userId)
        .get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
    }
    const user = userDoc.data();
    if (!user?.phoneNumber) {
        return { skipped: true, reason: 'no_phone' };
    }
    const whatsappPhone = formatPhoneForWhatsApp(user?.phoneNumber);
    await sendWhatsAppTemplateMessage({
        to: whatsappPhone,
        template: WhatsAppTemplate.WELCOME,
        language: 'pt_BR',
        components: [
            {
                type: 'body',
                parameters: [
                    { type: 'text', text: user?.displayName || user?.fullName },
                ],
            },
        ],
    });
    return { success: true };
});
/**
 * Cloud Function: Enviar mensagem personalizada
 */
exports.sendWhatsAppCustomMessage = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Não autenticado');
    }
    const { to, message } = request.data;
    // Verificar permissões (apenas admin e profissionais)
    const userDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(request.auth.uid)
        .get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
    }
    const role = userDoc.data()?.role;
    if (!['admin', 'fisioterapeuta', 'estagiario'].includes(role)) {
        throw new https_1.HttpsError('permission-denied', 'Sem permissão para enviar mensagens');
    }
    // Formatar telefone
    const whatsappPhone = formatPhoneForWhatsApp(to);
    await sendWhatsAppTextMessage({
        to: whatsappPhone,
        message,
    });
    return { success: true };
});
/**
 * Cloud Function: Enviar notificação de exercício atribuído
 */
exports.sendWhatsAppExerciseAssigned = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    const { patientId, planName, exercisesCount } = request.data;
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    const patient = patientDoc.data();
    if (!patient?.phone) {
        return { skipped: true, reason: 'no_phone' };
    }
    const whatsappPhone = formatPhoneForWhatsApp(patient?.phone);
    await sendWhatsAppTemplateMessage({
        to: whatsappPhone,
        template: WhatsAppTemplate.EXERCISE_ASSIGNED,
        language: 'pt_BR',
        components: [
            {
                type: 'body',
                parameters: [
                    { type: 'text', text: patient?.fullName || patient?.name },
                    { type: 'text', text: planName },
                    { type: 'text', text: String(exercisesCount) },
                ],
            },
        ],
    });
    return { success: true };
});
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Envia mensagem template do WhatsApp
 */
async function sendWhatsAppTemplateMessage(params) {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    const payload = {
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'template',
        template: {
            name: params.template,
            language: { code: params.language },
            components: params.components || [],
        },
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const error = await response.text();
        logger.error(`WhatsApp API error: ${error}`);
        throw new Error(`WhatsApp API error: ${error}`);
    }
    const result = await response.json();
    logger.info(`WhatsApp template sent: ${result.messages[0].id}`);
    return result;
}
/**
 * Envia mensagem de texto personalizada do WhatsApp
 */
async function sendWhatsAppTextMessage(params) {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    const payload = {
        messaging_product: 'whatsapp',
        to: params.to,
        type: 'text',
        text: {
            body: params.message,
        },
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const error = await response.text();
        logger.error(`WhatsApp API error: ${error}`);
        throw new Error(`WhatsApp API error: ${error}`);
    }
    const result = await response.json();
    logger.info(`WhatsApp text sent: ${result.messages[0].id}`);
    return result;
}
/**
 * Formata número de telefone para o formato do WhatsApp
 * Converte various formats para: 55DDDDDDDDD
 */
function formatPhoneForWhatsApp(phone) {
    // Remover todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    // Se começar com 0 (DDDD), remover
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    // Se não tiver código do país (55), adicionar
    if (cleaned.length === 10 || cleaned.length === 11) {
        cleaned = '55' + cleaned;
    }
    // Remover dígito 9 extra se tiver (para número padrão)
    if (cleaned.length === 13 && cleaned.startsWith('551')) {
        cleaned = cleaned.substring(0, 12) + cleaned.substring(13);
    }
    return cleaned;
}
/**
 * Verifica se um número de telefone está válido
 */
function isValidWhatsAppPhone(phone) {
    const formatted = formatPhoneForWhatsApp(phone);
    // Deve ter código do país (55) + DDD (2 dígitos) + número (8-9 dígitos)
    return /^55\d{10,11}$/.test(formatted);
}
/**
 * HTTP Endpoint para webhook do WhatsApp (opcional)
 * Usado para receber mensagens e status updates dos usuários
 */
exports.whatsappWebhookHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request, response) => {
    // Verificar token de verificação do WhatsApp
    const mode = request.query['hub.mode'];
    const challenge = request.query['hub.challenge'];
    const verifyToken = request.query['hub.verify_token'];
    if (mode && verifyToken) {
        if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
            logger.info('WhatsApp webhook verified');
            return response.status(200).send(challenge);
        }
        return response.status(403).send('Forbidden');
    }
    // Processar webhook
    try {
        const body = request.body;
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'messages') {
                        const changeValue = change.value;
                        if (changeValue.messages && changeValue.messages.length > 0) {
                            const message = changeValue.messages[0];
                            // Processar mensagem recebida
                            await handleIncomingWhatsAppMessage(message);
                        }
                    }
                    else if (change.field === 'messaging_statuses') {
                        // Processar atualização de status da mensagem
                        const statuses = change.value.statuses;
                        if (statuses && statuses.length > 0) {
                            await handleWhatsAppMessageStatus(statuses[0]);
                        }
                    }
                }
            }
        }
        return response.status(200).json({ received: true });
    }
    catch (error) {
        logger.error('WhatsApp webhook error:', error);
        return response.status(500).json({ error: 'Erro ao processar webhook' });
    }
});
/**
 * Processa mensagem recebida do WhatsApp
 */
async function handleIncomingWhatsAppMessage(message) {
    logger.info('Received WhatsApp message:', message);
    const from = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;
    const type = message.type;
    // Buscar usuário por telefone
    const phone = from.replace(/\D/g, '').replace(/^55/, '');
    const patientsSnapshot = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .where('phone', '==', phone)
        .get();
    if (patientsSnapshot.empty) {
        logger.info(`No patient found for phone: ${phone}`);
        return;
    }
    const patient = patientsSnapshot.docs[0].data();
    if (type === 'text') {
        const text = message.text.body;
        // Salvar mensagem recebida
        await (0, firebase_admin_1.firestore)()
            .collection('whatsapp_messages')
            .add({
            from,
            to: PHONE_NUMBER_ID,
            messageId,
            type: 'text',
            text,
            timestamp: new Date(parseInt(timestamp) * 1000),
            patientId: patientsSnapshot.docs[0].id,
            read: false,
            createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
        // Responder automaticamente se necessário
        await handleAutoReply(from, text, patient);
    }
}
/**
 * Processa atualização de status de mensagem
 */
async function handleWhatsAppMessageStatus(status) {
    logger.info('WhatsApp message status update:', status);
    const { id, status: messageStatus } = status;
    // Atualizar status da mensagem no Firestore
    const messagesSnapshot = await (0, firebase_admin_1.firestore)()
        .collection('whatsapp_messages')
        .where('messageId', '==', id)
        .get();
    if (!messagesSnapshot.empty) {
        await messagesSnapshot.docs[0].ref.update({
            status: messageStatus,
            statusUpdatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
    }
}
/**
 * Resposta automática a mensagens recebidas
 */
async function handleAutoReply(from, text, patient) {
    const lowerText = text.toLowerCase();
    let replyMessage = '';
    if (lowerText.includes('agendar') || lowerText.includes('horário')) {
        replyMessage = `Olá ${patient?.fullName || 'Paciente'}! Para agendar uma sessão, você pode:\n\n1. Acessar: ${process.env.PUBLIC_URL}/agenda\n2. Ou responder esta mensagem com a data desejada.`;
    }
    else if (lowerText.includes('cancelar')) {
        replyMessage = 'Para cancelar ou remarcar um agendamento, por favor entre em contato pelo telefone ou acesse o site.';
    }
    else if (lowerText.includes('exercício') || lowerText.includes('exercicio')) {
        replyMessage = `Seus exercícios estão disponíveis em: ${process.env.PUBLIC_URL}/exercises`;
    }
    else {
        replyMessage = `Obrigado pela mensagem, ${patient?.fullName || 'Paciente'}! Em breve retornaremos o contato.`;
    }
    if (replyMessage) {
        await sendWhatsAppTextMessage({
            to: from,
            message: replyMessage,
        });
    }
}
//# sourceMappingURL=whatsapp.js.map