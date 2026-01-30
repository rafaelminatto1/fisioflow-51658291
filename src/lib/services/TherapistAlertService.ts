import { logger } from '@/lib/errors/logger';

export class TherapistAlertService {
  static async sendAlert(therapistId: string, message: string) {
    // Stub implementation
    logger.info('Sending alert to therapist', { therapistId, message }, 'TherapistAlertService');
  }
}