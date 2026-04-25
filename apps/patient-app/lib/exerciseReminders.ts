/**
 * Exercise Reminders System
 *
 * Sistema de lembretes de exercícios usando notificações locais
 * e agendamento baseado nas preferências do usuário.
 *
 * @module lib/exerciseReminders
 */

import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { patientApi } from "./api";
import { log } from "@/lib/logger";

/**
 * Configuração de lembrete de exercícios
 */
export interface ExerciseReminderConfig {
  enabled: boolean;
  frequency: "daily" | "custom";
  times: string[]; // Horários no formato "HH:mm"
  daysOfWeek?: number[]; // 0-6 (Domingo-Sábado), null = todos os dias
  message?: string;
}

/**
 * Tipos de notificações de exercícios
 */
export type ExerciseReminderType =
  | "daily_reminder"
  | "missed_exercise"
  | "streak_reminder"
  | "completion_celebration";

/**
 * Configurações padrão de lembretes
 */
const DEFAULT_REMINDER_CONFIG: ExerciseReminderConfig = {
  enabled: false,
  frequency: "daily",
  times: ["09:00", "18:00"],
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos os dias
  message: "Hora dos exercícios! Você tem exercícios pendentes para hoje.",
};

/**
 * Chaves para armazenamento local
 */
const STORAGE_KEYS = {
  REMINDER_CONFIG: "@fisioflow_exercise_reminders",
  NOTIFICATION_IDS: "@fisioflow_reminder_notification_ids",
};

/**
 * Classe gerenciadora de lembretes de exercícios
 */
export class ExerciseReminders {
  private userId: string | undefined;
  private config: ExerciseReminderConfig = DEFAULT_REMINDER_CONFIG;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Inicializa o sistema de lembretes
   */
  async initialize(): Promise<void> {
    // Carregar configuração salva
    await this.loadConfig();

    // Configurar handler de notificações
    this.setupNotificationHandler();
  }

