import type { ErrorInfo } from 'react';

export function trackError(error: Error, _info?: ErrorInfo) {
  // Minimal analytics stub: log to console
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[analytics.trackError]', error);
  }
}
