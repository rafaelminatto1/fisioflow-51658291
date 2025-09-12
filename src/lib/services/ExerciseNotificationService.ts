import { supabase } from '@/integrations/supabase/client'
import { NotificationType } from '@/types/notifications'
import { logger } from '@/lib/errors/logger'

export interface ExercisePrescription {
  id: string
  patient_id: string
  therapist_id: string
  exercise_id: string
  frequency_per_day: number
  frequency_per_week: number
  duration_weeks: number
  start_date: string
  end_date?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  reminder_times?: string[] // Array of times like ["09:00", "15:00", "21:00"]
  notes?: string
}

export interface ExerciseCompletion {
  id: string
  prescription_id: string
  patient_id: string
  completed_at: string
  duration_minutes?: number
  difficulty_rating?: number
  pain_level?: number
  notes?: string
}

export interface ExerciseMilestone {
  type: 'streak' | 'total_count' | 'weekly_goal' | 'monthly_goal'
  value: number
  description: string
}

export class ExerciseNotificationService {
  private static instance: ExerciseNotificationService

  private constructor() {}

  static getInstance(): ExerciseNotificationService {
    if (!ExerciseNotificationService.instance) {
      ExerciseNotificationService.instance = new ExerciseNotificationService()
    }
    return ExerciseNotificationService.instance
  }

  /**
   * Handle new exercise prescription - set up reminder schedule
   */
  async handleExercisePrescribed(prescription: ExercisePrescription): Promise<void> {
    try {
      logger.info('Processing exercise prescription notifications', { prescriptionId: prescription.id }, 'ExerciseNotificationService')

      // Send immediate notification about new prescription
      await this.sendNotificationToUser(prescription.patient_id, {
        type: NotificationType.EXERCISE_REMINDER,
        title: 'Novos Exercícios Prescritos! 💪',
        body: `Seu fisioterapeuta prescreveu novos exercícios. ${prescription.frequency_per_day} vez(es) por dia, ${prescription.frequency_per_week} dias por semana.`,
        data: {
          prescriptionId: prescription.id,
          exerciseId: prescription.exercise_id,
          therapistId: prescription.therapist_id,
          action: 'view_exercises'
        }
      })

      // Set up recurring reminders based on frequency
      await this.setupExerciseReminders(prescription)

      // Trigger notification event
      await this.triggerNotificationEvent('exercise_prescribed', {
        prescriptionId: prescription.id,
        patient_id: prescription.patient_id,
        therapist_id: prescription.therapist_id,
        exercise_id: prescription.exercise_id,
        frequency_per_day: prescription.frequency_per_day,
        frequency_per_week: prescription.frequency_per_week
      })

      logger.info('Exercise prescription notifications set up', { prescriptionId: prescription.id }, 'ExerciseNotificationService')
    } catch (error) {
      logger.error('Failed to handle exercise prescription', error, 'ExerciseNotificationService')
      throw error
    }
  }

  /**
   * Handle exercise completion - check for milestones and streaks
   */
  async handleExerciseCompleted(completion: ExerciseCompletion): Promise<void> {
    try {
      logger.info('Processing exercise completion', { completionId: completion.id }, 'ExerciseNotificationService')

      // Get prescription details
      const { data: prescription } = await supabase
        .from('exercise_prescriptions')
        .select('*')
        .eq('id', completion.prescription_id)
        .single()

      if (!prescription) {
        throw new Error('Prescription not found')
      }

      // Check for milestones
      const milestones = await this.checkExerciseMilestones(completion.patient_id, completion)
      
      // Send milestone notifications
      for (const milestone of milestones) {
        await this.sendMilestoneNotification(completion.patient_id, milestone)
      }

      // Check for streak achievements
      const streakInfo = await this.checkExerciseStreak(completion.patient_id)
      if (streakInfo.isNewRecord || streakInfo.isSignificantMilestone) {
        await this.sendStreakNotification(completion.patient_id, streakInfo)
      }

      // Notify therapist about completion (if high pain level reported)
      if (completion.pain_level && completion.pain_level >= 7) {
        await this.notifyTherapistAboutHighPain(prescription.therapist_id, completion, prescription)
      }

      // Trigger notification event
      await this.triggerNotificationEvent('exercise_completed', {
        completionId: completion.id,
        prescriptionId: completion.prescription_id,
        patient_id: completion.patient_id,
        therapist_id: prescription.therapist_id,
        pain_level: completion.pain_level,
        difficulty_rating: completion.difficulty_rating,
        milestones: milestones.length
      })

      logger.info('Exercise completion processed', { completionId: completion.id }, 'ExerciseNotificationService')
    } catch (error) {
      logger.error('Failed to handle exercise completion', error, 'ExerciseNotificationService')
      throw error
    }
  }

