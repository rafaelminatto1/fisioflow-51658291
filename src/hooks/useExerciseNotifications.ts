import { useCallback } from 'react'
import { 
  exerciseNotificationService, 
  ExercisePrescription, 
  ExerciseCompletion 
} from '@/lib/services/ExerciseNotificationService'
import { toast } from 'sonner'
import { logger } from '@/lib/errors/logger'

export const useExerciseNotifications = () => {
  
  /**
   * Handle new exercise prescription
   */
  const handleExercisePrescribed = useCallback(async (prescription: ExercisePrescription) => {
    try {
      await exerciseNotificationService.handleExercisePrescribed(prescription)
      toast.success('Lembretes de exercício configurados!')
      logger.info('Exercise prescription notifications set up', { prescriptionId: prescription.id }, 'useExerciseNotifications')
    } catch (error) {
      logger.error('Failed to handle exercise prescription', error, 'useExerciseNotifications')
      toast.error('Erro ao configurar lembretes de exercício')
    }
  }, [])

  /**
   * Handle exercise completion
   */
  const handleExerciseCompleted = useCallback(async (completion: ExerciseCompletion) => {
    try {
      await exerciseNotificationService.handleExerciseCompleted(completion)
      logger.info('Exercise completion processed', { completionId: completion.id }, 'useExerciseNotifications')
      
      // Show success message to user
      toast.success('Exercício registrado! Parabéns! 🎉')
    } catch (error) {
      logger.error('Failed to handle exercise completion', error, 'useExerciseNotifications')
      toast.error('Erro ao processar conclusão do exercício')
    }
  }, [])

  /**
   * Handle missed exercises check
   */
  const handleMissedExercisesCheck = useCallback(async (patientId: string) => {
    try {
      await exerciseNotificationService.handleMissedExercises(patientId)
      logger.info('Missed exercises check completed', { patientId }, 'useExerciseNotifications')
    } catch (error) {
      logger.error('Failed to check missed exercises', error, 'useExerciseNotifications')
    }
  }, [])

  /**
   * Batch process multiple exercise prescriptions
   */
  const handleBatchPrescriptions = useCallback(async (prescriptions: ExercisePrescription[]) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const prescription of prescriptions) {
      try {
        await exerciseNotificationService.handleExercisePrescribed(prescription)
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(`Erro na prescrição ${prescription.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        logger.error('Failed to process batch prescription', error, 'useExerciseNotifications')
      }
    }

    if (results.success > 0) {
      toast.success(`${results.success} prescrições processadas com sucesso`)
    }

    if (results.failed > 0) {
      toast.error(`${results.failed} prescrições falharam ao processar`)
      logger.error('Batch prescription processing had failures', { results }, 'useExerciseNotifications')
    }

    return results
  }, [])

  /**
   * Batch process multiple exercise completions
   */
  const handleBatchCompletions = useCallback(async (completions: ExerciseCompletion[]) => {
    const results = {
      success: 0,
      failed: 0,
      milestones: 0,
      errors: [] as string[]
    }

    for (const completion of completions) {
      try {
        await exerciseNotificationService.handleExerciseCompleted(completion)
        results.success++
        
        // Check if this completion triggered milestones (simplified check)
        if (completion.id) {
          results.milestones++
        }
      } catch (error) {
        results.failed++
        results.errors.push(`Erro na conclusão ${completion.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        logger.error('Failed to process batch completion', error, 'useExerciseNotifications')
      }
    }

    if (results.success > 0) {
      toast.success(`${results.success} exercícios processados com sucesso`)
    }

    if (results.failed > 0) {
      toast.error(`${results.failed} exercícios falharam ao processar`)
      logger.error('Batch completion processing had failures', { results }, 'useExerciseNotifications')
    }

    return results
  }, [])

  /**
   * Update exercise prescription reminders
   */
  const updatePrescriptionReminders = useCallback(async (
    prescriptionId: string, 
    newReminderTimes: string[]
  ) => {
    try {
      // Update reminder times in database
      const { error } = await exerciseNotificationService['supabase']
        .from('exercise_prescriptions')
        .update({ reminder_times: newReminderTimes })
        .eq('id', prescriptionId)

      if (error) {
        throw error
      }

      // Get updated prescription
      const { data: prescription } = await exerciseNotificationService['supabase']
        .from('exercise_prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .single()

      if (prescription) {
        // Re-setup reminders with new times
        await exerciseNotificationService.handleExercisePrescribed(prescription)
        toast.success('Horários de lembrete atualizados!')
      }

      logger.info('Exercise reminder times updated', { prescriptionId, newReminderTimes }, 'useExerciseNotifications')
    } catch (error) {
      logger.error('Failed to update prescription reminders', error, 'useExerciseNotifications')
      toast.error('Erro ao atualizar horários de lembrete')
    }
  }, [])

  /**
   * Pause/Resume exercise reminders
   */
  const togglePrescriptionReminders = useCallback(async (prescriptionId: string, paused: boolean) => {
    try {
      const status = paused ? 'paused' : 'active'
      
      const { error } = await exerciseNotificationService['supabase']
        .from('exercise_prescriptions')
        .update({ status })
        .eq('id', prescriptionId)

      if (error) {
        throw error
      }

      const message = paused ? 'Lembretes pausados' : 'Lembretes reativados'
      toast.success(message)
      
      logger.info('Exercise prescription status toggled', { prescriptionId, status }, 'useExerciseNotifications')
    } catch (error) {
      logger.error('Failed to toggle prescription reminders', error, 'useExerciseNotifications')
      toast.error('Erro ao alterar status dos lembretes')
    }
  }, [])

  return {
    handleExercisePrescribed,
    handleExerciseCompleted,
    handleMissedExercisesCheck,
    handleBatchPrescriptions,
    handleBatchCompletions,
    updatePrescriptionReminders,
    togglePrescriptionReminders
  }
}

export default useExerciseNotifications