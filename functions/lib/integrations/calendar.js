"use strict";
/**
 * Google Calendar Integration
 *
 * Sincronização de agendamentos com Google Calendar
 *
 * @module integrations/calendar
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
exports.getGoogleAuthUrl = exports.disconnectGoogleCalendar = exports.connectGoogleCalendar = exports.exportToICal = exports.syncToGoogleCalendar = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = require("firebase-admin");
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const logger = __importStar(require("firebase-functions/logger"));
// Configuração do Google Calendar
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
/**
 * Cloud Function: Sincronizar agendamento com Google Calendar
 */
exports.syncToGoogleCalendar = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { appointmentId, action = 'create' } = request.data;
    // Buscar agendamento
    const appointmentDoc = await (0, firebase_admin_1.firestore)()
        .collection('appointments')
        .doc(appointmentId)
        .get();
    if (!appointmentDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
    }
    const appointment = appointmentDoc.data();
    // Buscar dados do paciente
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(appointment?.patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    const patient = patientDoc.data();
    // Buscar terapeuta
    const therapistDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(appointment?.therapistId)
        .get();
    const therapist = therapistDoc.data();
    // Buscar tokens OAuth do terapeuta
    const tokensDoc = await (0, firebase_admin_1.firestore)()
        .collection('user_oauth_tokens')
        .doc(appointment?.therapistId)
        .get();
    if (!tokensDoc.exists || !tokensDoc.data()?.google?.refresh_token) {
        throw new https_1.HttpsError('failed-precondition', 'Google Calendar não conectado. Conecte sua conta nas configurações.');
    }
    const tokens = tokensDoc.data()?.google;
    try {
        // Criar cliente OAuth
        const oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, tokens.redirect_uri);
        oauth2Client.setCredentials({
            refresh_token: tokens.refresh_token,
        });
        // Refresh token se necessário
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        // Criar cliente Calendar
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        // Preparar dados do evento
        const dateTime = new Date(appointment?.date);
        const [hours, minutes] = appointment?.startTime.split(':');
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        const endTime = appointment?.endTime
            ? (() => {
                const [endHours, endMinutes] = appointment.endTime.split(':');
                const endDateTime = new Date(dateTime);
                endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
                return endDateTime.toISOString();
            })()
            : (() => {
                const endDateTime = new Date(dateTime);
                endDateTime.setHours(dateTime.getHours() + 1);
                return endDateTime.toISOString();
            })();
        let googleEventId = null;
        if (action === 'create') {
            // Criar evento no Google Calendar
            const event = {
                summary: `Fisioterapia - ${patient?.fullName || patient?.name}`,
                description: generateEventDescription({ appointment, patient, therapist }),
                start: {
                    dateTime: dateTime.toISOString(),
                    timeZone: 'America/Sao_Paulo',
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'America/Sao_Paulo',
                },
                location: therapist?.clinicAddress || therapist?.organizationName || 'FisioFlow',
                attendees: [
                    { email: therapist?.email },
                    { email: patient?.email },
                ].filter(a => a.email),
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 24 horas antes
                        { method: 'email', minutes: 60 }, // 1 hora antes
                    ],
                },
                extendedProperties: {
                    private: {
                        appointmentId,
                        patientId: appointment?.patientId,
                        source: 'fisioflow',
                    },
                },
            };
            const response = await calendar.events.insert({
                calendarId: CALENDAR_ID,
                requestBody: event,
                conferenceDataVersion: 1,
            });
            googleEventId = response.data.id || null;
            // Salvar ID do evento no Firestore
            await appointmentDoc.ref.update({
                googleCalendarEventId: googleEventId,
                syncedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            });
            logger.info(`Event created in Google Calendar: ${googleEventId} for appointment: ${appointmentId}`);
        }
        else if (action === 'update') {
            // Atualizar evento existente
            const event = {
                summary: `Fisioterapia - ${patient?.fullName || patient?.name}`,
                description: generateEventDescription({ appointment, patient, therapist }),
                start: {
                    dateTime: dateTime.toISOString(),
                    timeZone: 'America/Sao_Paulo',
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'America/Sao_Paulo',
                },
            };
            if (appointment?.googleCalendarEventId) {
                await calendar.events.update({
                    calendarId: CALENDAR_ID,
                    eventId: appointment.googleCalendarEventId,
                    requestBody: event,
                });
                googleEventId = appointment.googleCalendarEventId;
                await appointmentDoc.ref.update({
                    syncedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        else if (action === 'delete') {
            // Deletar evento
            if (appointment?.googleCalendarEventId) {
                await calendar.events.delete({
                    calendarId: CALENDAR_ID,
                    eventId: appointment.googleCalendarEventId,
                });
                await appointmentDoc.ref.update({
                    googleCalendarEventId: null,
                    syncDeletedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        // Atualizar tokens no Firestore (se novos tokens foram gerados)
        if (credentials.refresh_token !== tokens.refresh_token) {
            await tokensDoc.ref.update({
                'google.refresh_token': credentials.refresh_token,
                'google.access_token': credentials.access_token,
                'google.expiry_date': credentials.expiry_date,
            });
        }
        return {
            success: true,
            googleEventId,
        };
    }
    catch (error) {
        logger.error('Google Calendar sync error:', error);
        if (error.code === 401) {
            // Token inválido - remover tokens
            await tokensDoc.ref.update({
                'google': null,
            });
            throw new https_1.HttpsError('unauthenticated', 'Sessão do Google Calendar expirou. Por favor, reconecte sua conta.');
        }
        throw new https_1.HttpsError('internal', `Erro ao sincronizar com Google Calendar: ${error.message}`);
    }
});
/**
 * Cloud Function: Exportar agenda para iCal
 */
exports.exportToICal = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { startDate, endDate } = request.data;
    // Buscar agendamentos no período
    const appointmentsSnapshot = await (0, firebase_admin_1.firestore)()
        .collection('appointments')
        .where('therapistId', '==', request.auth.uid)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .where('status', 'in', ['agendado', 'confirmado'])
        .orderBy('date')
        .get();
    if (appointmentsSnapshot.empty) {
        return {
            success: true,
            icalData: 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FisioFlow//Calendar//EN\nEND:VCALENDAR',
        };
    }
    // Gerar conteúdo iCal
    let iCalData = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FisioFlow//Calendar//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n';
    for (const doc of appointmentsSnapshot.docs) {
        const apt = doc.data();
        const patient = await (0, firebase_admin_1.firestore)().collection('patients').doc(apt.patientId).get();
        const dateTime = new Date(apt.date);
        const [hours, minutes] = apt.startTime.split(':');
        dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        const endDate = new Date(dateTime);
        endDate.setHours(dateTime.getHours() + 1);
        iCalData += 'BEGIN:VEVENT\n';
        iCalData += `UID:${doc.id}@fisioflow.app\n`;
        iCalData += `DTSTAMP:${formatDateForICal(new Date(apt.createdAt?.toDate?.() || new Date()))}\n`;
        iCalData += `DTSTART:${formatDateForICal(dateTime)}\n`;
        iCalData += `DTEND:${formatDateForICal(endDate)}\n`;
        iCalData += `SUMMARY:Fisioterapia - ${patient.data()?.fullName || patient.data()?.name}\n`;
        iCalData += `DESCRIPTION:Tipo: ${apt.type}\n`;
        iCalData += `LOCATION:${apt.room || 'A definir'}\n`;
        iCalData += 'END:VEVENT\n';
    }
    iCalData += 'END:VCALENDAR';
    return {
        success: true,
        iCalData,
        filename: `fisioflow_agenda_${new Date().toISOString().split('T')[0]}.ics`,
    };
});
/**
 * Cloud Function: Conectar Google Calendar (OAuth)
 */
exports.connectGoogleCalendar = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { code, redirectUri } = request.data;
    const oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
    try {
        const { tokens } = await oauth2Client.getToken(code);
        // Salvar tokens no Firestore
        await (0, firebase_admin_1.firestore)()
            .collection('user_oauth_tokens')
            .doc(request.auth.uid)
            .set({
            google: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                scope: tokens.scope,
                token_type: tokens.token_type,
                expiry_date: tokens.expiry_date,
                redirect_uri: redirectUri,
                connected_at: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            },
        });
        logger.info(`Google Calendar connected for user: ${request.auth.uid}`);
        return {
            success: true,
        };
    }
    catch (error) {
        logger.error('Google Calendar connection error:', error);
        throw new https_1.HttpsError('internal', `Erro ao conectar Google Calendar: ${error.message}`);
    }
});
/**
 * Cloud Function: Desconectar Google Calendar
 */