  /**
   * Handle missed exercises - send motivational reminders
   */
  async handleMissedExercises(patientId: string): Promise<void> {
    try {
      // Get active prescriptions for patient
      const { data: prescriptions } = await supabase
        .from('exercise_prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active')

      if (!prescriptions || prescriptions.length === 0) {
        return
      }

      // Check for missed exercises in the last 2 days
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const { data: recentCompletions } = await supabase
        .from('exercise_completions')
        .select('*')
        .eq('patient_id', patientId)
        .gte('completed_at', twoDaysAgo.toISOString())

      const hasRecentCompletions = recentCompletions && recentCompletions.length > 0

      if (!hasRecentCompletions) {
        // Send motivational reminder
        await this.sendNotificationToUser(patientId, {
          type: NotificationType.EXERCISE_REMINDER,
          title: 'Não desista! 💪',
          body: 'Você não fez exercícios nos últimos 2 dias. Que tal retomar hoje? Cada pequeno passo conta!',
          data: {
            type: 'motivational',
            daysMissed: 2,
            action: 'start_exercise'
          }
        })

        // Notify therapist about patient inactivity
        for (const prescription of prescriptions) {
          await this.notifyTherapistAboutInactivity(prescription.therapist_id, patientId, 2)
        }

        logger.info('Missed exercise notifications sent', { patientId }, 'ExerciseNotificationService')
      }
    } catch (error) {
      logger.error('Failed to handle missed exercises', error, 'ExerciseNotificationService')
    }
  }

