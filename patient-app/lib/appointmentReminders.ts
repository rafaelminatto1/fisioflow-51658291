/**
 * Appointment Reminders System
 *
 * Sistema de lembretes de consultas com notificações baseadas
 * na data e hora dos agendamentos.
 *
 * @module lib/appointmentReminders
 */

import { useState } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Dados de uma consulta/agendamento
 */
export interface Appointment {
  id: string;
  date: Date;
  time: string;
  type: string;
  professionalName: string;
  professionalId?: string;
  notes?: string;
}

/**
 * Configuração de lembretes de consultas
 */
export interface AppointmentReminderConfig {
  enabled: boolean;
  reminders: {
    hoursBefore: number[];
    }[];
}

/**
 * Tipos de lembrete de consulta
 */
export type AppointmentReminderType = '24h_before' | '1h_before' | 'day_of';

/**
 * Chaves para armazenamento local
 */
const STORAGE_KEYS = {
  APPOINTMENT_REMINDERS: '@fisioflow_appointment_reminders',
  SCHEDULED_REMINDERS: '@fisioflow_scheduled_appointment_reminders',
};

/**
 * Classe gerenciadora de lembretes de consultas
 */
export class AppointmentReminders {
  private userId: string | undefined;
  private config: AppointmentReminderConfig = {
    enabled: true,
    reminders: [
      { hoursBefore: [24, 1] },
    ],
  };

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Inicializa o sistema de lembretes de consultas
   */
  async initialize(): Promise<void> {
    await this.loadConfig();

    // Carregar consultas agendadas e criar lembretes
    if (this.config.enabled && this.userId) {
      await this.syncWithAppointments();
    }
  }

  /**
   * Carrega a configuração de lembretes
   */
  private async loadConfig(): Promise<void> {
    try {
      // Tentar buscar do Firestore primeiro
      if (this.userId) {
        const userDoc = await getDoc(doc(db, 'users', this.userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.appointmentReminders) {
            this.config = data.appointmentReminders;
            return;
          }
        }
      }

      // Fallback para AsyncStorage
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENT_REMINDERS);
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading appointment reminder config:', error);
    }
  }

  /**
   * Salva a configuração de lembretes
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.APPOINTMENT_REMINDERS,
        JSON.stringify(this.config)
      );

      if (this.userId) {
        await updateDoc(doc(db, 'users', this.userId), {
          appointmentReminders: this.config,
        });
      }
    } catch (error) {
      console.error('Error saving appointment reminder config:', error);
    }
  }

  /**
   * Retorna a configuração atual
   */
  getConfig(): AppointmentReminderConfig {
    return { ...this.config };
  }

  /**
   * Atualiza a configuração de lembretes
   */
  async updateConfig(updates: Partial<AppointmentReminderConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();

    // Reagendar notificações com a nova configuração
    if (this.config.enabled && this.userId) {
      await this.syncWithAppointments();
    } else {
      await this.cancelAll();
    }
  }

  /**
   * Sincroniza lembretes com as consultas agendadas
   */
  async syncWithAppointments(): Promise<void> {
    if (!this.userId || !this.config.enabled) {
      return;
    }

    try {
      // Cancelar lembretes antigos
      await this.cancelAll();

      // Buscar próximas consultas
      const appointmentsRef = collection(db, 'users', this.userId, 'appointments');
      const now = new Date();
      const q = query(
        appointmentsRef,
        where('date', '>=', now),
        where('status', '==', 'scheduled'),
        orderBy('date', 'asc')
      );

      const snapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
          appointments.push({
            id: doc.id,
            date: data.date.toDate(),
            time: data.time || '09:00',
            type: data.type || 'Consulta',
            professionalName: data.professional_name || 'Profissional',
            professionalId: data.professional_id,
            notes: data.notes,
          });
        }
      });

      // Agendar lembretes para cada consulta
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

      // Salvar IDs das notificações agendadas
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULED_REMINDERS,
        JSON.stringify(scheduledIds)
      );
    } catch (error) {
      console.error('Error syncing appointment reminders:', error);
    }
  }

  /**
   * Agenda um lembrete para uma consulta específica
   */
  private async scheduleReminder(
    appointment: Appointment,
    hoursBefore: number
  ): Promise<string | null> {
    try {
      // Calcular data/hora do lembrete
      const reminderDate = new Date(appointment.date);
      reminderDate.setHours(reminderDate.getHours() - hoursBefore);

      // Verificar se a data do lembrete já passou
      if (reminderDate < new Date()) {
        return null;
      }

      const identifier = `appointment-reminder-${appointment.id}-${hoursBefore}h`;

      let message = '';
      if (hoursBefore >= 24) {
        const days = Math.floor(hoursBefore / 24);
        message = `Sua consulta de ${appointment.type} é em ${days} dia${days !== 1 ? 's' : ''}.`;
      } else if (hoursBefore === 1) {
        message = `Sua consulta de ${appointment.type} é em 1 hora.`;
      } else {
        message = `Sua consulta de ${appointment.type} é em ${hoursBefore} horas.`;
      }

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: '📅 Lembrete de Consulta',
          body: `${message}\nCom ${appointment.professionalName} às ${appointment.time}.`,
          data: {
            type: 'appointment_reminder',
            appointmentId: appointment.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE_TRIGGER,
          date: reminderDate,
        },
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling appointment reminder:', error);
      return null;
    }
  }

  /**
   * Cancela todos os lembretes de consultas
   */
  async cancelAll(): Promise<void> {
    try {
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_REMINDERS);
      if (storedIds) {
        const ids = JSON.parse(storedIds);
        await Promise.all(
          ids.map((id: string) => Notifications.cancelScheduledNotificationAsync(id))
        );
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULED_REMINDERS);
    } catch (error) {
      console.error('Error canceling appointment reminders:', error);
    }
  }

  /**
   * Solicita permissões para notificações
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Retorna os lembretes agendados
   */
  async getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_REMINDERS);

      if (!storedIds) {
        return [];
      }

      const ids = JSON.parse(storedIds);
      return allScheduled.filter((n) => ids.includes(n.identifier));
    } catch (error) {
      console.error('Error getting scheduled appointment reminders:', error);
      return [];
    }
  }
}

