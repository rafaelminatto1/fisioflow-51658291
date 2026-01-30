/**
 * Business Metrics System
 * Custom business metrics for monitoring KPIs
 */

/**
 * Business metric types
 */
export enum BusinessMetric {
  // Patient metrics
  PATIENT_REGISTERED = 'patient_registered',
  PATIENT_ACTIVE = 'patient_active',
  PATIENT_INACTIVE = 'patient_inactive',

  // Appointment metrics
  APPOINTMENT_BOOKED = 'appointment_booked',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  APPOINTMENT_NO_SHOW = 'appointment_no_show',

  // Session metrics
  SESSION_COMPLETED = 'session_completed',
  SESSION_PLANNED = 'session_planned',

  // Exercise metrics
  EXERCISE_ASSIGNED = 'exercise_assigned',
  EXERCISE_COMPLETED = 'exercise_completed',

  // Assessment metrics
  ASSESSMENT_CREATED = 'assessment_created',
  ASSESSMENT_COMPLETED = 'assessment_completed',

  // Payment metrics
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_OVERDUE = 'payment_overdue',
  REVENUE_EARNED = 'revenue_earned',

  // Treatment metrics
  TREATMENT_STARTED = 'treatment_started',
  TREATMENT_COMPLETED = 'treatment_completed',

  // User metrics
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
}

/**
 * Metric value types
 */
export enum MetricValueType {
  COUNT = 'count',
  DURATION_MS = 'duration_ms',
  CURRENCY_CENTS = 'currency_cents',
  PERCENTAGE = 'percentage',
}

/**
 * Labels for metric categorization
 */
export interface MetricLabels {
  organization_id: string;
  user_id?: string;
  user_role?: string;
  patient_id?: string;
  appointment_type?: string;
  payment_method?: string;
  exercise_category?: string;
  assessment_category?: string;
  [key: string]: string | number | undefined;
}

/**
 * Metric data point
 */
export interface MetricData {
  metric: BusinessMetric;
  value: number;
  valueType: MetricValueType;
  labels: MetricLabels;
  timestamp?: Date;
}

/**
 * Records a business metric
 *
 * @param metric - The metric type
 * @param value - The metric value
 * @param labels - Categorical labels
 * @param valueType - Type of value (default: COUNT)
 * @param timestamp - Optional timestamp (default: now)
 */
export function recordBusinessMetric(
  metric: BusinessMetric,
  value: number,
  labels: MetricLabels,
  valueType: MetricValueType = MetricValueType.COUNT,
  timestamp?: Date
): void {
  const metricData: MetricData = {
    metric,
    value,
    valueType,
    labels,
    timestamp: timestamp || new Date(),
  };

  // Log to Cloud Logging as a structured log
  const logger = getLogger('metrics');
  logger.info('Business metric recorded', {
    metric_name: metric,
    metric_value: value,
    value_type: valueType,
    labels,
    timestamp: metricData.timestamp?.toISOString(),
  });

  // Send to Cloud Monitoring (if configured)
  // This will be handled by cloud-monitoring.ts
  import('./cloud-monitoring').then(({ writeCustomMetric }) => {
    writeCustomMetric(metricData).catch((err) => {
      logger.error('Failed to write metric to Cloud Monitoring', { error: err, metricData });
    });
  }).catch(() => {
    // Cloud Monitoring not configured, metric only logged
  });
}

/**
 * Records a counter metric (incrementing value)
 */
export function incrementCounter(
  metric: BusinessMetric,
  labels: MetricLabels,
  delta: number = 1
): void {
  recordBusinessMetric(metric, delta, labels, MetricValueType.COUNT);
}

/**
 * Records a duration in milliseconds
 */
export function recordDuration(
  metric: BusinessMetric,
  durationMs: number,
  labels: MetricLabels
): void {
  recordBusinessMetric(metric, durationMs, labels, MetricValueType.DURATION_MS);
}

/**
 * Records a currency value in cents
 */
export function recordRevenue(
  amountCents: number,
  labels: MetricLabels
): void {
  recordBusinessMetric(
    BusinessMetric.REVENUE_EARNED,
    amountCents,
    labels,
    MetricValueType.CURRENCY_CENTS
  );
}

/**
 * Helper function to measure execution time
 */
export async function measureMetric<T>(
  metric: BusinessMetric,
  labels: MetricLabels,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    recordDuration(metric, duration, labels);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordDuration(metric, duration, { ...labels, success: 'false' });
    throw error;
  }
}

/**
 * Patient-related metrics
 */
