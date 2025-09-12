import { useState, useEffect, useCallback } from 'react'
import { therapistAlertService, PatientAlert } from '@/lib/services/TherapistAlertService'
import { toast } from 'sonner'
import { logger } from '@/lib/errors/logger'
import { supabase } from '@/integrations/supabase/client'

export const useTherapistAlerts = (therapistId?: string) => {
  const [alerts, setAlerts] = useState<PatientAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load active alerts for therapist
   */
  const loadAlerts = useCallback(async () => {
    if (!therapistId) return

    try {
      setLoading(true)
      setError(null)
      
      const activeAlerts = await therapistAlertService.getActiveAlerts(therapistId)
      setAlerts(activeAlerts)
      
      logger.info('Therapist alerts loaded', { 
        therapistId, 
        alertCount: activeAlerts.length 
      }, 'useTherapistAlerts')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar alertas'
      setError(errorMessage)
      logger.error('Failed to load therapist alerts', err, 'useTherapistAlerts')
      toast.error('Erro ao carregar alertas')
    } finally {
      setLoading(false)
    }
  }, [therapistId])

  /**
   * Acknowledge an alert
   */
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    if (!therapistId) return

    try {
      await therapistAlertService.acknowledgeAlert(alertId, therapistId)
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged' }
          : alert
      ))
      
      toast.success('Alerta marcado como visto')
      logger.info('Alert acknowledged', { alertId, therapistId }, 'useTherapistAlerts')
    } catch (error) {
      logger.error('Failed to acknowledge alert', error, 'useTherapistAlerts')
      toast.error('Erro ao marcar alerta como visto')
    }
  }, [therapistId])

  /**
   * Resolve an alert
   */
  const resolveAlert = useCallback(async (alertId: string, resolution?: string) => {
    if (!therapistId) return

    try {
      await therapistAlertService.resolveAlert(alertId, therapistId, resolution)
      
      // Remove from local state
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
      
      toast.success('Alerta resolvido')
      logger.info('Alert resolved', { alertId, therapistId }, 'useTherapistAlerts')
    } catch (error) {
      logger.error('Failed to resolve alert', error, 'useTherapistAlerts')
      toast.error('Erro ao resolver alerta')
    }
  }, [therapistId])

  /**
   * Monitor patient activity (trigger alert check)
   */
  const monitorPatient = useCallback(async (patientId: string) => {
    try {
      await therapistAlertService.monitorPatientActivity(patientId)
      
      // Reload alerts to get any new ones
      await loadAlerts()
      
      logger.info('Patient monitoring completed', { patientId, therapistId }, 'useTherapistAlerts')
    } catch (error) {
      logger.error('Failed to monitor patient', error, 'useTherapistAlerts')
      toast.error('Erro ao monitorar paciente')
    }
  }, [therapistId, loadAlerts])

  /**
   * Batch monitor multiple patients
   */
  const monitorMultiplePatients = useCallback(async (patientIds: string[]) => {
    const results = {
      success: 0,
      failed: 0,
      newAlerts: 0
    }

    const initialAlertCount = alerts.length

    for (const patientId of patientIds) {
      try {
        await therapistAlertService.monitorPatientActivity(patientId)
        results.success++
      } catch (error) {
        results.failed++
        logger.error('Failed to monitor patient in batch', error, 'useTherapistAlerts')
      }
    }

    // Reload alerts to get any new ones
    await loadAlerts()
    results.newAlerts = alerts.length - initialAlertCount

    if (results.success > 0) {
      toast.success(`${results.success} pacientes monitorados`)
    }

    if (results.failed > 0) {
      toast.error(`Falha ao monitorar ${results.failed} pacientes`)
    }

    if (results.newAlerts > 0) {
      toast.info(`${results.newAlerts} novos alertas gerados`)
    }

    return results
  }, [alerts.length, loadAlerts])

  /**
   * Get alerts by severity
   */
  const getAlertsBySeverity = useCallback((severity: 'low' | 'medium' | 'high' | 'critical') => {
    return alerts.filter(alert => alert.severity === severity)
  }, [alerts])

  /**
   * Get alerts by type
   */
  const getAlertsByType = useCallback((type: string) => {
    return alerts.filter(alert => alert.alert_type === type)
  }, [alerts])

  /**
   * Get unacknowledged alerts count
   */
  const unacknowledgedCount = alerts.filter(alert => alert.status === 'active').length

  /**
   * Get critical alerts count
   */
  const criticalCount = alerts.filter(alert => alert.severity === 'critical').length

  /**
   * Get high priority alerts (critical + high severity)
   */
  const highPriorityAlerts = alerts.filter(alert => 
    alert.severity === 'critical' || alert.severity === 'high'
  )

  // Load alerts on mount and when therapistId changes
  useEffect(() => {
    if (therapistId) {
      loadAlerts()
    }
  }, [therapistId, loadAlerts])

  // Set up real-time subscription for new alerts
  useEffect(() => {
    if (!therapistId) return

    const subscription = supabase
      .channel('therapist-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patient_alerts',
          filter: `therapist_id=eq.${therapistId}`
        },
        (payload) => {
          const newAlert = payload.new as PatientAlert
          setAlerts(prev => [newAlert, ...prev])
          
          // Show toast for new critical alerts
          if (newAlert.severity === 'critical') {
            toast.error(`🚨 ${newAlert.title}`, {
              description: newAlert.description,
              duration: 10000
            })
          } else if (newAlert.severity === 'high') {
            toast.warning(`⚠️ ${newAlert.title}`, {
              description: newAlert.description,
              duration: 7000
            })
          }
          
          logger.info('New alert received via real-time', { 
            alertId: newAlert.id,
            severity: newAlert.severity 
          }, 'useTherapistAlerts')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_alerts',
          filter: `therapist_id=eq.${therapistId}`
        },
        (payload) => {
          const updatedAlert = payload.new as PatientAlert
          setAlerts(prev => prev.map(alert => 
            alert.id === updatedAlert.id ? updatedAlert : alert
          ))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [therapistId])

  return {
    // State
    alerts,
    loading,
    error,
    unacknowledgedCount,
    criticalCount,
    highPriorityAlerts,
    
    // Actions
    loadAlerts,
    acknowledgeAlert,
    resolveAlert,
    monitorPatient,
    monitorMultiplePatients,
    
    // Utilities
    getAlertsBySeverity,
    getAlertsByType
  }
}

export default useTherapistAlerts