exports.disconnectGoogleCalendar = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    // Remover tokens
    await (0, firebase_admin_1.firestore)()
        .collection('user_oauth_tokens')
        .doc(request.auth.uid)
        .update({
        google: null,
    });
    logger.info(`Google Calendar disconnected for user: ${request.auth.uid}`);
    return {
        success: true,
    };
});
/**
 * Cloud Function: Obter URL de autorização OAuth
 */
exports.getGoogleAuthUrl = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
    ];
    const oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.PUBLIC_URL}/settings/integrations/callback`);
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes.join(' '),
        prompt: 'consent',
        state: request.auth.uid,
    });
    return {
        success: true,
        authUrl,
    };
});
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Gera descrição do evento para o Google Calendar
 */
function generateEventDescription(params) {
    const { appointment, patient, therapist } = params;
    return `
FisioFlow - Sessão de Fisioterapia

Paciente: ${patient?.fullName || patient?.name}
Email: ${patient?.email || 'Não informado'}
Telefone: ${patient?.phone || 'Não informado'}

Tipo: ${appointment?.type}
Sala: ${appointment?.room || 'A definir'}

Fisioterapeuta: ${therapist?.displayName || therapist?.fullName}
Clínica: ${therapist?.organizationName || 'FisioFlow'}

---
Este evento foi sincronizado automaticamente pelo FisioFlow.
  `.trim();
}
/**
 * Formata data para formato iCal
 */
function formatDateForICal(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
//# sourceMappingURL=calendar.js.map