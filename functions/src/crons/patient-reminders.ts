import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FCMService } from '../integrations/fcm/fcm.service';

const fcmService = new FCMService();

export const dailyExerciseReminder = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'America/Sao_Paulo',
    memory: '256MiB',
  },
  async () => {
    const db = admin.firestore();
    
    // Query patients with active exercises
    // Note: In a large production app, you might want to use a more efficient query or batching
    const exercisesSnap = await db.collection('patient_exercises')
      .where('completed', '==', false)
      .get();

    const patientIds = new Set<string>();
    exercisesSnap.forEach(doc => {
      const data = doc.data();
      if (data.patientId) {
        patientIds.add(data.patientId);
      }
    });

    console.log(`Sending reminders to ${patientIds.size} patients`);

    const reminders = Array.from(patientIds).map(async (userId) => {
      return fcmService.sendToUser(userId, {
        title: 'Hora de treinar! 💪',
        body: 'Você tem exercícios pendentes para hoje. Vamos manter o foco na sua recuperação?',
        data: {
          type: 'exercise_reminder',
        }
      });
    });

    await Promise.all(reminders);
  }
);
