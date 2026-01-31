import { fisioLogger as logger } from '@/lib/errors/logger';

export class ExerciseNotificationService {
  static async sendReminder(patientId: string, exerciseId: string) {
    // Stub implementation
    logger.info('Sending exercise reminder', { patientId, exerciseId }, 'ExerciseNotificationService');
  }
}