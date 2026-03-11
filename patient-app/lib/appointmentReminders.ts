import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patientApi } from './api';
import { log } from '@/lib/logger';

export interface Appointment {
  id: string;
  date: Date;
  time: string;
  type: string;
  professionalName: string;
  professionalId?: string;
  notes?: string;
}

export interface AppointmentReminderConfig {
  enabled: boolean;
  reminders: {
    hoursBefore: number[];
  }[];
}

export type AppointmentReminderType = '24h_before' | '1h_before' | 'day_of';

const STORAGE_KEYS = {
  APPOINTMENT_REMINDERS: '@fisioflow_appointment_reminders',
  SCHEDULED_REMINDERS: '@fisioflow_scheduled_appointment_reminders',
};

const DEFAULT_CONFIG: AppointmentReminderConfig = {
  enabled: true,
  reminders: [{ hoursBefore: [24, 1] }],
};

function parseAppointmentDate(raw: Record<string, unknown>): Date | null {
  const primary =
    raw.date ??
    raw.appointment_date ??
    raw.scheduled_at ??
    raw.start_at ??
    null;

  if (!primary) return null;

  const parsed = new Date(String(primary));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseAppointmentTime(raw: Record<string, unknown>, date: Date): string {
  const explicit =
    raw.time ??
    raw.start_time ??
    raw.scheduled_time ??
    null;

  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim().slice(0, 5);
  }

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeAppointment(raw: unknown): Appointment | null {
  if (!raw || typeof raw !== 'object') return null;

  const row = raw as Record<string, unknown>;
  const date = parseAppointmentDate(row);
  if (!date) return null;

  return {
    id: String(row.id ?? ''),
    date,
    time: parseAppointmentTime(row, date),
    type: typeof row.type === 'string' && row.type.trim() ? row.type.trim() : 'Consulta',
    professionalName:
      (typeof row.professional_name === 'string' && row.professional_name.trim()) ||
      (typeof row.therapist_name === 'string' && row.therapist_name.trim()) ||
      'Profissional',
    professionalId:
      typeof row.professional_id === 'string' && row.professional_id.trim()
        ? row.professional_id.trim()
        : undefined,
    notes: typeof row.notes === 'string' && row.notes.trim() ? row.notes.trim() : undefined,
  };
}

export class AppointmentReminders {
  private userId: string | undefined;
  private config: AppointmentReminderConfig = DEFAULT_CONFIG;

  constructor(userId?: string) {
    this.userId = userId;
  }

  async initialize(): Promise<void> {
    await this.loadConfig();

    if (this.config.enabled && this.userId) {
      await this.syncWithAppointments();
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENT_REMINDERS);
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (error) {
      log.error('Error loading appointment reminder config:', error);
      this.config = DEFAULT_CONFIG;
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.APPOINTMENT_REMINDERS,
        JSON.stringify(this.config),
      );
    } catch (error) {
      log.error('Error saving appointment reminder config:', error);
    }
  }

  getConfig(): AppointmentReminderConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<AppointmentReminderConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();

    if (this.config.enabled && this.userId) {
      await this.syncWithAppointments();
      return;
    }

    await this.cancelAll();
  }

  async syncWithAppointments(): Promise<void> {
    if (!this.userId || !this.config.enabled) {
      return;
    }

    try {
      await this.cancelAll();

      const appointments = (await patientApi.getAppointments(true))
        .map((appointment) => normalizeAppointment(appointment))
        .filter((appointment): appointment is Appointment => appointment !== null);

      const scheduledIds: string[] = [];

      for (const appointment of appointments) {
        for (const reminderConfig of this.config.reminders) {
          for (const hoursBefore of reminderConfig.hoursBefore) {
            const id = await this.scheduleReminder(appointment, hoursBefore);
            if (id) {
              scheduledIds.push(id);
            }
          }
        }
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULED_REMINDERS,
        JSON.stringify(scheduledIds),
      );
    } catch (error) {
      log.error('Error syncing appointment reminders:', error);
    }
  }

  private async scheduleReminder(
    appointment: Appointment,
    hoursBefore: number,
  ): Promise<string | null> {
    try {
      const reminderDate = new Date(appointment.date);
      reminderDate.setHours(reminderDate.getHours() - hoursBefore);

      if (reminderDate < new Date()) {
        return null;
      }

      let message = '';
      if (hoursBefore >= 24) {
        const days = Math.floor(hoursBefore / 24);
        message = `Sua consulta de ${appointment.type} e em ${days} dia${days !== 1 ? 's' : ''}.`;
      } else if (hoursBefore === 1) {
        message = `Sua consulta de ${appointment.type} e em 1 hora.`;
      } else {
        message = `Sua consulta de ${appointment.type} e em ${hoursBefore} horas.`;
      }

      return Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lembrete de Consulta',
          body: `${message}\nCom ${appointment.professionalName} as ${appointment.time}.`,
          data: {
            type: 'appointment_reminder',
            appointmentId: appointment.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });
    } catch (error) {
      log.error('Error scheduling appointment reminder:', error);
      return null;
    }
  }

  async cancelAll(): Promise<void> {
    try {
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_REMINDERS);
      if (storedIds) {
        const ids = JSON.parse(storedIds) as string[];
        await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULED_REMINDERS);
    } catch (error) {
      log.error('Error canceling appointment reminders:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      log.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_REMINDERS);

      if (!storedIds) {
        return [];
      }

      const ids = JSON.parse(storedIds) as string[];
      return allScheduled.filter((notification) => ids.includes(notification.identifier));
    } catch (error) {
      log.error('Error getting scheduled appointment reminders:', error);
      return [];
    }
  }
}

export function useAppointmentReminders(userId?: string) {
  const [reminders] = useState(() => new AppointmentReminders(userId));

  useEffect(() => {
    reminders.initialize();
  }, [reminders]);

  return {
    config: reminders.getConfig(),
    updateConfig: reminders.updateConfig.bind(reminders),
    syncWithAppointments: reminders.syncWithAppointments.bind(reminders),
    cancelAll: reminders.cancelAll.bind(reminders),
    requestPermissions: reminders.requestPermissions.bind(reminders),
    getScheduledReminders: reminders.getScheduledReminders.bind(reminders),
  };
}

export async function createAppointmentReminder(
  appointment: Appointment,
  hoursBefore = 24,
): Promise<string | null> {
  const reminderDate = new Date(appointment.date);
  reminderDate.setHours(reminderDate.getHours() - hoursBefore);

  if (reminderDate < new Date()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete de Consulta',
      body: `Sua consulta de ${appointment.type} e em ${hoursBefore} horas.\nCom ${appointment.professionalName} as ${appointment.time}.`,
      data: {
        type: 'appointment_reminder',
        appointmentId: appointment.id,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
}

export async function cancelAppointmentReminder(
  appointmentId: string,
  hoursBefore: number,
): Promise<void> {
  const identifier = `appointment-reminder-${appointmentId}-${hoursBefore}h`;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export default AppointmentReminders;
