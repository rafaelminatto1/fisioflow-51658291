/**
 * Rotas: Sessões Clínicas (SOAP Records)
 *
 * GET    /api/sessions?patientId=&status=&appointmentId=&limit=&offset=
 * GET    /api/sessions/:id
 * POST   /api/sessions/autosave   — upsert por recordId ou appointmentId (antes de /:id)
 * POST   /api/sessions            — criar sessão
 * PUT    /api/sessions/:id        — atualizar sessão
 * POST   /api/sessions/:id/finalize — finalizar/assinar
 * DELETE /api/sessions/:id        — excluir (apenas drafts)
 *
 * Mapeamento de campos:
 *   SoapRecord.subjective/objective/assessment/plan → sessions.subjective/... (JSONB {text:"..."})
 *   SoapRecord.pain_level/location/character       → sessions.required_tests (JSONB {pain_level,...})
 *   SoapRecord.record_date                         → sessions.date (timestamp, só data)
 *   SoapRecord.created_by                          → sessions.therapist_id (uid do JWT)
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== HELPERS =====

/** Serializa um texto para JSONB no formato { text: "..." } */
function textToJsonb(val: unknown): string | null {
  if (val == null || val === '') return null;
  return JSON.stringify({ text: String(val) });
}

/** Extrai texto de um valor JSONB (suporta { text: "..." }, string JSON ou null) */
function jsonbToText(val: unknown): string | undefined {
  if (val == null) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if ('text' in obj) return obj.text != null ? String(obj.text) : undefined;
    return JSON.stringify(val);
  }
  return undefined;
}

/** Mapeia linha do PostgreSQL para o formato SoapRecord do frontend */
function rowToRecord(row: Record<string, unknown>) {
  const pain =
    typeof row.required_tests === 'object' && row.required_tests !== null
      ? (row.required_tests as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    patient_id: row.patient_id,
    appointment_id: row.appointment_id ?? undefined,
    session_number: row.session_number != null ? Number(row.session_number) : undefined,
    subjective: jsonbToText(row.subjective),
    objective: jsonbToText(row.objective),
    assessment: jsonbToText(row.assessment),
    plan: jsonbToText(row.plan),
    status: (row.status as string) ?? 'draft',
    pain_level: pain.pain_level != null ? Number(pain.pain_level) : undefined,
    pain_location: typeof pain.pain_location === 'string' ? pain.pain_location : undefined,
    pain_character: typeof pain.pain_character === 'string' ? pain.pain_character : undefined,
    duration_minutes: row.duration_minutes != null ? Number(row.duration_minutes) : undefined,
    last_auto_save_at: row.last_auto_save_at ? String(row.last_auto_save_at) : undefined,
    finalized_at: row.finalized_at ? String(row.finalized_at) : undefined,
    finalized_by: row.finalized_by ? String(row.finalized_by) : undefined,
    record_date: row.date
      ? new Date(String(row.date)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    created_by: row.therapist_id ? String(row.therapist_id) : undefined,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    signed_at: row.finalized_at ? String(row.finalized_at) : undefined,
  };
}

// ===== LISTA =====
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, status, appointmentId, limit = '20', offset = '0' } = c.req.query();

  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
  const offsetNum = Math.max(0, parseInt(offset) || 0);

  const params: Array<string | number> = [patientId, user.organizationId];
  let where = 'WHERE patient_id = $1 AND organization_id = $2';

  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }
  if (appointmentId) {
    params.push(appointmentId);
    where += ` AND appointment_id = $${params.length}`;
  }

  params.push(limitNum, offsetNum);

  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `SELECT * FROM sessions ${where} ORDER BY date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM sessions ${where}`,
      params.slice(0, params.length - 2),
    ),
  ]);

  return c.json({
    data: dataRes.rows.map(rowToRecord),
    total: countRes.rows[0]?.total ?? 0,
  });
});

