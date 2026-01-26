"use strict";
/**
 * Realtime Publisher: Ably
 * Publica eventos em tempo real usando Ably
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
exports.ABLY_EVENTS = exports.ABLY_CHANNELS = exports.realtimePublish = void 0;
exports.publishAppointmentEvent = publishAppointmentEvent;
exports.publishPatientEvent = publishPatientEvent;
exports.publishPatientUpdate = publishPatientUpdate;
exports.publishNotification = publishNotification;
exports.publishPresence = publishPresence;
exports.createAblyRealtimeClient = createAblyRealtimeClient;
exports.subscribeToOrganizationChannels = subscribeToOrganizationChannels;
const Ably = __importStar(require("ably"));
// Cliente Ably REST (para publicação do servidor)
let ablyRest = null;
function getAblyRest() {
    if (!ablyRest) {
        const apiKey = process.env.ABLY_API_KEY;
        if (!apiKey) {
            throw new Error('ABLY_API_KEY não está configurada');
        }
        ablyRest = new Ably.Rest(apiKey);
    }
    return ablyRest;
}
/**
 * Publica evento de agendamento no Ably
 *
 * @param organizationId - ID da organização
 * @param message - Mensagem do evento
 */
async function publishAppointmentEvent(organizationId, message) {
    const ably = getAblyRest();
    const channel = ably.channels.get(`appointments:${organizationId}`);
    await channel.publish('update', message);
}
/**
 * Publica evento de paciente no Ably
 *
 * @param organizationId - ID da organização
 * @param message - Mensagem do evento
 */
async function publishPatientEvent(organizationId, message) {
    const ably = getAblyRest();
    const channel = ably.channels.get(`patients:${organizationId}`);
    await channel.publish('update', message);
}
/**
 * Publica atualização de paciente específico
 *
 * @param patientId - ID do paciente
 * @param message - Mensagem do evento
 */
async function publishPatientUpdate(patientId, message) {
    const ably = getAblyRest();
    const channel = ably.channels.get(`patient:${patientId}`);
    await channel.publish('update', message);
}
/**
 * Publica notificação para usuário
 *
 * @param userId - ID do usuário Firebase
 * @param notification - Dados da notificação
 */
async function publishNotification(userId, notification) {
    const ably = getAblyRest();
    const channel = ably.channels.get(`user:${userId}`);
    await channel.publish('notification', notification);
}
/**
 * Publica atualização de presença
 *
 * @param organizationId - ID da organização
 * @param presence - Dados de presença
 */
async function publishPresence(organizationId, presence) {
    const ably = getAblyRest();
    const channel = ably.channels.get(`presence:${organizationId}`);
    await channel.publish('presence', presence);
}
const https_1 = require("firebase-functions/v2/https");
/**
 * HTTP endpoint para publicar mensagens (útil para testes e webhooks)
 */
exports.realtimePublish = (0, https_1.onRequest)(async (req, res) => {
    // Verificar autenticação (opcional - pode usar Firebase Auth)
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const { channel, event, data } = req.body || {};
        if (!channel || !event || data === undefined) {
            res.status(400).json({ error: 'channel, event e data são obrigatórios' });
            return;
        }
        const ably = getAblyRest();
        const ablyChannel = ably.channels.get(channel);
        await ablyChannel.publish(event, data);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao publicar no Ably:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: errorMessage });
    }
});
/**
 * Configuração de canais Ably para o FisioFlow
 */
exports.ABLY_CHANNELS = {
    /** Atualizações de agendamentos da organização */
    appointments: (orgId) => `appointments:${orgId}`,
    /** Atualizações de pacientes da organização */
    patients: (orgId) => `patients:${orgId}`,
    /** Atualizações de um paciente específico */
    patient: (patientId) => `patient:${patientId}`,
    /** Presença de usuários da organização */
    presence: (orgId) => `presence:${orgId}`,
    /** Notificações de um usuário */
    user: (userId) => `user:${userId}`,
    /** Estatísticas da organização (atualizadas em tempo real) */
    stats: (orgId) => `stats:${orgId}`,
    /** Fila de espera da organização */
    waitingQueue: (orgId) => `waiting-queue:${orgId}`,
};
/**
 * Eventos publicados no Ably
 */
exports.ABLY_EVENTS = {
    /** Atualização de registro (INSERT, UPDATE, DELETE) */
    update: 'update',
    /** Nova entrada */
    insert: 'insert',
    /** Remoção */
    delete: 'delete',
    /** Notificação */
    notification: 'notification',
    /** Atualização de presença */
    presence: 'presence',
    /** Status alterado */
    statusChanged: 'status-changed',
    /** Nova mensagem */
    newMessage: 'new-message',
};
/**
 * Inicializa o Ably Realtime para conexões bidirecionais
 * (usado no frontend, não no backend)
 */
function createAblyRealtimeClient(apiKey) {
    return new Ably.Realtime(apiKey);
}
/**
 * Conecta aos canais relevantes para uma organização
 *
 * @param client - Cliente Ably Realtime
 * @param organizationId - ID da organização
 * @param callbacks - Callbacks para cada tipo de evento
 */
function subscribeToOrganizationChannels(client, organizationId, callbacks) {
    const unsubscribers = [];
    // Agendamentos
    if (callbacks.onAppointmentUpdate) {
        const appointmentsChannel = client.channels.get(exports.ABLY_CHANNELS.appointments(organizationId));
        appointmentsChannel.subscribe(exports.ABLY_EVENTS.update, (message) => {
            callbacks.onAppointmentUpdate?.(message.data);
        });
        unsubscribers.push(() => appointmentsChannel.unsubscribe());
    }
    // Pacientes
    if (callbacks.onPatientUpdate) {
        const patientsChannel = client.channels.get(exports.ABLY_CHANNELS.patients(organizationId));
        patientsChannel.subscribe(exports.ABLY_EVENTS.update, (message) => {
            callbacks.onPatientUpdate?.(message.data);
        });
        unsubscribers.push(() => patientsChannel.unsubscribe());
    }
    // Notificações
    if (callbacks.onNotification) {
        const userChannel = client.channels.get(exports.ABLY_CHANNELS.user(client.auth.clientId || ''));
        userChannel.subscribe(exports.ABLY_EVENTS.notification, (message) => {
            callbacks.onNotification?.(message.data);
        });
        unsubscribers.push(() => userChannel.unsubscribe());
    }
    // Presença
    if (callbacks.onPresence) {
        const presenceChannel = client.channels.get(exports.ABLY_CHANNELS.presence(organizationId));
        presenceChannel.subscribe(exports.ABLY_EVENTS.presence, (message) => {
            callbacks.onPresence?.(message.data);
        });
        unsubscribers.push(() => presenceChannel.unsubscribe());
    }
    // Retorna função para limpar todas as inscrições
    return () => {
        unsubscribers.forEach((unsub) => unsub());
    };
}
//# sourceMappingURL=publisher.js.map