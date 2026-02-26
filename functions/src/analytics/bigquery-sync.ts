import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { BigQuery } from '@google-cloud/bigquery';
import { logger } from '../lib/logger';

const bq = new BigQuery();
const DATASET_ID = 'clinical_analytics';
const TABLE_ID = 'wearable_metrics_fhir';

/**
 * Cloud Function: Sync FHIR Observations from Wearables to BigQuery
 * 
 * Part of the "Healthcare Data Engine" pattern for longitudinal analytics.
 */
export const syncFhirToBigQuery = onDocumentCreated(
  {
    document: 'patients/{patientId}/wearable_metrics/{metricId}',
    region: 'southamerica-east1',
  },
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.fhirId) return;

    const patientId = event.params.patientId;

    logger.info(`[BigQuery] Syncing metric ${data.type} for patient ${patientId}`);

    try {
      const row = {
        patient_id: patientId,
        metric_type: data.type,
        value: data.value,
        unit: data.unit,
        timestamp: data.timestamp?.toDate?.() || new Date(),
        fhir_id: data.fhirId,
        provider: data.provider,
        created_at: new Date(),
      };

      // In production, we'd ensure dataset/table exist
      await bq.dataset(DATASET_ID).table(TABLE_ID).insert([row]);
      
      logger.info(`[BigQuery] Successfully synced metric ${data.fhirId}`);
    } catch (error) {
      logger.error('[BigQuery] Failed to sync FHIR data:', error);
      
      // Fallback: log as structured data for log-based ingestion
      console.log(JSON.stringify({
        event: 'BIGQUERY_SYNC_FAILURE',
        patientId,
        fhirId: data.fhirId,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }
);
