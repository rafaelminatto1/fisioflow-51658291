import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';

export class AppointmentNotificationService {
  /**
   * Agenda notificação para um agendamento criado
   */
  static async scheduleNotification(
    appointmentId: string, 
    patientId: string,
    date: Date, 
    time: string,
    patientName: string
  ) {
    try {
      logger.info('Agendando notificação para consulta', { appointmentId, date, time }, 'AppointmentNotificationService');

      // Chamar edge function para agendar notificação
      const { data, error } = await supabase.functions.invoke('schedule-notifications', {
        body: {
          userId: patientId,
          type: 'appointment_created',
          scheduleAt: new Date().toISOString(), // Enviar imediatamente
          data: {
            appointmentId,
            patientName,
            date: date.toLocaleDateString('pt-BR'),
            time,
          }
        }
      });

      if (error) {
        logger.error('Erro ao agendar notificação', error, 'AppointmentNotificationService');
        throw error;
      }

      logger.info('Notificação agendada com sucesso', { appointmentId, result: data }, 'AppointmentNotificationService');
      return data;
    } catch (error) {
      logger.error('Falha ao agendar notificação', error, 'AppointmentNotificationService');
      // Não falhar o agendamento se notificação falhar
      return null;
    }
  }

  /**
   * Notifica sobre reagendamento
   */
  static async notifyReschedule(
    appointmentId: string,
    patientId: string,
    newDate: Date,
    newTime: string,
    patientName: string
  ) {
    try {
      logger.info('Notificando reagendamento', { appointmentId, newDate, newTime }, 'AppointmentNotificationService');

      const { data, error } = await supabase.functions.invoke('schedule-notifications', {
        body: {
          userId: patientId,
          type: 'appointment_rescheduled',
          scheduleAt: new Date().toISOString(),
          data: {
            appointmentId,
            patientName,
            date: newDate.toLocaleDateString('pt-BR'),
            time: newTime,
          }
        }
      });

      if (error) {
        logger.error('Erro ao notificar reagendamento', error, 'AppointmentNotificationService');
        throw error;
      }

      logger.info('Notificação de reagendamento enviada', { appointmentId }, 'AppointmentNotificationService');
      return data;
    } catch (error) {
      logger.error('Falha ao notificar reagendamento', error, 'AppointmentNotificationService');
      return null;
    }
  }

  /**
   * Notifica sobre cancelamento
   */
  static async notifyCancellation(
    appointmentId: string,
    patientId: string,
    date: Date,
    time: string,
    patientName: string
  ) {
    try {
      logger.info('Notificando cancelamento', { appointmentId }, 'AppointmentNotificationService');

      const { data, error } = await supabase.functions.invoke('schedule-notifications', {
        body: {
          userId: patientId,
          type: 'appointment_cancelled',
          scheduleAt: new Date().toISOString(),
          data: {
            appointmentId,
            patientName,
            date: date.toLocaleDateString('pt-BR'),
            time,
          }
        }
      });

      if (error) {
        logger.error('Erro ao notificar cancelamento', error, 'AppointmentNotificationService');
        throw error;
      }

      logger.info('Notificação de cancelamento enviada', { appointmentId }, 'AppointmentNotificationService');
      return data;
    } catch (error) {
      logger.error('Falha ao notificar cancelamento', error, 'AppointmentNotificationService');
      return null;
    }
  }
}