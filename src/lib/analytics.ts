import type { ErrorInfo } from 'react';
import { logger } from './errors/logger';

export function trackError(error: Error, _info?: ErrorInfo) {
  // Log error using centralized logger
  logger.error('Erro rastreado pelo analytics', error, 'Analytics');
}
