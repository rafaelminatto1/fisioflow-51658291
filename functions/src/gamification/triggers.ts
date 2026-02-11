/**
 * Gamification Triggers
 * 
 * Automatically award XP based on system events
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { GamificationService } from './service';
import { logger } from 'firebase-functions';

/**
 * Award XP when an exercise is completed
 */
export const onExerciseCompleted = onDocumentCreated('exercise_logs/{logId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const patientId = data.patientId || data.patient_id;
  if (!patientId) {
    logger.warn('[Gamification] Exercise log created without patientId', { logId: event.params.logId });
    return;
  }

  try {
    const xpAmount = 50; // Base XP for completing any exercise
    const result = await GamificationService.awardXp(
      patientId, 
      xpAmount, 
      'session_completed', 
      `Completou exercício: ${data.exerciseName || 'Fisioterapia'}`
    );

    logger.info(`[Gamification] Awarded ${xpAmount} XP to patient ${patientId}`, {
      leveledUp: result.leveledUp,
      newLevel: result.newLevel
    });
  } catch (error) {
    logger.error('[Gamification] Error awarding XP for exercise', error);
  }
});

/**
 * Award XP when a patient attends a session (Legacy/Manual)
 */
export const onAppointmentCompleted = onDocumentCreated('appointments/{appointmentId}', async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Only award XP if status changed to 'atendido' or 'completed'
    // Note: onDocumentCreated only triggers on creation. 
    // Usually we want onDocumentUpdated for status changes.
    if (data.status !== 'atendido' && data.status !== 'completed') return;

    const patientId = data.patient_id;
    if (!patientId) return;

    try {
        const xpAmount = 150; // More XP for in-person session
        await GamificationService.awardXp(
            patientId,
            xpAmount,
            'atendido',
            'Sessão de fisioterapia concluída'
        );
    } catch (error) {
        logger.error('[Gamification] Error awarding XP for appointment', error);
    }
});
