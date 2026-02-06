/**
 * Google Calendar Integration
 * Integração real com Google Calendar API
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

  CalendarEvent,
  IntegrationConfig,
  SyncResult,
} from '@/types/integrations';

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * Gera URL de consentimento OAuth
 */
export function getGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[] = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ]
): string {
  const oauth2Client = new OAuth2Client(clientId, '', redirectUri);

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  return url;
}

/**
 * Troca código de autorização por tokens
 */
export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Falha ao obter tokens do Google');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
  };
}

/**
 * Renova access token usando refresh token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Falha ao renovar token');
  }

  return credentials.access_token;
}

// ============================================================================
// Calendar Operations
// ============================================================================

/**
 * Criar evento no Google Calendar
 */
export async function createCalendarEvent(
  accessToken: string,
  eventData: CalendarEvent
): Promise<string> {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: eventData.title,
    description: eventData.description,
    start: {
      dateTime: eventData.start_time.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: eventData.end_time.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    attendees: eventData.attendees?.map((email) => ({ email })),
    reminders: {
      useDefault: false,
      overrides: eventData.reminders?.map((minutes) => ({ method: 'email', minutes })) || [],
    },
    location: eventData.location,
    colorId: eventData.color_id,
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return response.data.id || '';
}

/**
 * Atualizar evento no Google Calendar
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  eventData: Partial<CalendarEvent>
): Promise<void> {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event: any = {};

  if (eventData.title) event.summary = eventData.title;
  if (eventData.description) event.description = eventData.description;
  if (eventData.start_time) {
    event.start = {
      dateTime: eventData.start_time.toISOString(),
      timeZone: 'America/Sao_Paulo',
    };
  }
  if (eventData.end_time) {
    event.end = {
      dateTime: eventData.end_time.toISOString(),
      timeZone: 'America/Sao_Paulo',
    };
  }
  if (eventData.attendees) {
    event.attendees = eventData.attendees.map((email) => ({ email }));
  }

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: event,
  });
}

/**
 * Deletar evento no Google Calendar
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
}

/**
 * Buscar eventos do Google Calendar
 */
export async function getCalendarEvents(
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{
  id: string;
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}>> {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items || []).map((item: any) => ({
    id: item.id || '',
    summary: item.summary || '(Sem título)',
    start: new Date(item.start?.dateTime || item.start?.date),
    end: new Date(item.end?.dateTime || item.end?.date),
    description: item.description,
    location: item.location,
  }));
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sincroniza agendamentos do FisioFlow com Google Calendar
 */
export async function syncToGoogleCalendar(
  accessToken: string,
  appointments: Array<{
    id: string;
    patient_name: string;
    start_time: Date;
    end_time: Date;
    description?: string;
    google_calendar_event_id?: string;
  }>
): Promise<SyncResult> {
  const results: SyncResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
  };

  for (const appointment of appointments) {
    try {
      const eventData: CalendarEvent = {
        title: `Fisioterapia - ${appointment.patient_name}`,
        description: appointment.description || 'Sessão de fisioterapia',
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        reminders: [1440], // Lembrete 24h antes
      };

      if (appointment.google_calendar_event_id) {
        // Atualizar evento existente
        await updateCalendarEvent(accessToken, appointment.google_calendar_event_id, eventData);
        results.updated++;
      } else {
        // Criar novo evento
        const eventId = await createCalendarEvent(accessToken, eventData);
        results.created++;
        // TODO: Salvar eventId no appointment
      }
    } catch (error) {
      results.errors.push({
        appointment_id: appointment.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Sincroniza eventos do Google Calendar para o FisioFlow
 */
export async function syncFromGoogleCalendar(
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{
  google_event_id: string;
  title: string;
  start_time: Date;
  end_time: Date;
  description?: string;
}>> {
  const events = await getCalendarEvents(accessToken, startDate, endDate);

  return events.map((event) => ({
    google_event_id: event.id,
    title: event.summary,
    start_time: event.start,
    end_time: event.end,
    description: event.description,
  }));
}

/**
 * Webhook handler para Google Calendar push notifications
 */
export async function handleCalendarWebhook(
  headers: Headers,
  body: any,
  channelToken: string,
  onEvent: (eventId: string, action: 'create' | 'update' | 'delete') => void
): Promise<void> {
  // Verificar signature
  const signature = headers.get('X-Goog-Signature');
  if (!signature) {
    throw new Error('Assinatura não fornecida');
  }

  // TODO: Validar HMAC
  // const expectedSignature = crypto
  //   .createHmac('sha256', channelToken)
  //   .update(JSON.stringify(body))
  //   .digest('hex');

  for (const item of body.items || []) {
    await onEvent(item.id, item.kind);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface GoogleCalendarConfig extends IntegrationConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  access_token?: string;
  refresh_token?: string;
  token_expiry?: number;
  calendar_id?: string;
  sync_enabled: boolean;
  sync_direction: 'bidirectional' | 'to_google' | 'from_google';
  default_reminder_minutes?: number;
}
