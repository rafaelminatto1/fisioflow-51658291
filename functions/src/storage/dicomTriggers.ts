import { onObjectFinalized, StorageEvent } from 'firebase-functions/v2/storage';
import { callImageProcessor } from '../healthcare/adapter';
import * as admin from 'firebase-admin';

/**
 * Trigger disparada quando um arquivo DICOM é carregado no Storage.
 * Caminho esperado: medical-exams/{patientId}/{fileName}.dcm
 */
export const onDicomUpload = onObjectFinalized(
  {
    region: 'southamerica-east1',
  },
  async (event: StorageEvent) => {
    const object = event.data;
    const filePath = object.name; // Ex: medical-exams/patient123/exam01.dcm

    if (!filePath || !filePath.endsWith('.dcm')) {
      console.log('Not a DICOM file, skipping processing.');
      return null;
    }

    const pathParts = filePath.split('/');
    if (pathParts[0] !== 'medical-exams' || pathParts.length < 3) {
      console.log('File is outside medical-exams folder, skipping.');
      return null;
    }

    const patientId = pathParts[1];
    const gcsPath = `gs://${object.bucket}/${filePath}`;

    try {
      console.log(`Starting DICOM processing for patient ${patientId}: ${gcsPath}`);

      const result: any = await callImageProcessor(gcsPath);

      console.log('Processing complete:', result);

      // Salvar os metadados no Firestore para o paciente
      if (result.status === 'success' && result.metadata) {
        await admin.firestore()
          .collection('patients')
          .doc(patientId)
          .collection('exams')
          .add({
            type: 'DICOM',
            gcsPath: gcsPath,
            metadata: result.metadata,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'PROCESSED'
          });

        console.log(`Metadata saved to Firestore for patient ${patientId}`);
      }

      return result;
    } catch (error) {
      console.error('Error calling image processor:', error);

      // Registrar erro no Firestore
      await admin.firestore()
        .collection('patients')
        .doc(patientId)
        .collection('exams')
        .add({
          type: 'DICOM',
          gcsPath: gcsPath,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'ERROR'
        });

      throw error;
    }
  }
);
