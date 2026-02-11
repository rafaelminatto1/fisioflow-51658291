
/**
 * Lista templates de avaliação
 */

import { CORS_ORIGINS, getPool } from '../init';
import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import { authorizeRequest, extractBearerToken } from '../middleware/auth';
import { logger } from '../lib/logger';
import { setCorsHeaders } from '../lib/cors';

function getAuthHeader(req: any): string | undefined {
  const h = req.headers?.authorization || req.headers?.Authorization;
  return Array.isArray(h) ? h[0] : h;
}

function parseBody(req: any): any {
  return typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })() : (req.body || {});
}

// ============================================================================
// HTTP VERSIONS (CORS fix)
// ============================================================================

export const listAssessmentTemplatesHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, description, category, is_global, display_order, is_active, created_at, updated_at 
       FROM assessment_templates WHERE is_active = true AND (organization_id = $1 OR is_global = true) 
       ORDER BY display_order, name`,
      [auth.organizationId]
    );
    res.json({ data: result.rows });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('listAssessmentTemplatesHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao listar templates' });
  }
});

export const getAssessmentTemplateHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { templateId } = parseBody(req);
    if (!templateId) { res.status(400).json({ error: 'templateId é obrigatório' }); return; }
    const pool = getPool();
    const templateResult = await pool.query(
      `SELECT * FROM assessment_templates WHERE id = $1 AND is_active = true AND (organization_id = $2 OR is_global = true)`,
      [templateId, auth.organizationId]
    );
    if (templateResult.rows.length === 0) { res.status(404).json({ error: 'Template não encontrado' }); return; }
    const template = templateResult.rows[0];
    const sectionsResult = await pool.query(`SELECT * FROM assessment_sections WHERE template_id = $1 AND is_active = true ORDER BY "order"`, [templateId]);
    const sectionIds = sectionsResult.rows.map((s: { id: string }) => s.id);
    const sectionsWithQuestions = sectionsResult.rows.map((s: any) => ({ ...s, questions: [] }));
    if (sectionIds.length > 0) {
      const questionsResult = await pool.query(`SELECT * FROM assessment_questions WHERE section_id = ANY($1) AND is_active = true ORDER BY section_id, "order"`, [sectionIds]);
      questionsResult.rows.forEach((q: { section_id: string }) => {
        const section = sectionsWithQuestions.find(s => s.id === q.section_id);
        if (section) section.questions.push(q);
      });
    }
    res.json({ data: { ...template, sections: sectionsWithQuestions } });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('getAssessmentTemplateHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao buscar template' });
  }
});

export const listAssessmentsHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId, status } = parseBody(req);
    if (!patientId) { res.status(400).json({ error: 'patientId é obrigatório' }); return; }
    const pool = getPool();
    let query = `SELECT a.*, t.name as template_name, p.full_name as performer_name FROM patient_assessments a LEFT JOIN assessment_templates t ON a.template_id = t.id LEFT JOIN profiles p ON a.performed_by = p.user_id WHERE a.patient_id = $1 AND a.organization_id = $2`;
    const params: (string | number)[] = [patientId, auth.organizationId];
    if (status) { query += ` AND a.status = $3`; params.push(status); }
    query += ` ORDER BY a.assessment_date DESC, a.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('listAssessmentsHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao listar avaliações' });
  }
});

export const getAssessmentHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { assessmentId } = parseBody(req);
    if (!assessmentId) { res.status(400).json({ error: 'assessmentId é obrigatório' }); return; }
    const pool = getPool();
    const assessmentResult = await pool.query(`SELECT * FROM patient_assessments WHERE id = $1 AND organization_id = $2`, [assessmentId, auth.organizationId]);
    if (assessmentResult.rows.length === 0) { res.status(404).json({ error: 'Avaliação não encontrada' }); return; }
    const assessment = assessmentResult.rows[0];
    const responsesResult = await pool.query(`SELECT ar.*, q.question_text, q.answer_type, q.options FROM assessment_responses ar LEFT JOIN assessment_questions q ON ar.question_id = q.id WHERE ar.assessment_id = $1 ORDER BY q.section_id, q.order`, [assessmentId]);
    res.json({ data: { ...assessment, responses: responsesResult.rows } });
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('getAssessmentHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao buscar avaliação' });
  }
});

