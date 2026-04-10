import { Hono } from 'hono';
import { createDb } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { sessions, sessionAttachments, sessionTemplates } from '@fisioflow/db';
import { eq, and, desc, count, sql, or, ilike, isNull } from 'drizzle-orm';
import { withTenant } from '../lib/db-utils';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== HELPERS =====

/** Verifica se uma string é um UUID válido */
function isValidUuid(val: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/** Serializa um texto para JSONB no formato { text: "..." } */
function textToJsonb(val: unknown): { text: string } | null {
  if (val == null || val === '') return null;
  return { text: String(val) };
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

/** Mapeia linha do Drizzle (camelCase) para o formato SoapRecord do frontend (snake_case) */
function rowToRecord(row: any) {
  const subj = (row.subjective as any) || {};

  return {
    id: row.id,
    patient_id: row.patientId,
    appointment_id: row.appointmentId ?? undefined,
    session_number: row.sessionNumber != null ? Number(row.sessionNumber) : undefined,
    subjective: jsonbToText(row.subjective),
    objective: jsonbToText(row.objective),
    assessment: jsonbToText(row.assessment),
    plan: jsonbToText(row.plan),
    status: (row.status as string) ?? 'draft',
    pain_level: subj.painScale ?? undefined,
    pain_location: subj.painLocation ?? undefined,
    pain_character: subj.painCharacter ?? undefined,
    duration_minutes: row.duration ?? undefined,
    last_auto_save_at: row.lastAutoSaveAt ? new Date(row.lastAutoSaveAt).toISOString() : undefined,
    finalized_at: row.finalizedAt ? new Date(row.finalizedAt).toISOString() : undefined,
    finalized_by: row.finalizedBy ? String(row.finalizedBy) : undefined,
    record_date: row.date
      ? new Date(row.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    created_by: row.therapistId ? String(row.therapistId) : undefined,
    created_at: new Date(row.createdAt).toISOString(),
    updated_at: new Date(row.updatedAt).toISOString(),
    signed_at: row.finalizedAt ? new Date(row.finalizedAt).toISOString() : undefined,
  };
}

// ===== LISTA =====
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { patientId, status, appointmentId, limit = '20', offset = '0' } = c.req.query();

  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);
  if (!isValidUuid(patientId)) return c.json({ error: 'patientId inválido' }, 400);
  if (appointmentId && !isValidUuid(appointmentId)) return c.json({ error: 'appointmentId inválido' }, 400);

  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
  const offsetNum = Math.max(0, parseInt(offset) || 0);

  try {
    const conditions: any[] = [
      withTenant(sessions, user.organizationId, eq(sessions.patientId, patientId))
    ];

    if (status) {
      conditions.push(eq(sessions.status, status as any));
    }
    if (appointmentId) {
      conditions.push(eq(sessions.appointmentId, appointmentId));
    }

    const whereClause = and(...conditions);

    const [dataRes, countRes] = await Promise.all([
      db.select()
        .from(sessions)
        .where(whereClause)
        .orderBy(desc(sessions.date))
        .limit(limitNum)
        .offset(offsetNum),
      db.select({ total: count() })
        .from(sessions)
        .where(whereClause)
    ]);

    return c.json({
      data: dataRes.map(rowToRecord),
      total: countRes[0]?.total ?? 0,
    });
  } catch (error: any) {
    return c.json({ error: 'Erro ao listar sessões', details: error.message }, 500);
  }
});

