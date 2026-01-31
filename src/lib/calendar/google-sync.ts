/**
 * Serviço de sincronização com Google Calendar
 * @module calendar/google-sync
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Appointment } from '@/types/appointment';
import { calculateEndTime } from './utils';
import { STATUS_COLORS } from './constants';
import { fisioLogger as logger } from '@/lib/errors/logger';

// =====================================================================
// TYPES
// =====================================================================

/**
 * Token de acesso OAuth do Google
 */
export interface GoogleOAuthToken {
  /** Token de acesso */
  access_token: string;
  /** Token de refresh */
  refresh_token?: string;
  /** Data de expiração */
  expiry_date?: Date;
  /** Escopos do token */
  scope?: string[];
  /** Tipo de token */
  token_type?: string;
}

/**
 * Evento do Google Calendar
 */
export interface GoogleCalendarEvent {
  /** ID único do evento */
  id?: string;
  /** Título do evento */
  summary: string;
  /** Descrição do evento */
  description?: string;
  /** Início do evento */
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  /** Fim do evento */
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  /** Convidados */
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  /** Cor do evento */
  colorId?: string;
  /** Localização */
  location?: string;
  /** Lembrete */
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
  /** Metadados */
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

/**
 * Resultado de sincronização
 */
export interface SyncResult {
  /** Indica se foi bem-sucedido */
  success: boolean;
  /** ID do evento criado/atualizado */
  eventId?: string;
  /** Mensagem de erro (se houver) */
  error?: string;
}

/**
 * Configuração do serviço de sincronização
 */
export interface GoogleSyncConfig {
  /** ID do calendário (padrão: 'primary') */
  calendarId?: string;
  /** Timeout para requisições (ms) */
  timeout?: number;
  /** Callback para obtenção de token */
  getAccessToken: () => Promise<GoogleOAuthToken>;
}

// =====================================================================
// SERVICE CLASS
// =====================================================================

export class GoogleCalendarSync {
  private config: GoogleSyncConfig;
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor(config: GoogleSyncConfig) {
    this.config = config;

    // Configurar OAuth2 client
    this.oauth2Client = new OAuth2Client({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
    });

    // Configurar calendar API
    this.calendar = google.calendar({ version: 'v3' });
  }