// ===== AUTOSAVE (declarado antes de /:id para evitar conflito de rota) =====
app.post('/autosave', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const pain = JSON.stringify({
    pain_level: body.pain_level ?? null,
    pain_location: body.pain_location ?? null,
    pain_character: body.pain_character ?? null,
  });

  const subjJsonb = body.subjective != null ? textToJsonb(body.subjective) : null;
  const objJsonb = body.objective != null ? textToJsonb(body.objective) : null;
  const assJsonb = body.assessment != null ? textToJsonb(body.assessment) : null;
  const planJsonb = body.plan != null ? textToJsonb(body.plan) : null;
  const durationNum = body.duration_minutes != null ? Number(body.duration_minutes) : null;

  const buildUpdateQuery = (id: string) =>
    pool.query(
      `UPDATE sessions SET
        subjective        = COALESCE($1::jsonb, subjective),
        objective         = COALESCE($2::jsonb, objective),
        assessment        = COALESCE($3::jsonb, assessment),
        plan              = COALESCE($4::jsonb, plan),
        duration_minutes  = COALESCE($5, duration_minutes),
        required_tests    = $6::jsonb,
        last_auto_save_at = NOW(),
        updated_at        = NOW()
      WHERE id = $7 AND organization_id = $8
      RETURNING *`,
      [subjJsonb, objJsonb, assJsonb, planJsonb, durationNum, pain, id, user.organizationId],
    );

  // 1. Se tem recordId, atualiza diretamente
  if (body.recordId || body.id) {
    const id = String(body.recordId ?? body.id);
    const res = await buildUpdateQuery(id);
    if (res.rows.length) {
      return c.json({ data: { ...rowToRecord(res.rows[0]), isNew: false } });
    }
  }

  // 2. Se tem appointment_id, busca draft existente
  if (body.appointment_id) {
    const appointmentId = String(body.appointment_id);
    const existing = await pool.query(
      `SELECT id FROM sessions WHERE appointment_id = $1 AND organization_id = $2 AND status = 'draft' LIMIT 1`,
      [appointmentId, user.organizationId],
    );
    if (existing.rows.length) {
      const res = await buildUpdateQuery(existing.rows[0].id);
      if (res.rows.length) {
        return c.json({ data: { ...rowToRecord(res.rows[0]), isNew: false } });
      }
    }
  }

  // 3. Cria novo registro
  const recordDate = body.record_date
    ? String(body.record_date)
    : new Date().toISOString().split('T')[0];

  const createRes = await pool.query(
    `INSERT INTO sessions (
      patient_id, appointment_id, therapist_id, organization_id,
      date, duration_minutes,
      subjective, objective, assessment, plan,
      status, required_tests,
      last_auto_save_at, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6,
      $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb,
      'draft', $11::jsonb,
      NOW(), NOW(), NOW()
    ) RETURNING *`,
    [
      patientId,
      body.appointment_id ? String(body.appointment_id) : null,
      user.uid,
      user.organizationId,
      recordDate,
      durationNum,
      subjJsonb,
      objJsonb,
      assJsonb,
      planJsonb,
      pain,
    ],
  );

  return c.json({ data: { ...rowToRecord(createRes.rows[0]), isNew: true } }, 201);
});

// ===== DETALHE =====
app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'SELECT * FROM sessions WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Sessão não encontrada' }, 404);
  return c.json({ data: rowToRecord(result.rows[0]) });
});

// ===== FINALIZAR / ASSINAR =====
app.post('/:id/finalize', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `UPDATE sessions SET
      status       = 'finalized',
      finalized_at = NOW(),
      finalized_by = $1,
      updated_at   = NOW()
    WHERE id = $2 AND organization_id = $3 AND status != 'finalized'
    RETURNING *`,
    [user.uid, id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Sessão não encontrada ou já finalizada' }, 404);
  return c.json({ data: rowToRecord(result.rows[0]) });
});

// ===== CRIAR =====
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const recordDate = body.record_date
    ? String(body.record_date)
    : new Date().toISOString().split('T')[0];

  const pain = JSON.stringify({
    pain_level: body.pain_level ?? null,
    pain_location: body.pain_location ?? null,
    pain_character: body.pain_character ?? null,
  });

  const result = await pool.query(
    `INSERT INTO sessions (
      patient_id, appointment_id, therapist_id, organization_id,
      date, duration_minutes,
      subjective, objective, assessment, plan,
      status, required_tests,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6,
      $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb,
      $11, $12::jsonb,
      NOW(), NOW()
    ) RETURNING *`,
    [
      patientId,
      body.appointment_id ? String(body.appointment_id) : null,
      user.uid,
      user.organizationId,
      recordDate,
      body.duration_minutes != null ? Number(body.duration_minutes) : null,
      textToJsonb(body.subjective),
      textToJsonb(body.objective),
      textToJsonb(body.assessment),
      textToJsonb(body.plan),
      body.status ?? 'draft',
      pain,
    ],
  );

  return c.json({ data: rowToRecord(result.rows[0]) }, 201);
});

