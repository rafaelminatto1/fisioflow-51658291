import { supabase } from '@/integrations/supabase/client'
import { NotificationType } from '@/types/notifications'
import { logger } from '@/lib/errors/logger'

export interface PatientAlert {
  id: string
  patient_id: string
  therapist_id: string
  alert_type: 'high_pain' | 'missed_exercises' | 'missed_appointments' | 'progress_concern' | 'medication_issue'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  data: Record<string, any>
  created_at: string
  resolved_at?: string
  resolved_by?: string
  status: 'active' | 'acknowledged' | 'resolved'
}

export interface PatientProgressData {
  patient_id: string
  therapist_id: string
  pain_levels: number[]
  exercise_completion_rate: number
  appointment_attendance_rate: number
  last_activity_date: string
  concerning_trends: string[]
}

export class TherapistAlertService {
  private static instance: TherapistAlertService

  private constructor() {}

  static getInstance(): TherapistAlertService {
    if (!TherapistAlertService.instance) {
      TherapistAlertService.instance = new TherapistAlertService()
    }
    return TherapistAlertService.instance
  }

  /**
   * Monitor patient activity and generate alerts for therapists
   */
  async monitorPatientActivity(patientId: string): Promise<void> {
    try {
      logger.info('Monitoring patient activity', { patientId }, 'TherapistAlertService')

      // Get patient's therapist
      const { data: patient } = await supabase
        .from('patients')
        .select('*, therapist_id')
        .eq('id', patientId)
        .single()

      if (!patient || !patient.therapist_id) {
        return
      }

      // Check for various alert conditions
      await Promise.all([
        this.checkHighPainReports(patientId, patient.therapist_id),
        this.checkMissedExercises(patientId, patient.therapist_id),
        this.checkMissedAppointments(patientId, patient.therapist_id),
        this.checkProgressConcerns(patientId, patient.therapist_id),
        this.checkInactivityPeriod(patientId, patient.therapist_id)
      ])

      logger.info('Patient activity monitoring completed', { patientId }, 'TherapistAlertService')
    } catch (error) {
      logger.error('Failed to monitor patient activity', error, 'TherapistAlertService')
    }
  }

  /**
   * Check for high pain level reports
   */
  private async checkHighPainReports(patientId: string, therapistId: string): Promise<void> {
    try {
      // Check recent exercise completions with high pain levels
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      
      const { data: highPainReports } = await supabase
        .from('exercise_completions')
        .select('*')
        .eq('patient_id', patientId)
        .gte('completed_at', threeDaysAgo.toISOString())
        .gte('pain_level', 7)
        .order('completed_at', { ascending: false })

      if (highPainReports && highPainReports.length >= 2) {
        // Multiple high pain reports in 3 days
        await this.createAlert({
          patient_id: patientId,
          therapist_id: therapistId,
          alert_type: 'high_pain',
          severity: 'high',
          title: 'Múltiplos Relatos de Dor Alta',
          description: `Paciente relatou dor ≥7/10 em ${highPainReports.length} exercícios nos últimos 3 dias`,
          data: {
            pain_reports: highPainReports.length,
            highest_pain: Math.max(...highPainReports.map(r => r.pain_level)),
            period_days: 3,
            recent_reports: highPainReports.slice(0, 3)
          }
        })
      } else if (highPainReports && highPainReports.length === 1 && highPainReports[0].pain_level >= 9) {
        // Single very high pain report
        await this.createAlert({
          patient_id: patientId,
          therapist_id: therapistId,
          alert_type: 'high_pain',
          severity: 'critical',
          title: 'Dor Muito Alta Relatada',
          description: `Paciente relatou dor ${highPainReports[0].pain_level}/10 durante exercício`,
          data: {
            pain_level: highPainReports[0].pain_level,
            completion_id: highPainReports[0].id,
            reported_at: highPainReports[0].completed_at
          }
        })
      }
    } catch (error) {
      logger.error('Failed to check high pain reports', error, 'TherapistAlertService')
    }
  }

  /**
   * Check for missed exercises pattern
   */
  private async checkMissedExercises(patientId: string, therapistId: string): Promise<void> {
    try {
      // Get active prescriptions
      const { data: prescriptions } = await supabase
        .from('exercise_prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active')

      if (!prescriptions || prescriptions.length === 0) {
        return
      }

      // Check exercise completion rate in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      const { data: completions } = await supabase
        .from('exercise_completions')
        .select('*')
        .eq('patient_id', patientId)
        .gte('completed_at', sevenDaysAgo.toISOString())

      // Calculate expected vs actual completions
      const expectedCompletions = prescriptions.reduce((total, p) => 
        total + (p.frequency_per_day * p.frequency_per_week), 0
      )
      const actualCompletions = completions ? completions.length : 0
      const completionRate = expectedCompletions > 0 ? (actualCompletions / expectedCompletions) * 100 : 0

      if (completionRate < 30) {
        // Very low completion rate
        await this.createAlert({
          patient_id: patientId,
          therapist_id: therapistId,
          alert_type: 'missed_exercises',
          severity: completionRate < 10 ? 'critical' : 'high',
          title: 'Baixa Adesão aos Exercícios',
          description: `Taxa de conclusão de exercícios: ${completionRate.toFixed(1)}% nos últimos 7 dias`,
          data: {
            completion_rate: completionRate,
            expected_completions: expectedCompletions,
            actual_completions: actualCompletions,
            period_days: 7,
            active_prescriptions: prescriptions.length
          }
        })
      }
    } catch (error) {
      logger.error('Failed to check missed exercises', error, 'TherapistAlertService')
    }
  }