// ===== AUTOSAVE =====
app.post('/autosave', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as Record<string, any>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);

  const subjData = body.subjective != null ? textToJsonb(body.subjective) : undefined;
  if (subjData && (body.pain_level != null || body.pain_location || body.pain_character)) {
    (subjData as any).painScale = body.pain_level ?? null;
    (subjData as any).painLocation = body.pain_location ?? null;
    (subjData as any).painCharacter = body.pain_character ?? null;
  }

  const objData = body.objective != null ? textToJsonb(body.objective) : undefined;
  const assData = body.assessment != null ? textToJsonb(body.assessment) : undefined;
  const planData = body.plan != null ? textToJsonb(body.plan) : undefined;
  const durationNum = body.duration_minutes != null ? Number(body.duration_minutes) : undefined;

  const buildUpdatePayload = () => {
    const payload: any = {
      lastAutoSaveAt: new Date(),
      updatedAt: new Date(),
    };
    if (subjData !== undefined) payload.subjective = subjData;
    if (objData !== undefined) payload.objective = objData;
    if (assData !== undefined) payload.assessment = assData;
    if (planData !== undefined) payload.plan = planData;
    if (durationNum !== undefined) payload.duration = durationNum;
    return payload;
  };

  const idToUpdate = body.recordId || body.id;
  if (idToUpdate) {
    const res = await db.update(sessions)
      .set(buildUpdatePayload())
      .where(
        withTenant(sessions, user.organizationId, eq(sessions.id, idToUpdate))
      )
      .returning();
    
    if (res.length) {
      return c.json({ data: { ...rowToRecord(res[0]), isNew: false } });
    }
  }

  if (body.appointment_id) {
    const existing = await db.select({ id: sessions.id })
      .from(sessions)
      .where(withTenant(
        sessions,
        user.organizationId,
        eq(sessions.appointmentId, body.appointment_id),
        eq(sessions.status, 'draft')
      ))
      .limit(1);

    if (existing.length) {
      const res = await db.update(sessions)
        .set(buildUpdatePayload())
        .where(eq(sessions.id, existing[0].id))
        .returning();
      
      if (res.length) {
        return c.json({ data: { ...rowToRecord(res[0]), isNew: false } });
      }
    }
  }

  const recordDate = body.record_date ? new Date(String(body.record_date)) : new Date();

  const insertValues: any = {
    patientId,
    appointmentId: body.appointment_id || null,
    therapistId: isValidUuid(user.uid) ? user.uid : (null as any),
    organizationId: user.organizationId,
    date: recordDate,
    duration: durationNum || null,
    subjective: subjData || null,
    objective: objData || null,
    assessment: assData || null,
    plan: planData || null,
    status: 'draft',
    lastAutoSaveAt: new Date(),
  };

  const [newSession] = await db.insert(sessions)
    .values(insertValues)
    .returning();

  return c.json({ data: { ...rowToRecord(newSession), isNew: true } }, 201);
});

// ===== DETALHE =====
app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  if (!isValidUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const [row] = await db.select()
    .from(sessions)
    .where(
      withTenant(sessions, user.organizationId, eq(sessions.id, id))
    )
    .limit(1);

  if (!row) return c.json({ error: 'Sessão não encontrada' }, 404);
  return c.json({ data: rowToRecord(row) });
});

// ===== FINALIZAR =====
app.post('/:id/finalize', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  if (!isValidUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const [row] = await db.update(sessions)
    .set({
      status: 'finalized',
      finalizedAt: new Date(),
      finalizedBy: user.uid as any,
      updatedAt: new Date()
    })
    .where(withTenant(
      sessions,
      user.organizationId,
      eq(sessions.id, id),
      sql`${sessions.status} != 'finalized'`
    ))
    .returning();

  if (!row) return c.json({ error: 'Sessão não encontrada ou já finalizada' }, 404);
  return c.json({ data: rowToRecord(row) });
});