// ===== ATUALIZAR =====
app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: Array<string | number | null> = [];

  if ('subjective' in body) {
    params.push(textToJsonb(body.subjective));
    sets.push(`subjective = $${params.length}::jsonb`);
  }
  if ('objective' in body) {
    params.push(textToJsonb(body.objective));
    sets.push(`objective = $${params.length}::jsonb`);
  }
  if ('assessment' in body) {
    params.push(textToJsonb(body.assessment));
    sets.push(`assessment = $${params.length}::jsonb`);
  }
  if ('plan' in body) {
    params.push(textToJsonb(body.plan));
    sets.push(`plan = $${params.length}::jsonb`);
  }
  if (body.duration_minutes != null) {
    params.push(Number(body.duration_minutes));
    sets.push(`duration_minutes = $${params.length}`);
  }
  if (body.status) {
    params.push(String(body.status));
    sets.push(`status = $${params.length}`);
  }
  if (body.pain_level != null || body.pain_location != null || body.pain_character != null) {
    params.push(
      JSON.stringify({
        pain_level: body.pain_level ?? null,
        pain_location: body.pain_location ?? null,
        pain_character: body.pain_character ?? null,
      }),
    );
    sets.push(`required_tests = $${params.length}::jsonb`);
  }

  params.push(id, user.organizationId);

  const result = await pool.query(
    `UPDATE sessions SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Sessão não encontrada' }, 404);
  return c.json({ data: rowToRecord(result.rows[0]) });
});

// ===== EXCLUIR (apenas drafts) =====
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT status FROM sessions WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [id, user.organizationId],
  );

  if (!check.rows.length) return c.json({ error: 'Sessão não encontrada' }, 404);
  if (check.rows[0].status === 'finalized') {
    return c.json({ error: 'Não é possível excluir uma evolução finalizada' }, 409);
  }

  await pool.query('DELETE FROM sessions WHERE id = $1 AND organization_id = $2', [
    id,
    user.organizationId,
  ]);

  return c.json({ ok: true });
});

// ===== SESSION ATTACHMENTS =====

app.get('/:id/attachments', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `SELECT * FROM session_attachments
     WHERE session_id = $1 AND patient_id IN (
       SELECT patient_id FROM sessions WHERE id = $1 AND organization_id = $2
     )
     ORDER BY uploaded_at DESC`,
    [id, user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.post('/:id/attachments', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const session = await pool.query(
    'SELECT patient_id FROM sessions WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!session.rows.length) return c.json({ error: 'Sessão não encontrada' }, 404);

  const fileTypeMap: Record<string, string> = {
    'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image', 'image/webp': 'image',
    'application/pdf': 'pdf', 'video/mp4': 'video', 'video/webm': 'video',
  };
  const mime = String(body.mime_type ?? '');
  const fileType = fileTypeMap[mime] ?? 'other';

  const result = await pool.query(
    `INSERT INTO session_attachments
       (session_id, patient_id, file_name, original_name, file_url, thumbnail_url,
        file_type, mime_type, category, size_bytes, description, uploaded_by, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::session_attachment_type, $8, $9::session_attachment_category, $10, $11, $12, NOW())
     RETURNING *`,
    [
      id,
      session.rows[0].patient_id,
      String(body.file_name ?? ''),
      body.original_name ?? body.file_name ?? null,
      String(body.file_url ?? ''),
      body.thumbnail_url ?? null,
      fileType,
      mime || null,
      body.category ?? 'outros',
      body.size_bytes != null ? Number(body.size_bytes) : null,
      body.description ?? null,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.delete('/:id/attachments/:attachmentId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id, attachmentId } = c.req.param();

  const check = await pool.query(
    `SELECT a.file_url FROM session_attachments a
     JOIN sessions s ON s.id = a.session_id
     WHERE a.id = $1 AND a.session_id = $2 AND organization_id = $3`,
    [attachmentId, id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Anexo não encontrado' }, 404);

  await pool.query('DELETE FROM session_attachments WHERE id = $1', [attachmentId]);
  return c.json({ ok: true, file_url: check.rows[0].file_url });
});

// ===== SESSION TEMPLATES =====

app.get('/templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const result = await pool.query(
    `SELECT * FROM session_templates
     WHERE organization_id = $1 OR is_global = true
     ORDER BY created_at DESC`,
    [user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.post('/templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const toJsonb = (v: unknown) => (v != null ? JSON.stringify({ text: String(v) }) : null);

  const result = await pool.query(
    `INSERT INTO session_templates
       (organization_id, therapist_id, name, description,
        subjective, objective, assessment, plan, is_global, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, NOW(), NOW())
     RETURNING *`,
    [
      user.organizationId,
      user.uid,
      String(body.name ?? '').trim() || 'Template sem nome',
      body.description ?? null,
      toJsonb(body.subjective),
      toJsonb(body.objective),
      toJsonb(body.assessment),
      toJsonb(body.plan),
      body.is_global ?? false,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/templates/:templateId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { templateId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const check = await pool.query(
    'SELECT id FROM session_templates WHERE id = $1 AND organization_id = $2',
    [templateId, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Template não encontrado' }, 404);

  const toJsonb = (v: unknown) => (v != null ? JSON.stringify({ text: String(v) }) : null);

  const result = await pool.query(
    `UPDATE session_templates SET
       name = COALESCE($3, name),
       description = COALESCE($4, description),
       subjective = COALESCE($5::jsonb, subjective),
       objective = COALESCE($6::jsonb, objective),
       assessment = COALESCE($7::jsonb, assessment),
       plan = COALESCE($8::jsonb, plan),
       is_global = COALESCE($9, is_global),
       updated_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [
      templateId,
      user.organizationId,
      body.name != null ? String(body.name).trim() || null : null,
      body.description ?? null,
      body.subjective != null ? toJsonb(body.subjective) : null,
      body.objective != null ? toJsonb(body.objective) : null,
      body.assessment != null ? toJsonb(body.assessment) : null,
      body.plan != null ? toJsonb(body.plan) : null,
      body.is_global ?? null,
    ],
  );
  return c.json({ data: result.rows[0] });
});

app.delete('/templates/:templateId', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { templateId } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM session_templates WHERE id = $1 AND organization_id = $2',
    [templateId, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Template não encontrado' }, 404);

  await pool.query('DELETE FROM session_templates WHERE id = $1', [templateId]);
  return c.json({ ok: true });
});

export { app as sessionsRoutes };