  /**
   * Check for missed appointments pattern
   */
  private async checkMissedAppointments(patientId: string, therapistId: string): Promise<void> {
    try {
      // Check appointments in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('therapist_id', therapistId)
        .gte('appointment_date', thirtyDaysAgo.toISOString().split('T')[0])

      if (!appointments || appointments.length === 0) {
        return
      }

      const totalAppointments = appointments.length
      const missedAppointments = appointments.filter(a => a.status === 'cancelled').length
      const missedRate = (missedAppointments / totalAppointments) * 100

      // Check for recent consecutive cancellations
      const recentAppointments = appointments
        .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
        .slice(0, 3)
      
      const consecutiveCancellations = recentAppointments.filter(a => a.status === 'cancelled').length

      if (missedRate > 50 || consecutiveCancellations >= 2) {
        await this.createAlert({
          patient_id: patientId,
          therapist_id: therapistId,
          alert_type: 'missed_appointments',
          severity: consecutiveCancellations >= 3 ? 'critical' : 'high',
          title: 'Padrão de Faltas em Consultas',
          description: `${missedRate.toFixed(1)}% de faltas nos últimos 30 dias (${consecutiveCancellations} cancelamentos recentes)`,
          data: {
            missed_rate: missedRate,
            total_appointments: totalAppointments,
            missed_appointments: missedAppointments,
            consecutive_cancellations: consecutiveCancellations,
            period_days: 30
          }
        })
      }
    } catch (error) {
      logger.error('Failed to check missed appointments', error, 'TherapistAlertService')
    }
  }

  /**
   * Check for concerning progress trends
   */
  private async checkProgressConcerns(patientId: string, therapistId: string): Promise<void> {
    try {
      // Get recent pain level trends from exercise completions
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      
      const { data: completions } = await supabase
        .from('exercise_completions')
        .select('pain_level, difficulty_rating, completed_at')
        .eq('patient_id', patientId)
        .gte('completed_at', twoWeeksAgo.toISOString())
        .not('pain_level', 'is', null)
        .order('completed_at', { ascending: true })

      if (!completions || completions.length < 5) {
        return // Not enough data
      }

      // Analyze trends
      const painLevels = completions.map(c => c.pain_level)
      const recentPain = painLevels.slice(-3).reduce((sum, p) => sum + p, 0) / 3
      const earlierPain = painLevels.slice(0, 3).reduce((sum, p) => sum + p, 0) / 3
      const painTrend = recentPain - earlierPain

      // Check for worsening pain trend
      if (painTrend > 1.5) {
        await this.createAlert({
          patient_id: patientId,
          therapist_id: therapistId,
          alert_type: 'progress_concern',
          severity: painTrend > 2.5 ? 'high' : 'medium',
          title: 'Tendência de Piora na Dor',
          description: `Nível de dor aumentou em média ${painTrend.toFixed(1)} pontos nas últimas semanas`,
          data: {
            pain_trend: painTrend,
            recent_average_pain: recentPain,
            earlier_average_pain: earlierPain,
            total_reports: completions.length,
            period_days: 14
          }
        })
      }

      // Check for consistently high difficulty ratings
      const difficultyRatings = completions
        .filter(c => c.difficulty_rating !== null)
        .map(c => c.difficulty_rating)
      
      if (difficultyRatings.length >= 3) {
        const avgDifficulty = difficultyRatings.reduce((sum, d) => sum + d, 0) / difficultyRatings.length
        
        if (avgDifficulty > 8) {
          await this.createAlert({
            patient_id: patientId,
            therapist_id: therapistId,
            alert_type: 'progress_concern',
            severity: 'medium',
            title: 'Exercícios Muito Difíceis',
            description: `Dificuldade média relatada: ${avgDifficulty.toFixed(1)}/10. Considere ajustar prescrição.`,
            data: {
              average_difficulty: avgDifficulty,
              difficulty_reports: difficultyRatings.length,
              period_days: 14
            }
          })
        }
      }
    } catch (error) {
      logger.error('Failed to check progress concerns', error, 'TherapistAlertService')
    }
  }