/**
 * Hook React para gerenciar lembretes de consultas
 */
export function useAppointmentReminders(userId?: string) {
  const [reminders] = useState(() => new AppointmentReminders(userId));

  useEffect(() => {
    reminders.initialize();
  }, []);

  return {
    config: reminders.getConfig(),
    updateConfig: reminders.updateConfig.bind(reminders),
    syncWithAppointments: reminders.syncWithAppointments.bind(reminders),
    cancelAll: reminders.cancelAll.bind(reminders),
    requestPermissions: reminders.requestPermissions.bind(reminders),
    getScheduledReminders: reminders.getScheduledReminders.bind(reminders),
  };
}

/**
 * Função helper para criar um lembrete de consulta específico
 */
export async function createAppointmentReminder(
  appointment: Appointment,
  hoursBefore: number = 24
): Promise<string | null> {
  const identifier = `appointment-reminder-${appointment.id}-${hoursBefore}h`;

  const reminderDate = new Date(appointment.date);
  reminderDate.setHours(reminderDate.getHours() - hoursBefore);

  if (reminderDate < new Date()) {
    return null;
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: '📅 Lembrete de Consulta',
      body: `Sua consulta de ${appointment.type} é em ${hoursBefore} horas.\nCom ${appointment.professionalName} às ${appointment.time}.`,
      data: {
        type: 'appointment_reminder',
        appointmentId: appointment.id,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE_TRIGGER,
      date: reminderDate,
    },
  });

  return identifier;
}

/**
 * Função helper para cancelar um lembrete de consulta específico
 */
export async function cancelAppointmentReminder(
  appointmentId: string,
  hoursBefore: number
): Promise<void> {
  const identifier = `appointment-reminder-${appointmentId}-${hoursBefore}h`;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export default AppointmentReminders;
