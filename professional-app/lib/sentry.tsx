/**
 * Sentry Configuration - Enhanced
 *
 * Configuração do Sentry para rastreamento de erros e performance.
 * Documentação: https://docs.sentry.io/platforms/react-native/
 */

import * as Sentry from '@sentry/react-native';
import type { ReactNode } from 'react';
import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

/**
 * Environment types
 */
type SentryEnvironment = 'development' | 'staging' | 'preview' | 'production';

/**
 * Sampling rates configuration
 */
interface SamplingRates {
  tracesSampleRate: number;
  sessionSampleRate: number;
  replaySessionSampleRate: number;
  replayErrorSampleRate: number;
  profileSessionSampleRate: number;
}

/**
 * DSN do Sentry - Configure via variável de ambiente
 */
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

/**
 * Organization and project para source maps
 */
const SENTRY_ORG = process.env.SENTRY_ORG || 'activity-fisioterapia-rg';
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'fisioflow-professional-app-tm';

/**
 * Gets the current environment
 */
function getEnvironment(): SentryEnvironment {
  const env = (process.env.EXPO_PUBLIC_ENVIRONMENT || __DEV__ ? 'development' : 'production') as SentryEnvironment;
  return ['development', 'staging', 'preview', 'production'].includes(env) ? env : 'development';
}

/**
 * Gets sampling rates based on environment
 */
function getSamplingRates(env: SentryEnvironment): SamplingRates {
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';

  return {
    // Traces: 100% in dev, 10% in production
    tracesSampleRate: isDevelopment ? 1.0 : 0.1,
    // Session: 100% in dev, 10% in production
    sessionSampleRate: isDevelopment ? 1.0 : 0.1,
    // Replay: 100% in dev, 1% in production (privacy)
    replaySessionSampleRate: isDevelopment ? 1.0 : 0.01,
    // Always capture replay on errors
    replayErrorSampleRate: 1.0,
    // Profiling: 50% in dev, 5% in production
    profileSessionSampleRate: isDevelopment ? 0.5 : 0.05,
  };
}

/**
 * Sensitive field patterns for data scrubbing
 */
const SENSITIVE_FIELDS = [
  'password', 'pass', 'pwd',
  'creditCard', 'cardNumber', 'cvv', 'cvc',
  'cpf', 'rg', 'cnpj',
  'phone', 'celular', 'telefone', 'mobile',
  'token', 'secret', 'apiKey',
  'sessionToken', 'refreshToken', 'accessToken',
  'address', 'endereço', 'rua', 'numero',
  'complemento', 'bairro', 'cidade', 'estado',
];

/**
 * Scrubs sensitive data from an object recursively
 */
function scrubSensitiveData(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key in obj) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      scrubSensitiveData(obj[key]);
    }
  }
}

/**
 * Hashes an ID for breadcrumbs (anonymization)
 */
function hashId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Scrubs sensitive healthcare data from event
 */
function scrubHealthcareData(event: any): any {
  // Remove sensitive medical terms from messages
  if (event.message) {
    // Keep only sanitized diagnostic codes
    event.message = event.message.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CID]');
  }

  // Remove patient names
  if (event.extra?.patientName) {
    event.extra.patientName = '[REDACTED]';
  }

  return event;
}

/**
 * Traces sampler based on transaction characteristics
 */
function tracesSampler(samplingContext: any): number {
  const { name, attributes } = samplingContext;

  // Skip health checks
  if (name?.includes('health') || name?.includes('ping')) {
    return 0;
  }

  // Skip background sync operations
  if (name?.includes('sync') || name?.includes('background')) {
    return 0.01;
  }

  // Full sampling for critical operations
  if (name?.includes('auth') || name?.includes('login') || name?.includes('logout')) {
    return 1.0;
  }

  if (name?.includes('appointment') || name?.includes('booking')) {
    return 0.5;
  }

  // Lower sampling for analytics operations
  if (name?.includes('analytics') || name?.includes('report')) {
    return 0.01;
  }

  return getSamplingRates(getEnvironment()).tracesSampleRate;
}

/**
 * Inicializa o Sentry
 */
