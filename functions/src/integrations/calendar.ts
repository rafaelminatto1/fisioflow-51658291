/**
 * Google Calendar Integration
 *
 * Sincronização de agendamentos com Google Calendar
 *
 * @module integrations/calendar
 */


// Configuração do Google Calendar

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { firestore } from 'firebase-admin';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as logger from 'firebase-functions/logger';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

export const syncToGoogleCalendarHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { appointmentId, action = 'create' } = request.data as {
    appointmentId: string;
    action?: 'create' | 'update' | 'delete';
  };

  // Buscar agendamento
  const appointmentDoc = await firestore()
    .collection('appointments')
    .doc(appointmentId)
    .get();

  if (!appointmentDoc.exists) {
    throw new HttpsError('not-found', 'Agendamento não encontrado');
  }

  const appointment = appointmentDoc.data();
  if (!appointment?.date || !appointment?.startTime) {
    throw new HttpsError('failed-precondition', 'Agendamento sem data ou horário inicial');
  }

  // Buscar dados do paciente
  const patientDoc = await firestore()
    .collection('patients')
    .doc(appointment?.patientId)
    .get();

  if (!patientDoc.exists) {
    throw new HttpsError('not-found', 'Paciente não encontrado');
  }

  const patient = patientDoc.data();

  // Buscar terapeuta
  const therapistDoc = await firestore()
    .collection('users')
    .doc(appointment?.therapistId)
    .get();

  const therapist = therapistDoc.data();

  // Buscar tokens OAuth do terapeuta
  const tokensDoc = await firestore()
    .collection('user_oauth_tokens')
    .doc(appointment?.therapistId)
    .get();

  if (!tokensDoc.exists || !tokensDoc.data()?.google?.refresh_token) {
    throw new HttpsError(
      'failed-precondition',
      'Google Calendar não conectado. Conecte sua conta nas configurações.'
    );
  }

  const tokens = tokensDoc.data()?.google;

  try {
    // Criar cliente OAuth
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      tokens.redirect_uri
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    });

    // Refresh token se necessário
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // Criar cliente Calendar
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client as any });

    // Preparar dados do evento
    const dateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.startTime.split(':');
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const endTime = appointment.endTime
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

    let googleEventId: string | null = null;

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
        syncedAt: firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Event created in Google Calendar: ${googleEventId} for appointment: ${appointmentId}`);

    } else if (action === 'update') {
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
          syncedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

    } else if (action === 'delete') {
      // Deletar evento
      if (appointment?.googleCalendarEventId) {
        await calendar.events.delete({
          calendarId: CALENDAR_ID,
          eventId: appointment.googleCalendarEventId,
        });

        await appointmentDoc.ref.update({
          googleCalendarEventId: null,
          syncDeletedAt: firestore.FieldValue.serverTimestamp(),
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

  } catch (error: any) {
    logger.error('Google Calendar sync error:', error);

    if (error.code === 401) {
      // Token inválido - remover tokens
      await tokensDoc.ref.update({
        'google': null,
      });

      throw new HttpsError(
        'unauthenticated',
        'Sessão do Google Calendar expirou. Por favor, reconecte sua conta.'
      );
    }

    throw new HttpsError('internal', `Erro ao sincronizar com Google Calendar: ${error.message}`);
  }
};

export const syncToGoogleCalendar = onCall({
  cors: true,
  memory: '256MiB',
  maxInstances: 1,
}, syncToGoogleCalendarHandler);

/**
 * Cloud Function: Importar eventos do Google Calendar (listar para o usuário)
 * Retorna lista de eventos no período; o frontend pode exibir e opcionalmente confirmar import.
 */
export const importFromGoogleCalendarHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { startDate, endDate, calendarId: calendarIdParam } = request.data as {
    startDate: string;
    endDate: string;
    calendarId?: string;
  };

  if (!startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'startDate e endDate são obrigatórios');
  }

  const db = firestore();
  const tokensDoc = await db.collection('user_oauth_tokens').doc(request.auth.uid).get();

  if (!tokensDoc.exists || !tokensDoc.data()?.google?.refresh_token) {
    throw new HttpsError(
      'failed-precondition',
      'Google Calendar não conectado. Conecte sua conta nas configurações.'
    );
  }

  const tokens = tokensDoc.data()?.google;

  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      tokens.redirect_uri
    );
    oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client as any });
    const calendarId = calendarIdParam || CALENDAR_ID;

    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate).toISOString();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const events = (response.data.items || []).map((ev) => ({
      id: ev.id,
      summary: ev.summary || '(Sem título)',
      description: ev.description || null,
      start: ev.start?.dateTime || ev.start?.date || null,
      end: ev.end?.dateTime || ev.end?.date || null,
      location: ev.location || null,
      htmlLink: ev.htmlLink || null,
    }));

    return {
      success: true,
      events,
      calendarId,
    };
  } catch (error: any) {
    logger.error('importFromGoogleCalendar error:', error);
    if (error.code === 401) {
      throw new HttpsError(
        'unauthenticated',
        'Sessão do Google Calendar expirou. Por favor, reconecte sua conta.'
      );
    }
    throw new HttpsError('internal', `Erro ao importar eventos: ${error.message}`);
  }
};

export const importFromGoogleCalendar = onCall({
  cors: true,
  memory: '256MiB',
  maxInstances: 1,
}, importFromGoogleCalendarHandler);

/**
 * Cloud Function: Exportar agenda para iCal (callable - mantém tipo para deploy)
 */
async function buildICalData(userId: string, startDate: string, endDate: string) {
  const appointmentsSnapshot = await firestore()
    .collection('appointments')
    .where('therapistId', '==', userId)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .where('status', 'in', ['agendado', 'confirmado'])
    .orderBy('date')
    .get();

  if (appointmentsSnapshot.empty) {
    return {
      success: true as const,
      iCalData: 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FisioFlow//Calendar//EN\nEND:VCALENDAR',
      filename: `fisioflow_agenda_${new Date().toISOString().split('T')[0]}.ics`,
    };
  }

  let iCalData = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FisioFlow//Calendar//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n';
  for (const doc of appointmentsSnapshot.docs) {
    const apt = doc.data();
    const patient = await firestore().collection('patients').doc(apt.patientId).get();
    const dateTime = new Date(apt.date);
    const [hours, minutes] = apt.startTime.split(':');
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const endDateTime = new Date(dateTime);
    endDateTime.setHours(dateTime.getHours() + 1);
    iCalData += 'BEGIN:VEVENT\n';
    iCalData += `UID:${doc.id}@fisioflow.app\n`;
    iCalData += `DTSTAMP:${formatDateForICal(new Date(apt.createdAt?.toDate?.() || new Date()))}\n`;
    iCalData += `DTSTART:${formatDateForICal(dateTime)}\n`;
    iCalData += `DTEND:${formatDateForICal(endDateTime)}\n`;
    iCalData += `SUMMARY:Fisioterapia - ${patient.data()?.fullName || patient.data()?.name}\n`;
    iCalData += `DESCRIPTION:Tipo: ${apt.type}\n`;
    iCalData += `LOCATION:${apt.room || 'A definir'}\n`;
    iCalData += 'END:VEVENT\n';
  }
  iCalData += 'END:VCALENDAR';
  return {
    success: true as const,
    iCalData,
    filename: `fisioflow_agenda_${new Date().toISOString().split('T')[0]}.ics`,
  };
}

export const exportToICalHandler = async (req: any, res: any) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(authHeader.substring(7));
    const { startDate, endDate } = (req.query || req.body || {}) as { startDate?: string; endDate?: string };
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }
    const result = await buildICalData(decodedToken.uid, startDate, endDate);
    res.json(result);
  } catch (error: any) {
    logger.error('exportToICal error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const exportToICalCallableHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }
  const { startDate, endDate } = (request.data || {}) as { startDate?: string; endDate?: string };
  if (!startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'startDate and endDate are required');
  }
  return buildICalData(request.auth.uid, startDate, endDate);
};

export const exportToICal = onCall({
  cors: true,
  memory: '256MiB',
  maxInstances: 1,
}, exportToICalCallableHandler);

/**
 * Cloud Function: Conectar Google Calendar (OAuth)
 */
export const connectGoogleCalendarHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { code, redirectUri } = request.data as {
    code: string;
    redirectUri: string;
  };

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Salvar tokens no Firestore
    await firestore()
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
          connected_at: firestore.FieldValue.serverTimestamp(),
        },
      });

    logger.info(`Google Calendar connected for user: ${request.auth.uid}`);

    return {
      success: true,
    };

  } catch (error: any) {
    logger.error('Google Calendar connection error:', error);
    throw new HttpsError('internal', `Erro ao conectar Google Calendar: ${error.message}`);
  }
};

export const connectGoogleCalendar = onCall({
  cors: true,
  memory: '256MiB',
  maxInstances: 1,
}, connectGoogleCalendarHandler);

/**
 * Cloud Function: Desconectar Google Calendar
 */
export const disconnectGoogleCalendarHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  // Remover tokens
  await firestore()
    .collection('user_oauth_tokens')
    .doc(request.auth.uid)
    .update({
      google: null,
    });

  logger.info(`Google Calendar disconnected for user: ${request.auth.uid}`);

  return {
    success: true,
  };
};

export const disconnectGoogleCalendar = onCall({
  cors: true,
  memory: '256MiB',
  maxInstances: 1,
}, disconnectGoogleCalendarHandler);

/**
 * Cloud Function: Obter URL de autorização OAuth
 */
export const getGoogleAuthUrlHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.PUBLIC_URL}/settings/integrations/callback`
  );

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
};