  /**
   * Configura o handler de notificações
   */
  private setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  /**
   * Carrega a configuração de lembretes
   */
  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.REMINDER_CONFIG);
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (error) {
      log.error("Error loading reminder config:", error);
    }
  }

  /**
   * Salva a configuração de lembretes
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDER_CONFIG, JSON.stringify(this.config));

      if (this.userId) {
        await patientApi.updateProfile({
          exercise_reminders: this.config,
        });
      }
    } catch (error) {
      log.error("Error saving reminder config:", error);
    }
  }

  /**
   * Retorna a configuração atual
   */
  getConfig(): ExerciseReminderConfig {
    return { ...this.config };
  }

  /**
   * Atualiza a configuração de lembretes
   */
  async updateConfig(updates: Partial<ExerciseReminderConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();

    // Reagendar notificações com a nova configuração
    if (this.config.enabled) {
      await this.scheduleAll();
    } else {
      await this.cancelAll();
    }
  }

  /**
   * Agenda todas as notificações baseado na configuração
   */
  async scheduleAll(): Promise<void> {
    if (!this.config.enabled || this.config.times.length === 0) {
      return;
    }

    // Cancelar notificações anteriores
    await this.cancelAll();

    const notificationIds: string[] = [];

    // Para cada horário configurado
    for (const time of this.config.times) {
      const [hours, minutes] = time.split(":").map(Number);

      // Para cada dia da semana (se configurado)
      const days = this.config.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];

      for (const day of days) {
        const id = await this.scheduleReminder({
          hour: hours,
          minute: minutes,
          dayOfWeek: day,
        });

        if (id) {
          notificationIds.push(id);
        }
      }
    }

    // Salvar IDs das notificações agendadas
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(notificationIds));
  }

  /**
   * Agenda uma notificação de lembrete
   */
  private async scheduleReminder({
    hour,
    minute,
    dayOfWeek,
  }: {
    hour: number;
    minute: number;
    dayOfWeek: number;
  }): Promise<string | null> {
    try {
      const scheduledId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Hora dos Exercícios",
          body: this.config.message || "Chegou a hora de realizar seus exercícios!",
          data: { type: "exercise_reminder" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: dayOfWeek + 1, // Notifications API usa 1-7 (Domingo-Sábado)
          hour,
          minute,
          repeats: true,
        },
      });

      return scheduledId;
    } catch (error) {
      log.error("Error scheduling reminder:", error);
      return null;
    }
  }

  /**
   * Cancela todas as notificações de exercícios
   */
  async cancelAll(): Promise<void> {
    try {
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
      if (storedIds) {
        const ids = JSON.parse(storedIds);
        await Promise.all(
          ids.map((id: string) => Notifications.cancelScheduledNotificationAsync(id)),
        );
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_IDS);
    } catch (error) {
      log.error("Error canceling reminders:", error);
    }
  }

  /**
   * Envia uma notificação de celebração ao completar exercícios
   */
  async sendCompletionNotification(count: number, streak: number): Promise<void> {
    if (!this.config.enabled) return;

    const title = "🎉 Parabéns!";
    let body = "";

    if (streak >= 7) {
      body = `Incrível! ${streak} dias seguidos de exercícios!`;
    } else if (streak >= 3) {
      body = `Ótimo trabalho! ${streak} dias consecutivos!`;
    } else {
      body = `Você completou ${count} exercício${count !== 1 ? "s" : ""} hoje!`;
    }

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // Imediato
    });
  }

  /**
   * Envia um lembrete de exercícios perdidos
   */
  async sendMissedExerciseNotification(): Promise<void> {
    if (!this.config.enabled) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Exercícios Pendentes",
        body: "Você ainda não completou seus exercícios de hoje. Vamos lá?",
        data: { type: "missed_exercise" },
      },
      trigger: null,
    });
  }

  /**
   * Solicita permissões para notificações
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus === "granted") {
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      return status === "granted";
    } catch (error) {
      log.error("Error requesting notification permissions:", error);
      return false;
    }
  }

  /**
   * Verifica o status das permissões
   */
  async getPermissionsStatus(): Promise<"granted" | "denied" | "undetermined"> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch {
      return "denied";
    }
  }

  /**
   * Retorna as notificações agendadas
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);

      if (!storedIds) {
        return [];
      }

      const ids = JSON.parse(storedIds);
      return allScheduled.filter((n) => ids.includes(n.identifier));
    } catch (error) {
      log.error("Error getting scheduled notifications:", error);
      return [];
    }
  }
}

/**
 * Hook React para gerenciar lembretes de exercícios
 */
export function useExerciseReminders(userId?: string) {
  const [reminders] = useState(() => new ExerciseReminders(userId));

  useEffect(() => {
    reminders.initialize();
  }, []);

  return {
    config: reminders.getConfig(),
    updateConfig: reminders.updateConfig.bind(reminders),
    scheduleAll: reminders.scheduleAll.bind(reminders),
    cancelAll: reminders.cancelAll.bind(reminders),
    sendCompletionNotification: reminders.sendCompletionNotification.bind(reminders),
    sendMissedExerciseNotification: reminders.sendMissedExerciseNotification.bind(reminders),
    requestPermissions: reminders.requestPermissions.bind(reminders),
    getPermissionsStatus: reminders.getPermissionsStatus.bind(reminders),
    getScheduledNotifications: reminders.getScheduledNotifications.bind(reminders),
  };
}

/**
 * Função helper para criar um lembrete simples
 */
export async function createSimpleReminder(
  hour: number,
  minute: number,
  message?: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Lembrete de Exercícios",
      body: message || "Hora de fazer seus exercícios!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

/**
 * Função helper para cancelar um lembrete específico
 */
export async function cancelReminder(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Função helper para cancelar todos os lembretes
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export default ExerciseReminders;