  /**
   * Check for extended inactivity periods
   */
  private async checkInactivityPeriod(patientId: string, therapistId: string): Promise<void> {
    try {
      // Check last activity (exercise completion or appointment)
      const [exerciseResult, appointmentResult] = await Promise.all([
        supabase
          .from('exercise_completions')
          .select('completed_at')
          .eq('patient_id', patientId)
          .order('completed_at', { ascending: false })
          .limit(1),
        supabase
          .from('appointments')
          .select('appointment_date')
          .eq('patient_id', patientId)
          .eq('status', 'completed')
          .order('appointment_date', { ascending: false })
          .limit(1)
      ])

      const lastExercise = exerciseResult.data?.[0]?.completed_at
      const lastAppointment = appointmentResult.data?.[0]?.appointment_date

      let lastActivity: Date | null = null
      
      if (lastExercise && lastAppointment) {
        lastActivity = new Date(Math.max(
          new Date(lastExercise).getTime(),
          new Date(lastAppointment).getTime()
        ))
      } else if (lastExercise) {
        lastActivity = new Date(lastExercise)
      } else if (lastAppointment) {
        lastActivity = new Date(lastAppointment)
      }

      if (lastActivity) {
        const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))
        
        if (daysSinceActivity >= 7) {
          await this.createAlert({
            patient_id: patientId,
            therapist_id: therapistId,
            alert_type: 'missed_exercises',
            severity: daysSinceActivity >= 14 ? 'high' : 'medium',
            title: 'Paciente Inativo',
            description: `Sem atividade há ${daysSinceActivity} dias. Última atividade: ${lastActivity.toLocaleDateString('pt-BR')}`,
            data: {
              days_inactive: daysSinceActivity,
              last_activity: lastActivity.toISOString(),
              last_exercise: lastExercise,
              last_appointment: lastAppointment
            }
          })
        }
      }
    } catch (error) {
      logger.error('Failed to check inactivity period', error, 'TherapistAlertService')
    }
  }

  /**
   * Create and send alert to therapist
   */
  private async createAlert(alertData: Omit<PatientAlert, 'id' | 'created_at' | 'status'>): Promise<void> {
    try {
      // Check if similar alert already exists and is active
      const { data: existingAlert } = await supabase
        .from('patient_alerts')
        .select('*')
        .eq('patient_id', alertData.patient_id)
        .eq('therapist_id', alertData.therapist_id)
        .eq('alert_type', alertData.alert_type)
        .eq('status', 'active')
        .single()

      if (existingAlert) {
        // Update existing alert instead of creating duplicate
        await supabase
          .from('patient_alerts')
          .update({
            description: alertData.description,
            data: alertData.data,
            severity: alertData.severity
          })
          .eq('id', existingAlert.id)
        
        return
      }

      // Create new alert
      const { data: newAlert, error } = await supabase
        .from('patient_alerts')
        .insert([{
          ...alertData,
          status: 'active'
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      // Send notification to therapist
      await this.sendNotificationToUser(alertData.therapist_id, {
        type: NotificationType.SYSTEM_ALERT,
        title: `🚨 ${alertData.title}`,
        body: alertData.description,
        data: {
          alertId: newAlert.id,
          patientId: alertData.patient_id,
          alertType: alertData.alert_type,
          severity: alertData.severity,
          action: 'review_patient'
        }
      })

      logger.info('Therapist alert created and sent', { 
        alertId: newAlert.id, 
        type: alertData.alert_type,
        severity: alertData.severity 
      }, 'TherapistAlertService')
    } catch (error) {
      logger.error('Failed to create alert', error, 'TherapistAlertService')
    }
  }

  /**
   * Acknowledge alert (mark as seen by therapist)
   */
  async acknowledgeAlert(alertId: string, therapistId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patient_alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: therapistId
        })
        .eq('id', alertId)
        .eq('therapist_id', therapistId)

      if (error) {
        throw error
      }

      logger.info('Alert acknowledged', { alertId, therapistId }, 'TherapistAlertService')
    } catch (error) {
      logger.error('Failed to acknowledge alert', error, 'TherapistAlertService')
      throw error
    }
  }

  /**
   * Resolve alert (mark as handled)
   */
  async resolveAlert(alertId: string, therapistId: string, resolution?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patient_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: therapistId,
          resolution_notes: resolution
        })
        .eq('id', alertId)
        .eq('therapist_id', therapistId)

      if (error) {
        throw error
      }

      logger.info('Alert resolved', { alertId, therapistId }, 'TherapistAlertService')
    } catch (error) {
      logger.error('Failed to resolve alert', error, 'TherapistAlertService')
      throw error
    }
  }

  /**
   * Get active alerts for therapist
   */
  async getActiveAlerts(therapistId: string): Promise<PatientAlert[]> {
    try {
      const { data: alerts, error } = await supabase
        .from('patient_alerts')
        .select(`
          *,
          patients (
            name,
            email,
            phone
          )
        `)
        .eq('therapist_id', therapistId)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return alerts || []
    } catch (error) {
      logger.error('Failed to get active alerts', error, 'TherapistAlertService')
      return []
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
      logger.error('Failed to send notification to user', error, 'TherapistAlertService')
    }
  }
}

// Export singleton instance
export const therapistAlertService = TherapistAlertService.getInstance()