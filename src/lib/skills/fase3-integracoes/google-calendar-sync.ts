/**
 * FisioFlow - Google Calendar Integration
 *
 * Integração com Google Calendar usando a skill google-calendar-automation
 * via Rube MCP (Composio).
 *
 * Funcionalidades:
 * - Sincronização de agendamentos com Google Calendar
 * - Criação de eventos no Google Calendar
 * - Verificação de disponibilidade
 * - Notificações de lembretes
 *
 * Baseado na claude-skills google-calendar-automation
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { format, addHours, addMinutes } from 'date-fns';

// Tipos
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

export interface SyncOptions {
  calendarId?: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  conferenceDataVersion?: number;
}

export interface AvailabilityOptions {
  timeMin: Date;
  timeMax: Date;
  calendarIds?: string[];
  timeZone?: string;
}

/**
 * Classe para sincronização com Google Calendar
 */
export class GoogleCalendarSync {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private calendarId: string;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    refreshToken: string,
    calendarId: string = 'primary'
  ) {
    this.oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.calendarId = calendarId;
  }

  /**
   * Cria um evento no Google Calendar
   */
  async createEvent(event: CalendarEvent, options?: SyncOptions): Promise<string> {
    try {
      const calendarEvent = {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        attendees: event.attendees,
        location: event.location,
        colorId: event.colorId,
        reminders: event.reminders || {
          useDefault: true,
        },
        conferenceData: options?.conferenceDataVersion
          ? {
              createRequest: {
                requestId: `fisioflow-${event.id}`,
                conferenceSolutionKey: {
                  type: 'hangoutsMeet',
                },
              },
            }
          : undefined,
      };

      const response = await this.calendar.events.insert({
        calendarId: options?.calendarId || this.calendarId,
        requestBody: calendarEvent,
        sendUpdates: options?.sendUpdates || 'externalOnly',
        conferenceDataVersion: options?.conferenceDataVersion || 1,
      });

      return response.data.id;
    } catch (error) {
      console.error('Erro ao criar evento no Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Atualiza um evento existente
   */
  async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>,
    options?: SyncOptions
  ): Promise<void> {
    try {
      const calendarEvent: any = {};

      if (event.summary) calendarEvent.summary = event.summary;
      if (event.description) calendarEvent.description = event.description;
      if (event.start) {
        calendarEvent.start = {
          dateTime: event.start.toISOString(),
          timeZone: 'America/Sao_Paulo',
        };
      }
      if (event.end) {
        calendarEvent.end = {
          dateTime: event.end.toISOString(),
          timeZone: 'America/Sao_Paulo',
        };
      }
      if (event.attendees) calendarEvent.attendees = event.attendees;
      if (event.location) calendarEvent.location = event.location;
      if (event.colorId) calendarEvent.colorId = event.colorId;

      await this.calendar.events.patch({
        calendarId: options?.calendarId || this.calendarId,
        eventId,
        requestBody: calendarEvent,
        sendUpdates: options?.sendUpdates || 'externalOnly',
      });
    } catch (error) {
      console.error('Erro ao atualizar evento no Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Deleta um evento
   */
  async deleteEvent(eventId: string, options?: SyncOptions): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: options?.calendarId || this.calendarId,
        eventId,
        sendUpdates: options?.sendUpdates || 'externalOnly',
      });
    } catch (error) {
      console.error('Erro ao deletar evento do Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Busca eventos em um período
   */
  async getEvents(
    timeMin: Date,
    timeMax: Date,
    options?: SyncOptions
  ): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: options?.calendarId || this.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return (response.data.items || []).map((item: any) => ({
        id: item.id,
        summary: item.summary,
        description: item.description,
        start: new Date(item.start.dateTime || item.start.date),
        end: new Date(item.end.dateTime || item.end.date),
        attendees: item.attendees || [],
        location: item.location,
        colorId: item.colorId,
      }));
    } catch (error) {
      console.error('Erro ao buscar eventos do Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Verifica disponibilidade (free/busy)
   */
  async checkAvailability(
    options: AvailabilityOptions
  ): Promise<{ start: Date; end: Date }[]> {
    try {
      const calendarIds = options.calendarIds || [this.calendarId];

      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: options.timeMin.toISOString(),
          timeMax: options.timeMax.toISOString(),
          timeZone: options.timeZone || 'America/Sao_Paulo',
          items: calendarIds.map((id) => ({ id })),
        },
      });

      const busyTimes: { start: Date; end: Date }[] = [];

      for (const calendarId in response.data.calendars) {
        const calendar = response.data.calendars[calendarId];
        if (calendar.busy) {
          for (const busy of calendar.busy) {
            busyTimes.push({
              start: new Date(busy.start),
              end: new Date(busy.end),
            });
          }
        }
      }

      return busyTimes.sort((a, b) => a.start.getTime() - b.start.getTime());
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      throw error;
    }
  }

  /**
   * Encontra slots disponíveis
   */
  async findAvailableSlots(
    options: AvailabilityOptions & {
      durationMinutes: number;
      startHour?: number;
      endHour?: number;
    }
  ): Promise<Date[]> {
    const busyTimes = await this.checkAvailability(options);
    const slots: Date[] = [];

    const startHour = options.startHour || 8;
    const endHour = options.endHour || 18;
    const duration = options.durationMinutes;

    let current = new Date(options.timeMin);
    current.setHours(startHour, 0, 0, 0);

    const endOfSearch = new Date(options.timeMax);

    while (current < endOfSearch) {
      // Verificar se está fora do horário de trabalho
      const hour = current.getHours();
      if (hour < startHour || hour >= endHour) {
        current = addHours(current, 1);
        current.setMinutes(0, 0, 0);
        continue;
      }

      // Verificar se está disponível
      const slotEnd = addMinutes(current, duration);
      const isAvailable = !busyTimes.some((busy) => {
        return (
          (current >= busy.start && current < busy.end) ||
          (slotEnd > busy.start && slotEnd <= busy.end) ||
          (current <= busy.start && slotEnd >= busy.end)
        );
      });

      if (isAvailable) {
        slots.push(new Date(current));
      }

      // Próximo slot (a cada 30 minutos)
      current = addMinutes(current, 30);
    }

    return slots;
  }

  /**
   * Sincroniza agendamento do FisioFlow com Google Calendar
   */
  async syncAppointment(
    appointment: {
      id: string;
      patientName: string;
      patientEmail?: string;
      professionalName: string;
      professionalEmail: string;
      start: Date;
      end: Date;
      type: string;
      status: 'scheduled' | 'completed' | 'cancelled';
      notes?: string;
      location?: string;
      googleEventId?: string;
    },
    options?: SyncOptions
  ): Promise<{ eventId: string; created: boolean }> {
    // Se estiver cancelado ou completo, remover do calendário
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      if (appointment.googleEventId) {
        await this.deleteEvent(appointment.googleEventId, options);
        return { eventId: appointment.googleEventId, created: false };
      }
      return { eventId: '', created: false };
    }

    // Criar ou atualizar evento
    const event: CalendarEvent = {
      id: appointment.id,
      summary: `${appointment.type} - ${appointment.patientName}`,
      description: this.buildEventDescription(appointment),
      start: appointment.start,
      end: appointment.end,
      location: appointment.location,
      attendees: [
        { email: appointment.professionalEmail, displayName: appointment.professionalName },
      ],
      colorId: this.getColorIdForType(appointment.type),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 1 dia antes
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    if (appointment.patientEmail) {
      event.attendees?.push({ email: appointment.patientEmail, displayName: appointment.patientName });
    }

    if (appointment.googleEventId) {
      await this.updateEvent(appointment.googleEventId, event, options);
      return { eventId: appointment.googleEventId, created: false };
    } else {
      const eventId = await this.createEvent(event, options);
      return { eventId, created: true };
    }
  }

  /**
   * Constrói descrição do evento
   */
  private buildEventDescription(appointment: {
    type: string;
    patientName: string;
    professionalName: string;
    notes?: string;
  }): string {
    let description = `Tipo: ${appointment.type}\n`;
    description += `Paciente: ${appointment.patientName}\n`;
    description += `Profissional: ${appointment.professionalName}\n`;

    if (appointment.notes) {
      description += `\nObservações:\n${appointment.notes}\n`;
    }

    description += `\n---\nGerado pelo FisioFlow`;

    return description;
  }

  /**
   * Retorna cor baseada no tipo de atendimento
   */
  private getColorIdForType(type: string): string {
    const colors: Record<string, string> = {
      'Avaliação Inicial': '1',    // Azul
      'Sessão de Fisioterapia': '2', // Verde
      'Telemedicina': '3',         // Roxo
      'Reavaliação': '4',          // Amarelo
      'Alta': '5',                 // Laranja
      'Orientação': '6',           // Turquesa
      'Grupo': '7',                // Cinza
      'Exames': '8',               // Azul escuro
      'Retorno': '9',              // Verde claro
      'Emergência': '10',          // Vermelho
    };

    return colors[type] || '1';
  }

  /**
   * Sincroniza múltiplos agendamentos
   */
  async syncMultipleAppointments(
    appointments: Array<{
      id: string;
      patientName: string;
      patientEmail?: string;
      professionalName: string;
      professionalEmail: string;
      start: Date;
      end: Date;
      type: string;
      status: 'scheduled' | 'completed' | 'cancelled';
      notes?: string;
      location?: string;
      googleEventId?: string;
    }>,
    options?: SyncOptions
  ): Promise<Array<{ appointmentId: string; eventId: string; created: boolean; error?: string }>> {
    const results = [];

    for (const appointment of appointments) {
      try {
        const result = await this.syncAppointment(appointment, options);
        results.push({
          appointmentId: appointment.id,
          eventId: result.eventId,
          created: result.created,
        });
      } catch (error) {
        results.push({
          appointmentId: appointment.id,
          eventId: '',
          created: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Busca eventos conflitantes
   */
  async findConflicts(
    start: Date,
    end: Date,
    excludeEventId?: string
  ): Promise<CalendarEvent[]> {
    const events = await this.getEvents(start, end);

    return events.filter((event) => {
      if (excludeEventId && event.id === excludeEventId) return false;

      return (
        (event.start < end && event.end > start)
      );
    });
  }

  /**
   * Webhook handler para mudanças no Google Calendar
   */
  async handleWebhook(payload: any): Promise<void> {
    // Implementação para receber notificações do Google Calendar
    // Útil para manter sincronia bidirecional
    console.log('Webhook recebido:', payload);
  }
}

/**
 * Factory para criar instância de sincronização
 */
export class GoogleCalendarSyncFactory {
  private static instance: GoogleCalendarSync | null = null;

  static create(config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    refreshToken: string;
    calendarId?: string;
  }): GoogleCalendarSync {
    return new GoogleCalendarSync(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
      config.refreshToken,
      config.calendarId
    );
  }

  static async createFromEnv(): Promise<GoogleCalendarSync> {
    if (this.instance) return this.instance;

    // No ambiente real, buscar variáveis de ambiente
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';

    this.instance = new GoogleCalendarSync(
      clientId,
      clientSecret,
      redirectUri,
      refreshToken
    );

    return this.instance;
  }
}

/**
 * Tipos e interfaces auxiliares
 */
export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // em minutos
  defaultCalendarId?: string;
  sendReminders: boolean;
  createConference: boolean;
}

export interface AppointmentSyncData {
  appointmentId: string;
  googleEventId?: string;
  lastSyncAt?: Date;
  syncStatus: 'pending' | 'synced' | 'error';
  errorMessage?: string;
}
