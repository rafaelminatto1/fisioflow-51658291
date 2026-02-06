import { test, expect } from '@playwright/test';

const WORKER_URL = 'https://fisioflow-image-worker-412418905255.southamerica-east1.run.app';
const AI_SERVICE_URL = 'https://generateexerciseplan-tfecm5cqoq-rj.a.run.app';

test.describe('Integração FisioFlow Google Cloud', () => {

  test('Deve validar que o Worker de Imagens está Online', async ({ request }) => {
    const response = await request.get(`${WORKER_URL}/`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('fisioflow-image-worker');
    
    console.log('✅ Worker verificado com sucesso via Playwright!');
  });

  test('Deve validar conectividade com o serviço de IA', async ({ request }) => {
    // Nota: O 401 é esperado aqui via Playwright sem Auth do Google
    // Mas validamos que o DNS resolve e o serviço responde (mesmo que com 401)
    const response = await request.get(`${AI_SERVICE_URL}/`);
    expect(response.status()).toBe(401);
    
    console.log('✅ Conectividade com Serviço de IA validada (Endpoint Ativo).');
  });

  test('Deve testar o processamento de DICOM (Mock)', async ({ request }) => {
    const response = await request.post(`${WORKER_URL}/process-dicom`, {
      data: {
        gcs_path: 'gs://fisioflow-test/exame_exemplo.dcm'
      }
    });
    
    expect([202, 222]).toContain(response.status()); // Aceito para processamento
    const data = await response.json();
    expect(data.status).toBe('processing_started');
    
    console.log('✅ Fluxo de processamento de imagem simulado com sucesso!');
  });

});