export const getGoogleAuthUrl = onCall({
  cors: true,
  memory: '256MiB',
  maxInstances: 1,
}, getGoogleAuthUrlHandler);

/**
 * Cloud Function: Sincronizar integração (persiste last_sync_at e sync_status)
 * Para google_calendar: atualiza status; sync real de eventos é feito por syncToGoogleCalendar por agendamento.
 */
export const syncIntegrationHandler = async (request: any) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { provider } = request.data as { provider: string };
  if (!provider) {
    throw new HttpsError('invalid-argument', 'provider é obrigatório');
  }

  const db = firestore();
  const profileSnap = await db.collection('profiles').doc(request.auth.uid).get();
  const organizationId = profileSnap.data()?.organization_id;
  if (!organizationId) {
    throw new HttpsError('failed-precondition', 'Perfil sem organização');
  }

  const now = new Date();
  const statusRef = db
    .collection('organizations')
    .doc(organizationId)
    .collection('integration_status')
    .doc(provider);

  await statusRef.set({
    last_sync_at: firestore.FieldValue.serverTimestamp(),
    sync_status: 'synced',
    updated_by: request.auth.uid,
    updated_at: firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  logger.info(`Integration sync recorded: ${provider} for org ${organizationId}`);

  return {
    last_sync_at: now.toISOString(),
    sync_status: 'synced',
  };
};

export const syncIntegration = onCall({
  cors: true,
  memory: '256MiB',
  maxInstances: 1,
}, syncIntegrationHandler);

// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================

/**
 * Gera descrição do evento para o Google Calendar
 */
function generateEventDescription(params: {
  appointment: any;
  patient: any;
  therapist: any;
}): string {
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
function formatDateForICal(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
