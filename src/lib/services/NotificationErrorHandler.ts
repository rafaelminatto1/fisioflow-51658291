import { logger } from '@/lib/errors/logger';

export class NotificationErrorHandler {
  static handleError(error: Error, context: string) {
    logger.error('Erro de notificação', error, 'NotificationErrorHandler', { context });
  }
}