// ===== CRIAR =====
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as Record<string, any>;

  const patientId = String(body.patient_id ?? '').trim();
  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);
  if (!isValidUuid(patientId)) return c.json({ error: 'patient_id inválido' }, 400);

  const recordDate = body.record_date ? new Date(String(body.record_date)) : new Date();

  const insertValues: any = {
    patientId,
    appointmentId: body.appointment_id || null,
    therapistId: isValidUuid(user.uid) ? user.uid : (null as any),
    organizationId: user.organizationId,
    date: recordDate,
    duration: body.duration_minutes != null ? Number(body.duration_minutes) : null,
    subjective: textToJsonb(body.subjective),
    objective: textToJsonb(body.objective),
    assessment: textToJsonb(body.assessment),
    plan: textToJsonb(body.plan),
    status: (body.status as any) ?? 'draft',
  };

  const [newSession] = await db.insert(sessions)
    .values(insertValues)
    .returning();

  // Indexar no D1 para timeline edge (fire-and-forget)
  if (c.env.DB) {
    const preview = [body.subjective, body.assessment].filter(Boolean).join(' ').substring(0, 200);
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `INSERT OR REPLACE INTO evolution_index (id, patient_id, appointment_id, therapist_id, organization_id, preview_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(newSession.id, patientId, body.appointment_id ?? null, user.uid, user.organizationId, preview).run()
    );
  }

  return c.json({ data: rowToRecord(newSession) }, 201);
});

// ===== ATUALIZAR =====
app.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  if (!isValidUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const body = (await c.req.json()) as Record<string, any>;

  const updatePayload: any = {
    updatedAt: new Date()
  };

  if ('subjective' in body) updatePayload.subjective = textToJsonb(body.subjective);
  if ('objective' in body) updatePayload.objective = textToJsonb(body.objective);
  if ('assessment' in body) updatePayload.assessment = textToJsonb(body.assessment);
  if ('plan' in body) updatePayload.plan = textToJsonb(body.plan);
  if (body.duration_minutes != null) updatePayload.duration = Number(body.duration_minutes);
  if (body.status) updatePayload.status = body.status as any;

  const [updated] = await db.update(sessions)
    .set(updatePayload)
    .where(
      withTenant(sessions, user.organizationId, eq(sessions.id, id))
    )
    .returning();

  if (!updated) return c.json({ error: 'Sessão não encontrada' }, 404);

  // Atualizar índice no D1 (fire-and-forget) — usa INSERT OR REPLACE para garantir que
  // o registro existe mesmo que a sessão tenha sido criada antes da feature de indexação
  if (c.env.DB && (body.subjective || body.assessment)) {
    const preview = [body.subjective, body.assessment].filter(Boolean).join(' ').substring(0, 200);
    const patientIdForIndex = updated.patientId;
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `INSERT OR REPLACE INTO evolution_index (id, patient_id, appointment_id, therapist_id, organization_id, preview_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(id, patientIdForIndex, updated.appointmentId ?? null, user.uid, user.organizationId, preview).run()
    );
  }

  return c.json({ data: rowToRecord(updated) });
});

// ===== EXCLUIR =====
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  if (!isValidUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const [existing] = await db.select({ status: sessions.status })
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.organizationId, user.organizationId)))
    .limit(1);

  if (!existing) return c.json({ error: 'Sessão não encontrada' }, 404);
  if (existing.status === 'finalized') {
    return c.json({ error: 'Não é possível excluir uma evolução finalizada' }, 409);
  }

  await db.update(sessions).set({ deletedAt: new Date() })
    .where(
      withTenant(sessions, user.organizationId, eq(sessions.id, id))
    );

  return c.json({ success: true });
});

// ===== TEMPLATES =====
app.get('/templates', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { search } = c.req.query();

  const conditions = [
    or(
      eq(sessionTemplates.organizationId, user.organizationId),
      eq(sessionTemplates.isGlobal, true)
    )
  ];

  if (search) {
    conditions.push(
      or(
        ilike(sessionTemplates.name, `%${search}%`),
        ilike(sessionTemplates.description, `%${search}%`)
      )
    );
  }

  const results = await db.select()
    .from(sessionTemplates)
    .where(and(...conditions))
    .orderBy(desc(sessionTemplates.createdAt));

  return c.json({
    data: results.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      subjective: jsonbToText(t.subjective),
      objective: jsonbToText(t.objective),
      assessment: jsonbToText(t.assessment),
      plan: jsonbToText(t.plan),
      is_global: t.isGlobal,
      created_at: t.createdAt,
      updated_at: t.updatedAt
    }))
  });
});

app.post('/templates', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const body = (await c.req.json()) as any;

  if (!body.name) return c.json({ error: 'Nome é obrigatório' }, 400);

  const insertValues: any = {
    organizationId: user.organizationId,
    therapistId: user.uid as any,
    name: body.name,
    description: body.description || null,
    subjective: textToJsonb(body.subjective),
    objective: textToJsonb(body.objective),
    assessment: textToJsonb(body.assessment),
    plan: textToJsonb(body.plan),
    isGlobal: body.is_global ?? false,
  };

  const [newTemplate] = await db.insert(sessionTemplates)
    .values(insertValues)
    .returning();

  return c.json({ data: newTemplate }, 201);
});

