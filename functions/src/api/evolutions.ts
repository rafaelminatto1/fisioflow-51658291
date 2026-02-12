import { onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getPool, getAdminAuth } from '../init';
import { getOrganizationIdCached } from '../lib/cache-helpers';
import { logger } from '../lib/logger';
import { setCorsHeaders } from '../lib/cors';
import { EVOLUTION_HTTP_OPTS } from '../lib/function-config';
import { logAuditEvent } from '../lib/audit';

async function verifyAuthHeader(req: any): Promise<{ uid: string }> {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new HttpsError('unauthenticated', 'No bearer token');
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      return { uid: decodedToken.uid };
    } catch (error) {
      throw new HttpsError('unauthenticated', 'Invalid token');
    }
}

/**
 * List evolutions for a patient
 */
export const listEvolutionsHttp = onRequest(EVOLUTION_HTTP_OPTS, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const { uid } = await verifyAuthHeader(req);
    const organizationId = await getOrganizationIdCached(uid);
    const { patientId } = req.body;

    if (!patientId) {
      res.status(400).json({ error: 'patientId é obrigatório' });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM evolutions WHERE organization_id = $1 AND patient_id = $2 ORDER BY date DESC',
      [organizationId, patientId]
    );

    res.json({ data: result.rows });
  } catch (error: any) {
    logger.error('Error in listEvolutionsHttp:', error);
    res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * Get a single evolution by ID
 */
export const getEvolutionHttp = onRequest(EVOLUTION_HTTP_OPTS, async (req, res) => {
    setCorsHeaders(res, req);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationIdCached(uid);
      const { evolutionId } = req.body;
  
      if (!evolutionId) {
        res.status(400).json({ error: 'evolutionId é obrigatório' });
        return;
      }
  
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM evolutions WHERE organization_id = $1 AND id = $2',
        [organizationId, evolutionId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Evolução não encontrada' });
        return;
      }
  
      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error('Error in getEvolutionHttp:', error);
      res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message || 'Internal Server Error' });
    }
});


/**
 * Create a new evolution
 */
export const createEvolutionHttp = onRequest(EVOLUTION_HTTP_OPTS, async (req, res) => {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const { uid } = await verifyAuthHeader(req);
    const organizationId = await getOrganizationIdCached(uid);
    const { patientId, appointmentId, date, subjective, objective, assessment, plan, pain_level, attachments } = req.body;

    if (!patientId || !date) {
      res.status(400).json({ error: 'patientId e date são obrigatórios' });
      return;
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO evolutions (patient_id, therapist_id, organization_id, appointment_id, date, subjective, objective, assessment, plan, pain_level, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [patientId, uid, organizationId, appointmentId, date, subjective, objective, assessment, plan, pain_level, attachments ? JSON.stringify(attachments) : null]
    );

    // Log Audit Event (Healthcare standard)
    if (result.rows.length > 0) {
      await logAuditEvent({
        action: 'create',
        resourceType: 'evolution',
        resourceId: result.rows[0].id,
        userId: uid,
        organizationId,
        description: 'Evolução clínica criada',
        sensitivity: 'phi'
      });
    }

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    logger.error('Error in createEvolutionHttp:', error);
    res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * Update an evolution
 */
export const updateEvolutionHttp = onRequest(EVOLUTION_HTTP_OPTS, async (req, res) => {
    setCorsHeaders(res, req);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationIdCached(uid);
      const { evolutionId, ...updates } = req.body;
  
      if (!evolutionId) {
        res.status(400).json({ error: 'evolutionId é obrigatório' });
        return;
      }

      const allowedFields = ['date', 'subjective', 'objective', 'assessment', 'plan', 'pain_level', 'attachments'];
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      for (const key of Object.keys(updates)) {
          if(allowedFields.includes(key)) {
              setClauses.push(`${key} = $${paramCount}`);
              const value = key === 'attachments' ? JSON.stringify(updates[key]) : updates[key];
              values.push(value);
              paramCount++;
          }
      }

      if (setClauses.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(evolutionId, organizationId);
  
      const pool = getPool();
      const result = await pool.query(
        `UPDATE evolutions SET ${setClauses.join(', ')} WHERE id = $${paramCount} AND organization_id = $${paramCount + 1} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Evolução não encontrada para atualização' });
        return;
      }
  
      res.json({ data: result.rows[0] });
    } catch (error: any) {
      logger.error('Error in updateEvolutionHttp:', error);
      res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message || 'Internal Server Error' });
    }
});

/**
 * Delete an evolution
 */
export const deleteEvolutionHttp = onRequest(EVOLUTION_HTTP_OPTS, async (req, res) => {
    setCorsHeaders(res, req);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  
    try {
      const { uid } = await verifyAuthHeader(req);
      const organizationId = await getOrganizationIdCached(uid);
      const { evolutionId } = req.body;
  
      if (!evolutionId) {
        res.status(400).json({ error: 'evolutionId é obrigatório' });
        return;
      }
  
      const pool = getPool();
      const result = await pool.query(
        'DELETE FROM evolutions WHERE id = $1 AND organization_id = $2',
        [evolutionId, organizationId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Evolução não encontrada para exclusão' });
        return;
      }
  
      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error('Error in deleteEvolutionHttp:', error);
      res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message || 'Internal Server Error' });
    }
});