export const createAssessmentHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { patientId, templateId, title, assessmentDate, responses } = parseBody(req);
    if (!patientId || !templateId) { res.status(400).json({ error: 'patientId e templateId são obrigatórios' }); return; }
    const pool = getPool();
    const templateCheck = await pool.query(`SELECT id FROM assessment_templates WHERE id = $1 AND is_active = true`, [templateId]);
    if (templateCheck.rows.length === 0) { res.status(404).json({ error: 'Template não encontrado' }); return; }
    await pool.query('BEGIN');
    try {
      const assessmentResult = await pool.query(`INSERT INTO patient_assessments (patient_id, template_id, title, assessment_date, performed_by, organization_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [patientId, templateId, title || 'Avaliação', assessmentDate || new Date().toISOString().split('T')[0], auth.userId, auth.organizationId, 'completed']);
      const assessment = assessmentResult.rows[0];
      if (responses && Array.isArray(responses)) {
        for (const response of responses) {
          await pool.query(`INSERT INTO assessment_responses (assessment_id, question_id, answer_text, answer_number, answer_json) VALUES ($1, $2, $3, $4, $5)`, [assessment.id, response.question_id, response.answer_text || null, response.answer_number || null, response.answer_json ? JSON.stringify(response.answer_json) : null]);
        }
      }
      await pool.query('COMMIT');
      res.status(201).json({ data: assessment });
    } catch (e) { await pool.query('ROLLBACK'); throw e; }
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('createAssessmentHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao criar avaliação' });
  }
});

export const updateAssessmentHttp = onRequest({ region: 'southamerica-east1', memory: '256MiB', maxInstances: 1, cors: CORS_ORIGINS, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') { setCorsHeaders(res); res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  setCorsHeaders(res);
  try {
    const auth = await authorizeRequest(extractBearerToken(getAuthHeader(req)));
    const { assessmentId, responses, ...updates } = parseBody(req);
    if (!assessmentId) { res.status(400).json({ error: 'assessmentId é obrigatório' }); return; }
    const pool = getPool();
    const existing = await pool.query('SELECT * FROM patient_assessments WHERE id = $1 AND organization_id = $2', [assessmentId, auth.organizationId]);
    if (existing.rows.length === 0) { res.status(404).json({ error: 'Avaliação não encontrada' }); return; }
    await pool.query('BEGIN');
    try {
      const allowedFields = ['title', 'status', 'conclusion', 'recommendations', 'next_assessment_date'];
      const setClauses: string[] = []; const values: any[] = []; let pCount = 0;
      for (const field of allowedFields) { if (field in updates) { pCount++; setClauses.push(`${field} = $${pCount}`); values.push(updates[field]); } }
      if (setClauses.length > 0) { pCount++; setClauses.push(`updated_at = $${pCount}`); values.push(new Date()); values.push(assessmentId, auth.organizationId); await pool.query(`UPDATE patient_assessments SET ${setClauses.join(', ')} WHERE id = $${pCount + 1} AND organization_id = $${pCount + 2}`, values); }
      if (responses && Array.isArray(responses)) {
        await pool.query('DELETE FROM assessment_responses WHERE assessment_id = $1', [assessmentId]);
        for (const response of responses) { await pool.query(`INSERT INTO assessment_responses (assessment_id, question_id, answer_text, answer_number, answer_json) VALUES ($1, $2, $3, $4, $5)`, [assessmentId, response.question_id, response.answer_text || null, response.answer_number || null, response.answer_json ? JSON.stringify(response.answer_json) : null]); }
      }
      await pool.query('COMMIT');
      res.json({ success: true });
    } catch (e) { await pool.query('ROLLBACK'); throw e; }
  } catch (e: unknown) {
    if (e instanceof HttpsError && e.code === 'unauthenticated') { res.status(401).json({ error: e.message }); return; }
    logger.error('updateAssessmentHttp:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao atualizar avaliação' });
  }
});

// ============================================================================
// INTERFACES & CALLABLE
// ============================================================================

// Handlers for unified service (callable wrapper)
export async function listAssessmentsHandler(request: any) {
  // For now, just return empty - the HTTP versions handle the actual logic
  return { data: [] };
}

export async function getAssessmentHandler(request: any) {
  return { data: null };
}

export async function createAssessmentHandler(request: any) {
  return { success: false, message: 'Use HTTP endpoints' };
}

export async function updateAssessmentHandler(request: any) {
  return { success: false, message: 'Use HTTP endpoints' };
}

export async function listAssessmentTemplatesHandler(request: any) {
  return { data: [] };
}

export async function getAssessmentTemplateHandler(request: any) {
  return { data: null };
}
