/**
 * Cloud Monitoring Integration
 * Integrates with Google Cloud Monitoring API for custom metrics
 */

import { MetricData, MetricValueType } from './metrics';
import { getLogger } from './logger';

const logger = getLogger('cloud-monitoring');

/**
 * Cloud Monitoring configuration
 */
interface CloudMonitoringConfig {
  projectId: string;
  metricDomain: string;
  metricPrefix: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CloudMonitoringConfig = {
  projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '',
  metricDomain: 'fisioflow.com.br',
  metricPrefix: 'custom.googleapis.com',
};

/**
 * Maps our value types to Cloud Monitoring metric kinds
 */
const VALUE_TYPE_MAP: Record<MetricValueType, string> = {
  [MetricValueType.COUNT]: 'INT64',
  [MetricValueType.DURATION_MS]: 'INT64',
  [MetricValueType.CURRENCY_CENTS]: 'INT64',
  [MetricValueType.PERCENTAGE]: 'DOUBLE',
};

/**
 * Maps our value types to Cloud Monitoring aggregation types
 * Reserved for future Cloud Monitoring integration
 */
export const AGGREGATION_TYPE_MAP: Record<MetricValueType, string> = {
  [MetricValueType.COUNT]: 'SUM',
  [MetricValueType.DURATION_MS]: 'DISTRIBUTION',
  [MetricValueType.CURRENCY_CENTS]: 'SUM',
  [MetricValueType.PERCENTAGE]: 'GAUGE',
};

/**
 * Gets the metric type path for Cloud Monitoring
 *
 * @param config - Cloud Monitoring configuration
 * @param metricName - Name of the metric
 * @returns Full metric type path
 */
function getMetricType(config: CloudMonitoringConfig, metricName: string): string {
  return `${config.metricPrefix}/${metricName}`;
}

/**
 * Converts metric data to Cloud Monitoring format
 * Reserved for future Cloud Monitoring integration
 *
 * @param metricData - Metric data to convert
 * @param config - Cloud Monitoring configuration
 * @returns Formatted time series
 */
export function metricToTimeSeries(
  metricData: MetricData,
  config: CloudMonitoringConfig
): any {
  const metricType = getMetricType(config, metricData.metric);
  const valueType = VALUE_TYPE_MAP[metricData.valueType];

  // Build labels object, filtering out undefined values
  const labels: Record<string, string> = {};
  for (const [key, value] of Object.entries(metricData.labels)) {
    if (value !== undefined) {
      labels[key] = String(value);
    }
  }

  return {
    timeSeries: [
      {
        metric: {
          type: metricType,
          labels,
        },
        resource: {
          type: 'cloud_function',
          labels: {
            project_id: config.projectId,
            function_name: process.env.FUNCTION_NAME || 'unknown',
            region: process.env.FUNCTION_REGION || 'unknown',
          },
        },
        points: [
          {
            interval: {
              endTime: {
                seconds: Math.floor((metricData.timestamp?.getTime() || Date.now()) / 1000),
                nanos: 0,
              },
            },
            value: {
              [valueType.toLowerCase()]: metricData.value,
            },
          },
        ],
      },
    ],
  };
}

/**
 * Writes a custom metric to Cloud Monitoring
 *
 * Note: This requires the Cloud Monitoring API to be enabled.
 * In production, you would use the @google-cloud/monitoring package.
 * For now, we'll log the metric that would be sent.
 *
 * @param metricData - Metric data to write
 * @param config - Optional Cloud Monitoring configuration
 * @returns Promise that resolves when metric is written
 */
export async function writeCustomMetric(
  metricData: MetricData,
  config: Partial<CloudMonitoringConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  if (!fullConfig.projectId) {
    logger.warn('Cloud Monitoring project ID not configured, metric only logged');
    return;
  }

  try {
    // For production, you would use:
    // import { MetricServiceClient } from '@google-cloud/monitoring';
    // const client = new MetricServiceClient();
    // await client.createTimeSeries(metricToTimeSeries(metricData, fullConfig));

    // For now, we simulate the write by logging what would be sent
    logger.info('Would write metric to Cloud Monitoring', {
      metricType: getMetricType(fullConfig, metricData.metric),
      value: metricData.value,
      valueType: metricData.valueType,
      labels: metricData.labels,
    });

    // TODO: Implement actual Cloud Monitoring API integration
    // Uncomment when @google-cloud/monitoring is installed:
    /*
    const { MetricServiceClient } = require('@google-cloud/monitoring');
    const client = new MetricServiceClient();

    const timeSeries = metricToTimeSeries(metricData, fullConfig);
    const [name] = await client.projectPath(fullConfig.projectId);

    await client.createTimeSeries({
      name,
      timeSeries: timeSeries.timeSeries,
    });
    */
  } catch (error) {
    logger.error('Failed to write metric to Cloud Monitoring', { error, metricData });
    throw error;
  }
}

/**
 * Creates a custom metric descriptor in Cloud Monitoring
 *
 * @param metricName - Name of the metric
 * @param displayName - Human-readable name
 * @param description - Metric description
 * @param unit - Unit of measurement (optional)
 * @param valueType - Type of value
 * @param config - Optional configuration
 * @returns Promise that resolves when descriptor is created
 */
export async function createMetricDescriptor(
  metricName: string,
  displayName: string,
  description: string,
  unit: string,
  valueType: MetricValueType,
  config: Partial<CloudMonitoringConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  if (!fullConfig.projectId) {
    logger.warn('Cloud Monitoring project ID not configured');
    return;
  }

  try {
    const metricType = getMetricType(fullConfig, metricName);

    logger.info('Would create metric descriptor', {
      metricType,
      displayName,
      description,
      unit,
    });

    // TODO: Implement actual metric descriptor creation
    // Uncomment when @google-cloud/monitoring is installed:
    /*
    const { MetricServiceClient } = require('@google-cloud/monitoring');
    const client = new MetricServiceClient();

    const [name] = await client.projectPath(fullConfig.projectId);

    await client.createMetricDescriptor({
      name,
      metricDescriptor: {
        name: metricType,
        displayName,
        description,
        unit,
        type: valueType === MetricValueType.PERCENTAGE ? 'GAUGE' : 'CUMULATIVE',
        valueType: VALUE_TYPE_MAP[valueType],
        metricKind: valueType === MetricValueType.PERCENTAGE ? 'GAUGE' : 'CUMULATIVE',
      },
    });
    */
  } catch (error) {
    logger.error('Failed to create metric descriptor', { error, metricName });
    throw error;
  }
}

/**
 * Initializes all custom metric descriptors
 * Call this once during deployment or cold start
 *
 * @param config - Optional configuration
 */
export async function initializeMetricDescriptors(
  config?: Partial<CloudMonitoringConfig>
): Promise<void> {
  const metrics: Array<[string, string, string, string, MetricValueType]> = [
    // Patient metrics
    ['patient_registered', 'Patients Registered', 'Count of new patient registrations', '1', MetricValueType.COUNT],
    ['patient_active', 'Active Patients', 'Count of active patients', '1', MetricValueType.COUNT],

    // Appointment metrics
    ['appointment_booked', 'Appointments Booked', 'Count of booked appointments', '1', MetricValueType.COUNT],
    ['appointment_cancelled', 'Appointments Cancelled', 'Count of cancelled appointments', '1', MetricValueType.COUNT],
    ['appointment_completed', 'Appointments Completed', 'Count of completed appointments', '1', MetricValueType.COUNT],

    // Payment metrics
    ['payment_received', 'Payments Received', 'Count of payments received', '1', MetricValueType.COUNT],
    ['revenue_earned', 'Revenue Earned', 'Total revenue in cents', 'cents', MetricValueType.CURRENCY_CENTS],

    // Assessment metrics
    ['assessment_created', 'Assessments Created', 'Count of assessments created', '1', MetricValueType.COUNT],
    ['assessment_completed', 'Assessments Completed', 'Count of assessments completed', '1', MetricValueType.COUNT],

    // Exercise metrics
    ['exercise_assigned', 'Exercises Assigned', 'Count of exercises assigned', '1', MetricValueType.COUNT],
    ['exercise_completed', 'Exercises Completed', 'Count of exercises completed', '1', MetricValueType.COUNT],

    // Session metrics
    ['session_completed', 'Sessions Completed', 'Count of treatment sessions completed', '1', MetricValueType.COUNT],
  ];

  logger.info('Initializing metric descriptors');

  for (const [name, display, desc, unit, type] of metrics) {
    try {
      await createMetricDescriptor(name, display, desc, unit, type, config);
    } catch (error) {
      logger.warn(`Failed to create metric descriptor for ${name}`, { error });
    }
  }

  logger.info('Metric descriptors initialized');
}

/**
 * Batch write multiple metrics
 *
 * @param metrics - Array of metric data
 * @param config - Optional configuration
 */
export async function writeBatchMetrics(
  metrics: MetricData[],
  config?: Partial<CloudMonitoringConfig>
): Promise<void> {
  await Promise.all(metrics.map(m => writeCustomMetric(m, config)));
}

/**
 * KPI aggregation helpers
 */

/**
 * Calculates conversion rate (registrations to first session)
 */
export interface ConversionRateMetric {
  organization_id: string;
  period_start: Date;
  period_end: Date;
  registrations: number;
  first_sessions: number;
  conversion_rate: number;
}

/**
 * Records a conversion rate KPI
 */
export async function recordConversionRateKPI(data: ConversionRateMetric): Promise<void> {
  const conversionRate = data.registrations > 0
    ? (data.first_sessions / data.registrations) * 100
    : 0;

  logger.info('Conversion rate KPI', {
    organization_id: data.organization_id,
    conversion_rate: conversionRate.toFixed(2) + '%',
    registrations: data.registrations,
    first_sessions: data.first_sessions,
  });

  // Record as a percentage metric
  const { recordBusinessMetric } = await import('./metrics');
  recordBusinessMetric(
    'conversion_rate' as any,
    conversionRate,
    {
      organization_id: data.organization_id,
    },
    MetricValueType.PERCENTAGE
  );
}

/**
 * Records appointment cancellation rate
 */
export async function recordCancellationRateKPI(
  organizationId: string,
  total: number,
  cancelled: number
): Promise<void> {
  const rate = total > 0 ? (cancelled / total) * 100 : 0;

  logger.info('Cancellation rate KPI', {
    organization_id: organizationId,
    cancellation_rate: rate.toFixed(2) + '%',
    total,
    cancelled,
  });
}
