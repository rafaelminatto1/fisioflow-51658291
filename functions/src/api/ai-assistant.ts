import { onRequest } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { VertexAI } from '@google-cloud/vertexai';
import { logger } from '../lib/logger';

const httpOpts = { region: 'southamerica-east1' as const, memory: '512MiB' as const, maxInstances: 10, cors: true };

/**
 * Assistente de IA que analisa todo o histórico do paciente via Gemini (Versão Estável Vertex AI)
 */
/**
 * Assistente de IA que analisa todo o histórico do paciente via Gemini (Versão Estável Vertex AI)
 */
export const getPatientAISummaryHttpHandler = async (req: any, res: any) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const auth = await authorizeRequest(extractBearerToken(token));

    const { patientId } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }

    const pool = getPool();

    // 1. Coletar contexto massivo do Postgres
    const [patientRes, evolutionsRes, goalsRes] = await Promise.all([
      pool.query('SELECT name, main_condition, medical_history FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]),
      pool.query('SELECT record_date, content FROM medical_records WHERE patient_id = $1 ORDER BY record_date DESC LIMIT 30', [patientId]),
      pool.query('SELECT description, status FROM patient_goals WHERE patient_id = $1', [patientId])
    ]);

    if (patientRes.rows.length === 0) { res.status(404).json({ error: 'Paciente não encontrado' }); return; }

    const patient = patientRes.rows[0];
    const evolutions = evolutionsRes.rows;
    const goals = goalsRes.rows;

    const context = `
      Paciente: ${patient.name}
      Metas: ${goals.map(g => g.description).join(', ')}
      Evoluções: ${evolutions.map(e => `${e.record_date}: ${e.content}`).join('\n')}
    `;

    // 2. Chamar Vertex AI
    const vertexAI = new VertexAI({ project: process.env.GCP_PROJECT || 'fisioflow-migration', location: 'us-central1' });
    const generativeModel = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analise o prontuário: ${context}. Resuma o estado atual e sugira conduta em Markdown.`;

    const result = await generativeModel.generateContent(prompt);
    const summary = result.response.candidates?.[0].content.parts[0].text;

    res.json({ data: { summary, timestamp: new Date().toISOString() } });

  } catch (e: any) {
    logger.error('getPatientAISummary error:', e);
    res.status(500).json({ error: 'Falha na análise de IA' });
  }
};

export const getPatientAISummaryHttp = onRequest(httpOpts, getPatientAISummaryHttpHandler);