export function initSentry() {
  // Se não houver DSN configurado, não inicializa
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN não configurado. Rastreamento de erros desabilitado.');
    return;
  }

  const environment = getEnvironment();
  const samplingRates = getSamplingRates(environment);

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    debug: __DEV__,

    // DO NOT send default PII
    sendDefaultPii: false,

    // Session tracking
    enableAutoSessionTracking: true,
    sessionSampleRate: samplingRates.sessionSampleRate,

    // Performance monitoring
    tracesSampleRate: samplingRates.tracesSampleRate,
    tracesSampler,

    // Profiling (NEW in SDK 8.x)
    profileSessionSampleRate: samplingRates.profileSessionSampleRate,

    // Attach stack traces for errors
    attachStacktrace: true,

    // Attach screenshots for debugging (production only, privacy-aware)
    attachScreenshot: environment === 'production',

    // Attach view hierarchy for React Native debugging
    attachViewHierarchy: true,

    // Release management for EAS builds
    release: process.env.EAS_BUILD_ID || process.env.GIT_COMMIT_SHA || undefined,

    // Enhanced error filtering
    beforeSend(event, hint) {
      // Apply healthcare data scrubbing
      event = scrubHealthcareData(event);

      // Scrub request data
      if (event.request?.data) {
        scrubSensitiveData(event.request.data);
      }

      // Scrub headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
        delete event.request.headers['x-auth-token'];
      }

      // Scrub extra data
      if (event.extra) {
        scrubSensitiveData(event.extra);
      }

      // Scrub user context in production
      if (event.user && environment === 'production') {
        event.user = {
          id: event.user.id,
          email: '[REDACTED]',
        };
      }

      // Filter out common network errors
      if (event.exception) {
        const error = hint.originalException as any;
        if (error?.message?.includes('Network request failed')) {
          return null;
        }
        if (error?.message?.includes('The operation was aborted')) {
          return null;
        }
      }

      return event;
    },

    // Filter breadcrumbs
    beforeBreadcrumb(crumb, hint) {
      // Filter out health check requests
      if (crumb.category === 'http' || crumb.category === 'fetch' || crumb.category === 'xhr') {
        const url = crumb.data?.url as string || '';

        // Don't track health checks
        if (url.includes('/health') || url.includes('/ping')) {
          return null;
        }

        // Mask sensitive data in URLs
        if (crumb.data?.url) {
          crumb.data.url = crumb.data.url.replace(/token=[^&]+/, 'token=[REDACTED]');
          crumb.data.url = crumb.data.url.replace(/password=[^&]+/, 'password=[REDACTED]');
        }
      }

      return crumb;
    },

    // Integrations
    integrations: [
      // React Native Tracing for performance
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', /^\//],
        enableNativeFramesTracking: true,
      }),

      // Mobile Session Replay (NEW FEATURE - SDK 6.5.0+)
      new Sentry.ReactNativeReplay({
        // Privacy controls - mask all sensitive content by default
        maskAllText: true,
        maskAllImages: true,
        maskAllVectors: true,

        // Performance optimization
        sessionSampleRate: samplingRates.replaySessionSampleRate,
        errorSampleRate: samplingRates.replayErrorSampleRate,

        // Quality: medium in production for lower overhead
        quality: environment === 'production' ? 'medium' : 'high',

        // Maximum recording duration
        sessionDuration: 1800000, // 30 minutes max
        replayDuration: 300000, // 5 minutes max per replay
      }),
    ],

    // Initial scope with tags
    initialScope: {
      tags: {
        app: 'fisioflow-professional',
        platform: 'react-native',
      },
    },

    // Enabled in production or when explicitly enabled
    enabled: environment !== 'development' || __DEV__,
  });

  console.log('[Sentry] Inicializado com sucesso', { environment, org: SENTRY_ORG, project: SENTRY_PROJECT });
}

/**
 * Define o usuário atual no Sentry
 */
export function setSentryUser(userId: string, email?: string, additionalInfo?: Record<string, any>) {
  if (!SENTRY_DSN) return;

  Sentry.setUser({
    id: userId,
    email,
    ...additionalInfo,
  });

  // Add custom context for role
  Sentry.setContext('user_role', {
    role: additionalInfo?.role,
    organizationId: additionalInfo?.organizationId,
  });
}

/**
 * Limpa o usuário do Sentry (logout)
 */
export function clearSentryUser() {
  if (!SENTRY_DSN) return;

  Sentry.setUser(null);
  Sentry.setContext('user_role', null);
}

/**
 * Captura uma exceção manualmente
 */
export function captureException(error: Error, extra?: Record<string, any>) {
  if (!SENTRY_DSN) {
    console.error('[Sentry] Error:', error, extra);
    return;
  }

  // Scrub sensitive data
  if (extra) {
    scrubSensitiveData(extra);
  }

  Sentry.captureException(error, { extra });
}

/**
 * Captura uma mensagem
 */
export function captureMessage(message: string, level: 'debug' | 'info' | 'warning' | 'error' = 'info', extra?: Record<string, any>) {
  if (!SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}]`, message, extra);
    return;
  }

  Sentry.captureMessage(message, { level, extra });
}

/**
 * Adiciona breadcrumb para rastreamento de contexto
 */
export function addBreadcrumb(crumb: Sentry.Breadcrumb) {
  if (!SENTRY_DSN) return;

  // Scrub data if present
  if (crumb.data) {
    scrubSensitiveData(crumb.data);
  }

  Sentry.addBreadcrumb(crumb);
}

/**
 * Healthcare-specific breadcrumb for tracking patient data access
 */
export function addHealthcareBreadcrumb(
  type: 'patient_data' | 'prescription' | 'diagnosis' | 'appointment',
  action: string,
  metadata?: Record<string, any>
) {
  if (!SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    category: 'healthcare',
    message: `${type}: ${action}`,
    level: 'info',
    data: {
      type,
      action,
      // Anonymize patient IDs for privacy
      anonymizedPatientId: metadata?.patientId ? hashId(metadata.patientId) : undefined,
      timestamp: Date.now(),
      ...metadata,
    },
  });
}

/**
 * Business event breadcrumb for tracking key user actions
 */
export function addBusinessBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
) {
  if (!SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    category: `business_${category}`,
    message,
    level: 'info',
    data,
  });
}

/**
 * Componente de erro para fallback do Sentry
 */
interface SentryErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function SentryErrorFallback({ error, resetError }: SentryErrorFallbackProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Algo deu errado</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {error.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.'}
        </Text>

        {!__DEV__ && (
          <Text style={[styles.info, { color: colors.textSecondary }]}>
            O erro foi reportado automaticamente e nossa equipe irá analisar.
          </Text>
        )}

        {__DEV__ && (
          <Text style={[styles.debug, { color: colors.textSecondary }]}>
            Debug: {error.toString()}
          </Text>
        )}

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={resetError}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * HOC para envolver componentes com rastreamento de erro
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  return function WrappedComponent(props: P) {
    return (
      <Sentry.ErrorBoundary
        fallback={fallback || <SentryErrorFallback />}
        showDialog={!__DEV__}
      >
        <Component {...props} />
      </Sentry.ErrorBoundary>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  info: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.6,
  },
  debug: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.6,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
