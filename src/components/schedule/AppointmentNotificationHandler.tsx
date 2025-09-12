import React, { useEffect } from 'react'
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/lib/errors/logger'
import { Appointment } from '@/lib/services/AppointmentNotificationService'

interface AppointmentNotificationHandlerProps {
  children: React.ReactNode
}

/**
 * Component that handles real-time appointment notifications
 * Should be placed high in the component tree to listen for appointment changes
 */
export const AppointmentNotificationHandler: React.FC<AppointmentNotificationHandlerProps> = ({ children }) => {
  const {
    handleAppointmentCreated,
    handleAppointmentUpdated
  } = useAppointmentNotifications()

  useEffect(() => {
    // Subscribe to appointment changes
    const appointmentSubscription = supabase
      .channel('appointment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments'
        },
        async (payload) => {
          try {
            const newAppointment = payload.new as Appointment
            logger.info('New appointment detected', { appointmentId: newAppointment.id }, 'AppointmentNotificationHandler')
            
            // Only process if appointment is scheduled (not draft)
            if (newAppointment.status === 'scheduled') {
              await handleAppointmentCreated(newAppointment)
            }
          } catch (error) {
            logger.error('Failed to handle new appointment', error, 'AppointmentNotificationHandler')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments'
        },
        async (payload) => {
          try {
            const updatedAppointment = payload.new as Appointment
            const previousAppointment = payload.old as Appointment
            
            logger.info('Appointment update detected', { 
              appointmentId: updatedAppointment.id,
              statusChange: `${previousAppointment.status} -> ${updatedAppointment.status}`
            }, 'AppointmentNotificationHandler')
            
            await handleAppointmentUpdated(updatedAppointment, previousAppointment)
          } catch (error) {
            logger.error('Failed to handle appointment update', error, 'AppointmentNotificationHandler')
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      appointmentSubscription.unsubscribe()
      logger.info('Appointment notification subscription cleaned up', {}, 'AppointmentNotificationHandler')
    }
  }, [handleAppointmentCreated, handleAppointmentUpdated])

  // This component doesn't render anything visible, just handles notifications
  return <>{children}</>
}

export default AppointmentNotificationHandler