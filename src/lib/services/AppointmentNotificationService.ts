import { supabase } from '@/integrations/supabase/client'
import { NotificationType } from '@/types/notifications'
import { logger } from '@/lib/errors/logger'

export interface Appointment {
  id: string
  patient_id: string
  therapist_id: string
  appointment_date: string
  appointment_time: string
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
}

export class AppointmentNotificationService {
  private static instance: AppointmentNotificationService

  private constructor() {}

  static getInstance(): AppointmentNotificationService {
    if (!AppointmentNotificationService.instance) {
      AppointmentNotificationService.instance = new AppointmentNotificationService()
    }
    return AppointmentNotificationService.instance
  }

  /**
   * Handle appointment creation - schedule reminder notifications
   */
  async handleAppointmentCreated(appointment: Appointment): Promise<void> {
    try {
      logger.info('Processing appointment creation notifications', { appointmentId: appointment.id }, 'AppointmentNotificationService')

      // Send event to process-notification-events function
      await this.triggerNotificationEvent('appointment_created', {
        appointmentId: appointment.id,
        patient_id: appointment.patient_id,
        therapist_id: appointment.therapist_id,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        status: appointment.status
      })

      // Schedule 24h reminder
      await this.scheduleAppointmentReminder(appointment, 24)
      
      // Schedule 2h reminder
      await this.scheduleAppointmentReminder(appointment, 2)

      logger.info('Appointment notifications scheduled', { appointmentId: appointment.id }, 'AppointmentNotificationService')
    } catch (error) {
      logger.error('Failed to handle appointment creation', error, 'AppointmentNotificationService')
      throw error
    }
  }

  /**
   * Handle appointment updates - notify about changes
   */
  async handleAppointmentUpdated(appointment: Appointment, previousData?: Partial<Appointment>): Promise<void> {
    try {
      logger.info('Processing appointment update notifications', { appointmentId: appointment.id }, 'AppointmentNotificationService')

      // Check if date/time changed
      const dateChanged = previousData?.appointment_date !== appointment.appointment_date
      const timeChanged = previousData?.appointment_time !== appointment.appointment_time
      const statusChanged = previousData?.status !== appointment.status

      if (dateChanged || timeChanged) {
        // Send immediate notification about reschedule
        await this.sendAppointmentChangeNotification(appointment, 'rescheduled')
        
        // Cancel old reminders and schedule new ones
        await this.rescheduleAppointmentReminders(appointment)
      }

      if (statusChanged && appointment.status === 'cancelled') {
        // Send cancellation notification
        await this.sendAppointmentChangeNotification(appointment, 'cancelled')
      }

      if (statusChanged && appointment.status === 'confirmed') {
        // Send confirmation notification
        await this.sendAppointmentChangeNotification(appointment, 'confirmed')
      }

      // Trigger general update event
      await this.triggerNotificationEvent('appointment_updated', {
        appointmentId: appointment.id,
        patient_id: appointment.patient_id,
        therapist_id: appointment.therapist_id,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        status: appointment.status,
        changes: {
          dateChanged,
          timeChanged,
          statusChanged
        }
      })

      logger.info('Appointment update notifications processed', { appointmentId: appointment.id }, 'AppointmentNotificationService')
    } catch (error) {
      logger.error('Failed to handle appointment update', error, 'AppointmentNotificationService')
      throw error
    }
  }