  /**
   * Set up recurring exercise reminders
   */
  private async setupExerciseReminders(prescription: ExercisePrescription): Promise<void> {
    try {
      const reminderTimes = prescription.reminder_times || ['09:00', '15:00', '21:00']
      const startDate = new Date(prescription.start_date)
      const endDate = prescription.end_date ? new Date(prescription.end_date) : 
                     new Date(startDate.getTime() + prescription.duration_weeks * 7 * 24 * 60 * 60 * 1000)

      // Schedule daily reminders for the duration of the prescription
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Only schedule for days when exercises should be done
        const dayOfWeek = date.getDay()
        const shouldExerciseToday = this.shouldExerciseOnDay(dayOfWeek, prescription.frequency_per_week)

        if (shouldExerciseToday) {
          for (const time of reminderTimes.slice(0, prescription.frequency_per_day)) {
            const reminderDateTime = new Date(date)
            const [hours, minutes] = time.split(':').map(Number)
            reminderDateTime.setHours(hours, minutes, 0, 0)

            // Only schedule if in the future
            if (reminderDateTime > new Date()) {
              await this.scheduleExerciseReminder(prescription, reminderDateTime)
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to setup exercise reminders', error, 'ExerciseNotificationService')
    }
  }

  /**
   * Schedule individual exercise reminder
   */
  private async scheduleExerciseReminder(prescription: ExercisePrescription, reminderTime: Date): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-notifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: prescription.patient_id,
          type: NotificationType.EXERCISE_REMINDER,
          scheduleAt: reminderTime.toISOString(),
          data: {
            prescriptionId: prescription.id,
            exerciseId: prescription.exercise_id,
            therapistId: prescription.therapist_id,
            reminderTime: reminderTime.toTimeString().slice(0, 5)
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to schedule exercise reminder: ${response.statusText}`)
      }
    } catch (error) {
      logger.error('Failed to schedule exercise reminder', error, 'ExerciseNotificationService')
    }
  }

  /**
   * Check for exercise milestones
   */
  private async checkExerciseMilestones(patientId: string, completion: ExerciseCompletion): Promise<ExerciseMilestone[]> {
    const milestones: ExerciseMilestone[] = []

    try {
      // Get total exercise count
      const { count: totalCount } = await supabase
        .from('exercise_completions')
        .select('*', { count: 'exact' })
        .eq('patient_id', patientId)

      // Check for total count milestones
      if (totalCount && [10, 25, 50, 100, 200, 500].includes(totalCount)) {
        milestones.push({
          type: 'total_count',
          value: totalCount,
          description: `Parabéns! Você completou ${totalCount} exercícios!`
        })
      }

      // Check for weekly goal completion
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const { count: weeklyCount } = await supabase
        .from('exercise_completions')
        .select('*', { count: 'exact' })
        .eq('patient_id', patientId)
        .gte('completed_at', weekStart.toISOString())

      // Assuming weekly goal is 7 exercises (could be dynamic based on prescriptions)
      if (weeklyCount === 7) {
        milestones.push({
          type: 'weekly_goal',
          value: 7,
          description: 'Meta semanal alcançada! 7 exercícios completados esta semana!'
        })
      }

      return milestones
    } catch (error) {
      logger.error('Failed to check exercise milestones', error, 'ExerciseNotificationService')
      return []
    }
  }

  /**
   * Check exercise streak
   */
  private async checkExerciseStreak(patientId: string): Promise<{
    currentStreak: number
    isNewRecord: boolean
    isSignificantMilestone: boolean
  }> {
    try {
      // Get recent completions to calculate streak
      const { data: completions } = await supabase
        .from('exercise_completions')
        .select('completed_at')
        .eq('patient_id', patientId)
        .order('completed_at', { ascending: false })
        .limit(30)

      if (!completions || completions.length === 0) {
        return { currentStreak: 0, isNewRecord: false, isSignificantMilestone: false }
      }

      // Calculate current streak
      let currentStreak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < completions.length; i++) {
        const completionDate = new Date(completions[i].completed_at)
        completionDate.setHours(0, 0, 0, 0)
        
        const expectedDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        
        if (completionDate.getTime() === expectedDate.getTime()) {
          currentStreak++
        } else {
          break
        }
      }

      const isSignificantMilestone = [3, 7, 14, 30, 60, 100].includes(currentStreak)
      
      return {
        currentStreak,
        isNewRecord: false, // Would need to track personal records
        isSignificantMilestone
      }
    } catch (error) {
      logger.error('Failed to check exercise streak', error, 'ExerciseNotificationService')
      return { currentStreak: 0, isNewRecord: false, isSignificantMilestone: false }
    }
  }

  /**
   * Send milestone notification
   */
  private async sendMilestoneNotification(patientId: string, milestone: ExerciseMilestone): Promise<void> {
    await this.sendNotificationToUser(patientId, {
      type: NotificationType.EXERCISE_MILESTONE,
      title: 'Conquista Desbloqueada! 🏆',
      body: milestone.description,
      data: {
        milestoneType: milestone.type,
        milestoneValue: milestone.value,
        action: 'view_achievements'
      }
    })
  }

  /**
   * Send streak notification
   */
  private async sendStreakNotification(patientId: string, streakInfo: { currentStreak: number }): Promise<void> {
    await this.sendNotificationToUser(patientId, {
      type: NotificationType.EXERCISE_MILESTONE,
      title: `Sequência de ${streakInfo.currentStreak} dias! 🔥`,
      body: `Incrível! Você está mantendo uma sequência de ${streakInfo.currentStreak} dias fazendo exercícios. Continue assim!`,
      data: {
        streakDays: streakInfo.currentStreak,
        type: 'streak',
        action: 'view_progress'
      }
    })
  }

  /**
   * Notify therapist about high pain level
   */
  private async notifyTherapistAboutHighPain(therapistId: string, completion: ExerciseCompletion, prescription: ExercisePrescription): Promise<void> {
    await this.sendNotificationToUser(therapistId, {
      type: NotificationType.SYSTEM_ALERT,
      title: 'Alerta: Dor Alta Relatada',
      body: `Paciente relatou dor nível ${completion.pain_level}/10 durante exercício. Avaliação necessária.`,
      data: {
        patientId: completion.patient_id,
        prescriptionId: prescription.id,
        painLevel: completion.pain_level,
        completionId: completion.id,
        action: 'review_patient'
      }
    })
  }

  /**
   * Notify therapist about patient inactivity
   */
  private async notifyTherapistAboutInactivity(therapistId: string, patientId: string, daysMissed: number): Promise<void> {
    await this.sendNotificationToUser(therapistId, {
      type: NotificationType.SYSTEM_ALERT,
      title: 'Paciente Inativo',
      body: `Paciente não fez exercícios nos últimos ${daysMissed} dias. Considere entrar em contato.`,
      data: {
        patientId,
        daysMissed,
        type: 'inactivity',
        action: 'contact_patient'
      }
    })
  }

  /**
   * Determine if exercises should be done on a specific day
   */
  private shouldExerciseOnDay(dayOfWeek: number, frequencyPerWeek: number): boolean {
    // Simple logic: distribute exercises evenly throughout the week
    // 0 = Sunday, 1 = Monday, etc.
    const exerciseDays = []
    
    if (frequencyPerWeek >= 7) return true
    if (frequencyPerWeek >= 5) return dayOfWeek >= 1 && dayOfWeek <= 5 // Weekdays
    if (frequencyPerWeek >= 3) return [1, 3, 5].includes(dayOfWeek) // Mon, Wed, Fri
    if (frequencyPerWeek >= 2) return [2, 5].includes(dayOfWeek) // Tue, Fri
    if (frequencyPerWeek >= 1) return dayOfWeek === 3 // Wed
    
    return false
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
      logger.error('Failed to send notification to user', error, 'ExerciseNotificationService')
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
      logger.error('Failed to trigger notification event', error, 'ExerciseNotificationService')
    }
  }
}

// Export singleton instance
export const exerciseNotificationService = ExerciseNotificationService.getInstance()