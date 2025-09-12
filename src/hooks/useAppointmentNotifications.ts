import { useCallback } from 'react'
import { appointmentNotificationService, Appointment } from '@/lib/services/AppointmentNotificationService'
import { toast } from 'sonner'
import { logger } from '@/lib/errors/logger'

export const useAppointmentNotifications = () => {
  
  /**
   * Handle new appointment creation
   */
  const handleAppointmentCreated = useCallback(async (appointment: Appointment) => {
    try {
      await appointmentNotificationService.handleAppointmentCreated(appointment)
      logger.info('Appointment notifications triggered', { appointmentId: appointment.id }, 'useAppointmentNotifications')
    } catch (error) {
      logger.error('Failed to handle appointment creation', error, 'useAppointmentNotifications')
      toast.error('Erro ao configurar lembretes da consulta')
    }
  }, [])

  /**
   * Handle appointment updates
   */
  const handleAppointmentUpdated = useCallback(async (
    appointment: Appointment, 
    previousData?: Partial<Appointment>
  ) => {
    try {
      await appointmentNotificationService.handleAppointmentUpdated(appointment, previousData)
      logger.info('Appointment update notifications triggered', { appointmentId: appointment.id }, 'useAppointmentNotifications')
    } catch (error) {
      logger.error('Failed to handle appointment update', error, 'useAppointmentNotifications')
      toast.error('Erro ao atualizar notificações da consulta')
    }
  }, [])

  /**
   * Handle appointment confirmation by patient
   */
  const handleAppointmentConfirmed = useCallback(async (appointmentId: string, patientId: string) => {
    try {
      await appointmentNotificationService.handleAppointmentConfirmed(appointmentId, patientId)
      toast.success('Consulta confirmada com sucesso!')
      logger.info('Appointment confirmed', { appointmentId, patientId }, 'useAppointmentNotifications')
    } catch (error) {
      logger.error('Failed to confirm appointment', error, 'useAppointmentNotifications')
      toast.error('Erro ao confirmar consulta')
    }
  }, [])

  /**
   * Handle appointment cancellation by patient
   */
  const handleAppointmentCancelled = useCallback(async (
    appointmentId: string, 
    patientId: string, 
    reason?: string
  ) => {
    try {
      await appointmentNotificationService.handleAppointmentCancelled(appointmentId, patientId, reason)
      toast.success('Consulta cancelada')
      logger.info('Appointment cancelled', { appointmentId, patientId, reason }, 'useAppointmentNotifications')
    } catch (error) {
      logger.error('Failed to cancel appointment', error, 'useAppointmentNotifications')
      toast.error('Erro ao cancelar consulta')
    }
  }, [])

  /**
   * Batch process multiple appointments (useful for imports or bulk operations)
   */
  const handleBatchAppointments = useCallback(async (appointments: Appointment[]) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const appointment of appointments) {
      try {
        await appointmentNotificationService.handleAppointmentCreated(appointment)
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(`Erro na consulta ${appointment.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        logger.error('Failed to process batch appointment', error, 'useAppointmentNotifications')
      }
    }

    if (results.success > 0) {
      toast.success(`${results.success} consultas processadas com sucesso`)
    }

    if (results.failed > 0) {
      toast.error(`${results.failed} consultas falharam ao processar`)
      logger.error('Batch appointment processing had failures', { results }, 'useAppointmentNotifications')
    }

    return results
  }, [])

  return {
    handleAppointmentCreated,
    handleAppointmentUpdated,
    handleAppointmentConfirmed,
    handleAppointmentCancelled,
    handleBatchAppointments
  }
}

export default useAppointmentNotifications