  /**
   * Handle appointment confirmation by patient
   */
  async handleAppointmentConfirmed(appointmentId: string, patientId: string): Promise<void> {
    try {
      // Update appointment status
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId)
        .eq('patient_id', patientId)

      if (error) {
        throw error
      }

      // Get appointment details
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

      if (appointment) {
        // Notify therapist about confirmation
        await this.sendNotificationToUser(appointment.therapist_id, {
          type: NotificationType.SYSTEM_ALERT,
          title: 'Consulta Confirmada',
          body: `Paciente confirmou a consulta de ${appointment.appointment_date} às ${appointment.appointment_time}`,
          data: {
            appointmentId: appointment.id,
            action: 'confirmed',
            patientId: appointment.patient_id
          }
        })
      }

      logger.info('Appointment confirmation processed', { appointmentId }, 'AppointmentNotificationService')
    } catch (error) {
      logger.error('Failed to handle appointment confirmation', error, 'AppointmentNotificationService')
      throw error
    }
  }

  /**
   * Handle appointment cancellation by patient
   */
  async handleAppointmentCancelled(appointmentId: string, patientId: string, reason?: string): Promise<void> {
    try {
      // Update appointment status
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          notes: reason ? `Cancelado pelo paciente: ${reason}` : 'Cancelado pelo paciente'
        })
        .eq('id', appointmentId)
        .eq('patient_id', patientId)

      if (error) {
        throw error
      }

      // Get appointment details
      const { data: appointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

      if (appointment) {
        // Notify therapist about cancellation
        await this.sendNotificationToUser(appointment.therapist_id, {
          type: NotificationType.SYSTEM_ALERT,
          title: 'Consulta Cancelada',
          body: `Paciente cancelou a consulta de ${appointment.appointment_date} às ${appointment.appointment_time}${reason ? `. Motivo: ${reason}` : ''}`,
          data: {
            appointmentId: appointment.id,
            action: 'cancelled',
            patientId: appointment.patient_id,
            reason
          }
        })
      }

      logger.info('Appointment cancellation processed', { appointmentId }, 'AppointmentNotificationService')
    } catch (error) {
      logger.error('Failed to handle appointment cancellation', error, 'AppointmentNotificationService')
      throw error
    }
  }

  /**
   * Schedule appointment reminder notification
   */
  private async scheduleAppointmentReminder(appointment: Appointment, hoursBeforeAppointment: number): Promise<void> {
    try {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
      const reminderTime = new Date(appointmentDateTime.getTime() - (hoursBeforeAppointment * 60 * 60 * 1000))

      // Only schedule if reminder time is in the future
      if (reminderTime > new Date()) {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-notifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: appointment.patient_id,
            type: NotificationType.APPOINTMENT_REMINDER,
            scheduleAt: reminderTime.toISOString(),
            data: {
              appointmentId: appointment.id,
              date: appointment.appointment_date,
              time: appointment.appointment_time,
              hoursBeforeAppointment,
              therapistId: appointment.therapist_id
            }
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to schedule reminder: ${response.statusText}`)
        }

        logger.info(`${hoursBeforeAppointment}h reminder scheduled`, { 
          appointmentId: appointment.id, 
          reminderTime: reminderTime.toISOString() 
        }, 'AppointmentNotificationService')
      }
    } catch (error) {
      logger.error(`Failed to schedule ${hoursBeforeAppointment}h reminder`, error, 'AppointmentNotificationService')
    }
  }

  /**
   * Send immediate appointment change notification
   */
  private async sendAppointmentChangeNotification(appointment: Appointment, changeType: 'rescheduled' | 'cancelled' | 'confirmed'): Promise<void> {
    try {
      let title = 'Consulta Atualizada'
      let body = ''

      switch (changeType) {
        case 'rescheduled':
          title = 'Consulta Reagendada'
          body = `Sua consulta foi reagendada para ${appointment.appointment_date} às ${appointment.appointment_time}`
          break
        case 'cancelled':
          title = 'Consulta Cancelada'
          body = `Sua consulta de ${appointment.appointment_date} às ${appointment.appointment_time} foi cancelada`
          break
        case 'confirmed':
          title = 'Consulta Confirmada'
          body = `Sua consulta de ${appointment.appointment_date} às ${appointment.appointment_time} foi confirmada`
          break
      }

      await this.sendNotificationToUser(appointment.patient_id, {
        type: NotificationType.APPOINTMENT_CHANGE,
        title,
        body,
        data: {
          appointmentId: appointment.id,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          changeType,
          therapistId: appointment.therapist_id
        }
      })
    } catch (error) {
      logger.error('Failed to send appointment change notification', error, 'AppointmentNotificationService')
    }
  }

  /**
   * Reschedule appointment reminders (cancel old, create new)
   */
  private async rescheduleAppointmentReminders(appointment: Appointment): Promise<void> {
    try {
      // Note: In a production system, you would need to implement a way to cancel scheduled notifications
      // For now, we'll just schedule new reminders
      await this.scheduleAppointmentReminder(appointment, 24)
      await this.scheduleAppointmentReminder(appointment, 2)
    } catch (error) {
      logger.error('Failed to reschedule appointment reminders', error, 'AppointmentNotificationService')
    }
  }

  /**
   * Send notification to specific user
   */
  private async sendNotificationToUser(userId: string, notification: {
    type: NotificationType
    title: string
    body: string
    data?: Record<string, any>
  }): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data || {}
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.statusText}`)
      }
    } catch (error) {
      logger.error('Failed to send notification to user', error, 'AppointmentNotificationService')
      throw error
    }
  }

  /**
   * Trigger notification event for processing
   */
  private async triggerNotificationEvent(eventType: string, data: Record<string, any>): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-notification-events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType,
          data
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to trigger notification event: ${response.statusText}`)
      }
    } catch (error) {
      logger.error('Failed to trigger notification event', error, 'AppointmentNotificationService')
    }
  }
}

// Export singleton instance
export const appointmentNotificationService = AppointmentNotificationService.getInstance()