  /**
   * Inicializa o cliente OAuth com o token
   */
  private async initializeClient(): Promise<void> {
    const token = await this.config.getAccessToken();

    this.oauth2Client.setCredentials({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expiry_date: token.expiry_date?.toISOString(),
    });

    // Configurar calendar com autenticação
    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  /**
   * Sincroniza um appointment para o Google Calendar
   */
  async syncToGoogle(appointment: Appointment): Promise<SyncResult> {
    try {
      await this.initializeClient();

      // Verificar se já existe evento
      const existingEvent = await this.findExistingEvent(appointment);

      const eventData = this.buildEventData(appointment);

      if (existingEvent) {
        // Atualizar evento existente
        await this.calendar.events.update({
          calendarId: this.config.calendarId || 'primary',
          eventId: existingEvent.id!,
          requestBody: eventData,
        });

        return { success: true, eventId: existingEvent.id };
      } else {
        // Criar novo evento
        const response = await this.calendar.events.insert({
          calendarId: this.config.calendarId || 'primary',
          requestBody: eventData,
          conferenceDataVersion: 1,
          sendUpdates: true,
        });

        return { success: true, eventId: response.data.id };
      }
    } catch (error) {
      logger.error('Erro ao sincronizar com Google Calendar', error, 'google-sync');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Busca eventos do Google Calendar para um intervalo de datas
   */
  async syncFromGoogle(startDate: Date, endDate: Date): Promise<GoogleCalendarEvent[]> {
    try {
      await this.initializeClient();

      const response = await this.calendar.events.list({
        calendarId: this.config.calendarId || 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Erro ao buscar do Google Calendar', error, 'google-sync');
      return [];
    }
  }

  /**
   * Deleta um evento do Google Calendar
   */
  async deleteFromGoogle(eventId: string): Promise<SyncResult> {
    try {
      await this.initializeClient();

      await this.calendar.events.delete({
        calendarId: this.config.calendarId || 'primary',
        eventId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao deletar do Google Calendar', error, 'google-sync');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar',
      };
    }
  }

  /**
   * Configura webhook para receber notificações do Google Calendar
   */
  async watchForChanges(webhookUrl: string): Promise<string | null> {
    try {
      await this.initializeClient();

      const response = await this.calendar.events.watch({
        calendarId: this.config.calendarId || 'primary',
        requestBody: {
          id: `fisioflow-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
        },
      });

      return response.data.resourceId;
    } catch (error) {
      logger.error('Erro ao configurar watch', error, 'google-sync');
      return null;
    }
  }

  /**
   * Para de receber notificações
   */
  async stopWatching(channelId: string, resourceId: string): Promise<boolean> {
    try {
      await this.initializeClient();

      await this.calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId,
        },
      });

      return true;
    } catch (error) {
      logger.error('Erro ao parar watch', error, 'google-sync');
      return false;
    }
  }

  /**
   * Busca um evento existente pelo appointment ID
   */
  private async findExistingEvent(appointment: Appointment): Promise<GoogleCalendarEvent | null> {
    try {
      // Buscar por extendedProperty
      const response = await this.calendar.events.list({
        calendarId: this.config.calendarId || 'primary',
        privatePropertyExtension: `fisioflow_appointment_id=${appointment.id}`,
        singleEvents: false,
      });

      return response.data.items?.[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Constrói os dados do evento para o Google Calendar
   */
  private buildEventData(appointment: Appointment): GoogleCalendarEvent {
    const endTime = calculateEndTime(appointment.date, appointment.time, appointment.duration || 60);

    // Mapear status para cor
    const colorMap: Record<string, string> = {
      confirmado: '10', // Verde
      agendado: '7',   // Azul
      cancelado: '11',  // Vermelho
      concluido: '2',   // Roxo
      aguardando_confirmacao: '6', // Amarelo laranja
      em_andamento: '3', // Azul petróleo
      remarcado: '9',   // Azul claro
      nao_compareceu: '4', // Cinza
    };

    return {
      summary: `${appointment.type} - ${appointment.patientName}`,
      description: this.buildEventDescription(appointment),
      start: {
        dateTime: this.formatDateTime(appointment.date, appointment.time),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: this.formatDateTime(appointment.date, endTime),
        timeZone: 'America/Sao_Paulo',
      },
      location: appointment.room_id ? appointment.room_id : undefined,
      colorId: colorMap[appointment.status] || '1',
      reminders: {
        useDefault: true,
      },
      extendedProperties: {
        private: {
          fisioflow_appointment_id: appointment.id,
          fisioflow_patient_id: appointment.patientId,
          fisioflow_status: appointment.status,
          fisioflow_type: appointment.type,
        },
      },
    };
  }

  /**
   * Constrói a descrição do evento
   */
  private buildEventDescription(appointment: Appointment): string {
    const lines: string[] = [];

    lines.push(`**Paciente:** ${appointment.patientName}`);
    lines.push(`**Tipo:** ${appointment.type}`);
    lines.push(`**Status:** ${appointment.status}`);
    lines.push(`**Duração:** ${appointment.duration || 60} minutos`);

    if (appointment.notes) {
      lines.push(`\n**Observações:**\n${appointment.notes}`);
    }

    return lines.join('\n');
  }

  /**
   * Formata data/hora para formato do Google Calendar
   */
  private formatDateTime(date: string | Date, time: string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const [hours, minutes] = time.split(':').map(Number);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

  /**
   * Converte evento do Google Calendar para Appointment
   */
  static googleEventToAppointment(event: GoogleCalendarEvent): Partial<Appointment> {
    const extendedProps = event.extendedProperties?.private || {};

    return {
      id: extendedProps.fisioflow_appointment_id,
      patientId: extendedProps.fisioflow_patient_id,
      patientName: event.summary?.split(' - ')[1] || '',
      type: extendedProps.fisioflow_type || 'scheduled',
      status: extendedProps.fisioflow_status || 'agendado',
      date: event.start?.dateTime ? event.start.dateTime.split('T')[0] : event.start?.date,
      time: event.start?.dateTime ? event.start.dateTime.split('T')[1]?.substring(0, 5) : '09:00',
      duration: event.start?.dateTime && event.end?.dateTime
        ? Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000)
        : 60,
      notes: event.description,
      googleEventId: event.id,
    };
  }
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Cria URL de autenticação OAuth do Google
 */
export function createGoogleAuthUrl(state?: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth não configurado');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state || 'fisioflow-calendar-sync',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Troca código de autorização por token de acesso
 */
export async function exchangeCodeForToken(code: string): Promise<GoogleOAuthToken> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth não configurado');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Falha ao obter token de acesso');
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope?.split(' '),
    token_type: data.token_type,
  };
}

/**
 * Renova token de acesso usando refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleOAuthToken> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth não configurado');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Falha ao renovar token');
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expiry_date: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope?.split(' '),
    token_type: data.token_type,
  };
}

// =====================================================================
// EXPORTS
// =====================================================================

export default GoogleCalendarSync;
