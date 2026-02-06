import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'fisioflow-production';
const LOCATION = 'southamerica-east1'; // ou us-central1
const DATASET_ID = 'fisioflow-medical-data';
const DICOM_STORE_ID = 'patient-exams';

const BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/dicomStores/${DICOM_STORE_ID}`;

const CLOUD_RUN_URL = 'https://image-processor-412418905255.us-central1.run.app';

// Inicializa autenticação com a conta de serviço padrão do Cloud Functions
const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/cloud-healthcare',
    'https://www.googleapis.com/auth/cloud-platform'
  ],
});

/**
 * Chama o worker no Cloud Run para processar uma imagem DICOM
 */
export async function callImageProcessor(gcsPath: string) {
  const client = await auth.getClient();
  
  // Obter ID Token para autenticação Service-to-Service se o Cloud Run fosse privado
  // Como está público por enquanto, um request simples funcionaria, mas vamos usar o client.request por padrão
  const response = await client.request({
    url: `${CLOUD_RUN_URL}/process-dicom`,
    method: 'POST',
    data: { gcs_path: gcsPath },
  });

  return response.data;
}

/**
 * Gera um token de acesso para o frontend usar (ex: OHIF Viewer)
 * Nota: Em produção, restrinja o escopo deste token!
 */
export async function generateDicomToken() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return {
    token: token.token,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hora
  };
}

/**
 * Busca estudos DICOM de um paciente específico
 */
export async function searchDicomStudies(patientId: string) {
  const client = await auth.getClient();
  
  // FHIR/DICOMweb search
  const url = `${BASE_URL}/dicomWeb/studies?PatientID=${patientId}`;
  
  const response = await client.request({ url });
  return response.data;
}

/**
 * URL base para configuração do visualizador no frontend
 */
export function getDicomStoreUrl() {
  return BASE_URL;
}