export const patientMetrics = {
  registered: (organizationId: string, userId: string, patientId: string) =>
    incrementCounter(BusinessMetric.PATIENT_REGISTERED, {
      organization_id: organizationId,
      user_id: userId,
      patient_id: patientId,
    }),

  markedActive: (organizationId: string, patientId: string) =>
    incrementCounter(BusinessMetric.PATIENT_ACTIVE, {
      organization_id: organizationId,
      patient_id: patientId,
    }),

  markedInactive: (organizationId: string, patientId: string) =>
    incrementCounter(BusinessMetric.PATIENT_INACTIVE, {
      organization_id: organizationId,
      patient_id: patientId,
    }),
};

/**
 * Appointment-related metrics
 */
export const appointmentMetrics = {
  booked: (organizationId: string, userId: string, patientId: string, type?: string) =>
    incrementCounter(BusinessMetric.APPOINTMENT_BOOKED, {
      organization_id: organizationId,
      user_id: userId,
      patient_id: patientId,
      appointment_type: type,
    }),

  cancelled: (organizationId: string, patientId: string) =>
    incrementCounter(BusinessMetric.APPOINTMENT_CANCELLED, {
      organization_id: organizationId,
      patient_id: patientId,
    }),

  completed: (organizationId: string, patientId: string, type?: string) =>
    incrementCounter(BusinessMetric.APPOINTMENT_COMPLETED, {
      organization_id: organizationId,
      patient_id: patientId,
      appointment_type: type,
    }),

  noShow: (organizationId: string, patientId: string) =>
    incrementCounter(BusinessMetric.APPOINTMENT_NO_SHOW, {
      organization_id: organizationId,
      patient_id: patientId,
    }),
};

/**
 * Payment-related metrics
 */
export const paymentMetrics = {
  received: (organizationId: string, amountCents: number, method: string, patientId: string) => {
    recordRevenue(amountCents, {
      organization_id: organizationId,
      payment_method: method,
      patient_id: patientId,
    });
    incrementCounter(BusinessMetric.PAYMENT_RECEIVED, {
      organization_id: organizationId,
      payment_method: method,
      patient_id: patientId,
    });
  },

  pending: (organizationId: string, amountCents: number, patientId: string) =>
    recordBusinessMetric(
      BusinessMetric.PAYMENT_PENDING,
      amountCents,
      {
        organization_id: organizationId,
        patient_id: patientId,
      },
      MetricValueType.CURRENCY_CENTS
    ),

  overdue: (organizationId: string, amountCents: number, patientId: string) =>
    recordBusinessMetric(
      BusinessMetric.PAYMENT_OVERDUE,
      amountCents,
      {
        organization_id: organizationId,
        patient_id: patientId,
      },
      MetricValueType.CURRENCY_CENTS
    ),
};

/**
 * Assessment-related metrics
 */
export const assessmentMetrics = {
  created: (organizationId: string, userId: string, patientId: string, category?: string) =>
    incrementCounter(BusinessMetric.ASSESSMENT_CREATED, {
      organization_id: organizationId,
      user_id: userId,
      patient_id: patientId,
      assessment_category: category,
    }),

  completed: (organizationId: string, patientId: string, category?: string) =>
    incrementCounter(BusinessMetric.ASSESSMENT_COMPLETED, {
      organization_id: organizationId,
      patient_id: patientId,
      assessment_category: category,
    }),
};

/**
 * Exercise-related metrics
 */
export const exerciseMetrics = {
  assigned: (organizationId: string, patientId: string, category?: string) =>
    incrementCounter(BusinessMetric.EXERCISE_ASSIGNED, {
      organization_id: organizationId,
      patient_id: patientId,
      exercise_category: category,
    }),

  completed: (organizationId: string, patientId: string, category?: string) =>
    incrementCounter(BusinessMetric.EXERCISE_COMPLETED, {
      organization_id: organizationId,
      patient_id: patientId,
      exercise_category: category,
    }),
};

/**
 * Session-related metrics
 */
export const sessionMetrics = {
  completed: (organizationId: string, userId: string, patientId: string) =>
    incrementCounter(BusinessMetric.SESSION_COMPLETED, {
      organization_id: organizationId,
      user_id: userId,
      patient_id: patientId,
    }),

  planned: (organizationId: string, patientId: string) =>
    incrementCounter(BusinessMetric.SESSION_PLANNED, {
      organization_id: organizationId,
      patient_id: patientId,
    }),
};

/**
 * User-related metrics
 */
export const userMetrics = {
  login: (organizationId: string, userId: string, role: string) =>
    incrementCounter(BusinessMetric.USER_LOGIN, {
      organization_id: organizationId,
      user_id: userId,
      user_role: role,
    }),

  logout: (organizationId: string, userId: string) =>
    incrementCounter(BusinessMetric.USER_LOGOUT, {
      organization_id: organizationId,
      user_id: userId,
    }),
};

// Import getLogger locally to avoid circular dependency
import { getLogger } from './logger';
