import { onRequest } from 'firebase-functions/v2/https';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { logger } from '../lib/logger';

const visionClient = new ImageAnnotatorClient();
const httpOpts = { region: 'southamerica-east1' as const, memory: '1GiB' as const,
  cpu: 1 as const,
  maxInstances: 5, cors: true };

/**
 * Scanner de Laudos: Transforma imagem de exame em texto
 */
export const scanMedicalReportHttp = onRequest(httpOpts, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    await authorizeRequest(extractBearerToken(token));
    
    const { imageBase64 } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!imageBase64) { res.status(400).json({ error: 'Imagem base64 é obrigatória' }); return; }

    logger.info('Iniciando OCR de laudo...');

    // 1. Executar detecção de texto via Google Cloud Vision
    const [result] = await visionClient.textDetection({
      image: { content: imageBase64 }
    });

    const fullText = result.fullTextAnnotation?.text || '';

    // 2. Otimização: Você poderia passar esse texto pelo Gemini aqui mesmo 
    // para extrair campos como "Data do Exame", "Conclusão", etc.

    res.json({ 
      data: { 
        text: fullText,
        confidence: result.textAnnotations?.[0]?.confidence || 0 
      } 
    });

  } catch (e: any) {
    logger.error('scanMedicalReport error:', e);
    res.status(500).json({ error: 'Falha ao escanear laudo' });
  }
});
