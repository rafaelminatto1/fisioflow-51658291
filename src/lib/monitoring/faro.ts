import {
  initializeFaro,
  getWebInstrumentations,
  LogLevel,
  type Faro,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

let faro: Faro | null = null;

export function initFaro(): void {
  if (faro || typeof window === 'undefined') return;
  if (import.meta.env.DEV) return;

  faro = initializeFaro({
    url: 'http://localhost:12347/collect',
    app: {
      name: 'fisioflow-web',
      version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
      environment: import.meta.env.MODE ?? 'production',
    },
    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
        captureConsoleDisabledLevels: [LogLevel.DEBUG, LogLevel.TRACE],
      }),
      new TracingInstrumentation({
        instrumentationOptions: {
          propagateTraceHeaderCorsUrls: [
            /https:\/\/fisioflow-api\.rafalegollas\.workers\.dev/,
            /https:\/\/moocafisio\.com\.br/,
          ],
        },
      }),
    ],
    sessionTracking: {
      enabled: true,
      persistent: true,
    },
  });
}

export function getFaro(): Faro | null {
  return faro;
}
