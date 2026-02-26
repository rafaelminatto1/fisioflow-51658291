import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as admin from 'firebase-admin';
import { logger } from '../lib/logger';
import { DlpServiceClient } from '@google-cloud/dlp';

// Initialize the DLP client
const dlp = new DlpServiceClient();
const firestore = admin.firestore();

export const scanDocumentDLP = onObjectFinalized(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
  },
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Only process files in the /exames folder
    if (!filePath.startsWith('exames/')) {
      return;
    }

    // Only process text, pdf or images (DLP supports images too, but for cost we might limit it)
    if (!contentType || (!contentType.startsWith('image/') && contentType !== 'application/pdf' && !contentType.startsWith('text/'))) {
      logger.info(`[DLP] Skipping non-supported content type: ${contentType} for file ${filePath}`);
      return;
    }

    logger.info(`[DLP] Starting DLP scan for file: ${filePath}`);

    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG!).projectId : 'fisioflow-migration';

    try {
      // Configuration for what to find (PII/PHI)
      const infoTypes = [
        { name: 'BRAZIL_CPF' },
        { name: 'EMAIL_ADDRESS' },
        { name: 'PHONE_NUMBER' },
        { name: 'PERSON_NAME' },
        // { name: 'MEDICAL_TERM' } // Available depending on region/config
      ];

      // Build the request
      const request = {
        parent: `projects/${projectId}/locations/global`,
        inspectJob: {
          inspectConfig: {
            infoTypes: infoTypes,
            minLikelihood: 'LIKELY',
            limits: {
              maxFindingsPerRequest: 50,
            },
          },
          storageConfig: {
            cloudStorageOptions: {
              fileSet: {
                url: `gs://${fileBucket}/${filePath}`
              }
            }
          }
        }
      };

      // In a real production scenario with large files, we'd trigger an async job
      // For immediate scanning on smaller files, we can use inspectContent or createDlpJob
      // Let's create a DLP job to scan the file in Cloud Storage directly
      
      const [job] = await dlp.createDlpJob(request as any);
      logger.info(`[DLP] Job created: ${job.name}`);

      // We save the job status to Firestore to track it
      await firestore.collection('dlp_audit_logs').add({
        filePath,
        jobName: job.name,
        bucket: fileBucket,
        status: 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    } catch (error) {
      logger.error(`[DLP] Failed to scan document ${filePath}:`, error);
    }
  }
);
