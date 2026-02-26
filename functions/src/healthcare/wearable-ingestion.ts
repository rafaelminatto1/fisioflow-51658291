import { onRequest } from 'firebase-functions/v2/https';
import { logger } from '../lib/logger';
import { GoogleAuth } from 'google-auth-library';
import * as admin from 'firebase-admin';

// Initialize auth
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-healthcare']
});

const firestore = admin.firestore();

export const ingestWearableData = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 1,
    cors: true,
  },
  async (req, res) => {
    // Basic validation of incoming webhook (e.g. from Terra API or Apple HealthKit)
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { patientId, provider, type, value, unit, timestamp } = req.body;

    if (!patientId || !type || value === undefined) {
      res.status(400).send('Missing required fields (patientId, type, value)');
      return;
    }

    try {
      const client = await auth.getClient();
      const projectId = process.env.GCLOUD_PROJECT || 'fisioflow-migration';
      const location = 'southamerica-east1';
      const datasetId = 'fisioflow-medical-data';
      const fhirStoreId = 'wearable-data';

      // Build FHIR Observation resource
      let fhirCode = '';
      let fhirDisplay = '';
      
      switch (type) {
        case 'heart_rate':
          fhirCode = '8867-4';
          fhirDisplay = 'Heart rate';
          break;
        case 'steps':
          fhirCode = '55423-8';
          fhirDisplay = 'Number of steps';
          break;
        case 'sleep_duration':
          fhirCode = '93832-4';
          fhirDisplay = 'Sleep duration';
          break;
        default:
          fhirCode = '12345-6'; // Generic/Unknown code for fallback
          fhirDisplay = type;
      }

      const fhirObservation = {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'activity',
                display: 'Activity'
              }
            ]
          }
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: fhirCode,
              display: fhirDisplay
            }
          ],
          text: fhirDisplay
        },
        subject: {
          reference: `Patient/${patientId}`
        },
        effectiveDateTime: timestamp || new Date().toISOString(),
        valueQuantity: {
          value: Number(value),
          unit: unit || '',
          system: 'http://unitsofmeasure.org'
        },
        device: {
          display: provider || 'Unknown Wearable'
        }
      };

      const fhirUrl = `https://healthcare.googleapis.com/v1/projects/${projectId}/locations/${location}/datasets/${datasetId}/fhirStores/${fhirStoreId}/fhir/Observation`;

      // In a real environment, the dataset and store must exist. We try to push.
      try {
        const response = await client.request({
          url: fhirUrl,
          method: 'POST',
          data: fhirObservation,
        });

        const data = response.data as any;
        logger.info(`[Wearable] FHIR Observation created with ID: ${data.id}`);

        // Also save a lightweight summary in Firestore for rapid UI loading
        await firestore.collection('patients').doc(patientId)
          .collection('wearable_metrics')
          .add({
            type,
            value,
            unit,
            timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp || Date.now())),
            fhirId: data.id,
            provider
          });

        res.status(200).json({ success: true, fhirId: data.id });
      } catch (fhirError: any) {
        logger.warn(`[Wearable] FHIR Store push failed: ${fhirError.message}. Dataset/Store might not exist yet. Using fallback Firestore...`);
        
        // Fallback if FHIR store is not yet provisioned in GCP Console
        await firestore.collection('patients').doc(patientId)
          .collection('wearable_metrics')
          .add({
            type,
            value,
            unit,
            timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp || Date.now())),
            provider,
            status: 'fallback_firestore_only'
          });

        res.status(200).json({ success: true, warning: 'Saved to Firestore only. FHIR store missing.' });
      }

    } catch (error) {
      logger.error(`[Wearable] Failed to process wearable data:`, error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
);
