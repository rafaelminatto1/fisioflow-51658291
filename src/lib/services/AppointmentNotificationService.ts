import { fisioLogger as logger } from '@/lib/errors/logger';
import { inngest } from '@/lib/inngest/client';
import { Events } from '@/lib/inngest/types';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/functions';

/**
 * NOTE: This service uses Firebase Cloud Functions for appointment notifications.
 * For Firebase, you need to implement Firebase Cloud Functions to:
 * 1. Schedule notifications for appointments
 * 2. Send notifications via FCM or other channels
 * 3. Handle reschedule and cancellation notifications
 *
 * The current implementation uses Inngest for scheduling.
 */
export class AppointmentNotificationService {
  /**
   * Schedule notification for an appointment
   * NOTE: Requires Firebase Cloud Function implementation
   */
  static async scheduleNotification(
    appointmentId: string,
    patientId: string,
    date: Date,
    time: string,
    patientName: string
  ) {
    try {
      if (!appointmentId || !patientId || !date || !time) {
        logger.error('Dados incompletos para notificação', { appointmentId, patientId, date, time }, 'AppointmentNotificationService');
        return null;
      }

      logger.info('Agendando notificação para consulta', { appointmentId, date, time }, 'AppointmentNotificationService');

      // Trigger Inngest Event
      await inngest.send({
        name: Events.NOTIFICATION_SEND,
        data: {
          userId: patientId,
          organizationId: 'system', // or derive from context
          type: 'push',
          data: {
            to: patientId, // For push, 'to' is userId usually, or handled by logic
            subject: 'Lembrete de Consulta',
            body: `Olá ${patientName}, você tem uma consulta agendada para ${date.toLocaleDateString('pt-BR')} às ${time}.`,
            appointmentId,
            action: 'appointment_reminder'
          }
        }
      });

      logger.info('Notificação agendada com sucesso (placeholder)', { appointmentId }, 'AppointmentNotificationService');
      return { success: true, appointmentId };
    } catch (error) {
      logger.error('Falha ao agendar notificação', error, 'AppointmentNotificationService');
      // Don't fail the appointment if notification fails
      return null;
    }
  }

  /**
   * Notify about reschedule
   * NOTE: Requires Firebase Cloud Function implementation
   */
  static async notifyReschedule(
    appointmentId: string,
    patientId: string,
    newDate: Date,
    newTime: string,
    patientName: string
  ) {
    try {
      if (!appointmentId || !patientId || !newDate || !newTime) {
        logger.error('Dados incompletos para notificação de reagendamento', { appointmentId, patientId, newDate, newTime }, 'AppointmentNotificationService');
        return null;
      }

      logger.info('Notificando reagendamento', { appointmentId, newDate, newTime }, 'AppointmentNotificationService');

      // Call Firebase Cloud Function to send reschedule notification
      const functions = getFirebaseFunctions();
      const notifyRescheduleFn = httpsCallable(functions, 'notifyAppointmentReschedule');
      await notifyRescheduleFn({
        appointmentId,
        patientId,
        newDate: newDate.toISOString(),
        newTime,
        patientName,
      });

      logger.info('Notificação de reagendamento enviada', { appointmentId }, 'AppointmentNotificationService');
      return { success: true, appointmentId };
    } catch (error) {
      logger.error('Falha ao notificar reagendamento', error, 'AppointmentNotificationService');
      return null;
    }
  }

  /**
   * Notify about cancellation
   * NOTE: Requires Firebase Cloud Function implementation
   */
  static async notifyCancellation(
    appointmentId: string,
    patientId: string,
    date: Date,
    time: string,
    patientName: string
  ) {
    try {
      if (!appointmentId || !patientId || !date || !time) {
        logger.error('Dados incompletos para notificação de cancelamento', { appointmentId, patientId, date, time }, 'AppointmentNotificationService');
        return null;
      }

      logger.info('Notificando cancelamento', { appointmentId }, 'AppointmentNotificationService');

      // Call Firebase Cloud Function to send cancellation notification
      const functions = getFirebaseFunctions();
      const notifyCancellationFn = httpsCallable(functions, 'notifyAppointmentCancellation');
      await notifyCancellationFn({
        appointmentId,
        patientId,
        date: date.toISOString(),
        time,
        patientName,
      });

      logger.info('Notificação de cancelamento enviada', { appointmentId }, 'AppointmentNotificationService');
      return { success: true, appointmentId };
    } catch (error) {
      logger.error('Falha ao notificar cancelamento', error, 'AppointmentNotificationService');
      return null;
    }
  }
}