app.put('/templates/:templateId', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { templateId } = c.req.param();
  const body = (await c.req.json()) as any;

  const updatePayload: any = {
    updatedAt: new Date()
  };

  if (body.name !== undefined) updatePayload.name = body.name;
  if (body.description !== undefined) updatePayload.description = body.description;
  if (body.subjective !== undefined) updatePayload.subjective = textToJsonb(body.subjective);
  if (body.objective !== undefined) updatePayload.objective = textToJsonb(body.objective);
  if (body.assessment !== undefined) updatePayload.assessment = textToJsonb(body.assessment);
  if (body.plan !== undefined) updatePayload.plan = textToJsonb(body.plan);
  if (body.is_global !== undefined) updatePayload.isGlobal = body.is_global;

  const [updated] = await db.update(sessionTemplates)
    .set(updatePayload)
    .where(and(eq(sessionTemplates.id, templateId), eq(sessionTemplates.organizationId, user.organizationId)))
    .returning();

  if (!updated) return c.json({ error: 'Template não encontrado' }, 404);
  return c.json({ data: updated });
});

app.delete('/templates/:templateId', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const { templateId } = c.req.param();

  const [deleted] = await db.update(sessionTemplates).set({ deletedAt: new Date() })
    .where(and(eq(sessionTemplates.id, templateId), eq(sessionTemplates.organizationId, user.organizationId)))
    .returning();

  if (!deleted) return c.json({ error: 'Template não encontrado' }, 404);
  return c.json({ success: true });
});

// ===== ANEXOS =====
app.get('/:id/attachments', requireAuth, async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!isValidUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  const results = await db.select()
    .from(sessionAttachments)
    .where(eq(sessionAttachments.sessionId, id))
    .orderBy(desc(sessionAttachments.uploadedAt));

  return c.json({
    data: results.map(a => ({
      id: a.id,
      file_name: a.fileName,
      original_name: a.originalName,
      file_url: a.fileUrl,
      thumbnail_url: a.thumbnailUrl,
      file_type: a.fileType,
      mime_type: a.mimeType,
      category: a.category,
      size_bytes: a.sizeBytes,
      description: a.description,
      uploaded_at: a.uploadedAt
    }))
  });
});

app.post('/:id/attachments', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!isValidUuid(id)) return c.json({ error: 'ID inválido' }, 400);
  const body = (await c.req.json()) as any;

  if (!body.file_url) return c.json({ error: 'file_url é obrigatório' }, 400);

  const [session] = await db.select({ patientId: sessions.patientId })
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.organizationId, user.organizationId)))
    .limit(1);

  if (!session) return c.json({ error: 'Sessão não encontrada' }, 404);

  const fileTypeMap: Record<string, string> = {
    'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image', 'image/webp': 'image',
    'application/pdf': 'pdf', 'video/mp4': 'video', 'video/webm': 'video',
  };
  const mime = String(body.mime_type ?? '');
  const fileType = (fileTypeMap[mime] ?? 'other') as any;

  const insertValues: any = {
    sessionId: id,
    patientId: session.patientId,
    fileName: body.file_name || 'unnamed',
    originalName: body.original_name || body.file_name || null,
    fileUrl: body.file_url,
    thumbnailUrl: body.thumbnail_url || null,
    fileType: fileType,
    mimeType: mime || null,
    category: body.category || 'other',
    sizeBytes: body.size_bytes != null ? Number(body.size_bytes) : null,
    description: body.description || null,
    uploadedBy: user.uid as any
  };

  const [newAttachment] = await db.insert(sessionAttachments)
    .values(insertValues)
    .returning();

  return c.json({ data: newAttachment }, 201);
});

app.delete('/:id/attachments/:attachmentId', requireAuth, async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const attachmentId = c.req.param('attachmentId');

  const [deleted] = await db.delete(sessionAttachments)
    .where(and(eq(sessionAttachments.id, attachmentId), eq(sessionAttachments.sessionId, id)))
    .returning();

  if (!deleted) return c.json({ error: 'Anexo não encontrado' }, 404);
  return c.json({ success: true, file_url: deleted.fileUrl });
});

export { app as sessionsRoutes };
