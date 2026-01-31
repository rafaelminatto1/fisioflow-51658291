import { fisioLogger as logger } from '@/lib/errors/logger';

export class NotificationErrorHandler {
  static handleError(error: Error, context: string) {
    logger.error(`Erro de notificação: ${context}`, error, 'NotificationErrorHandler');
  }
}