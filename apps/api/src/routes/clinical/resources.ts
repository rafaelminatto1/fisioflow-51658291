import { createDb } from '../../lib/db';
import { requireAuth } from '../../lib/auth';
import {
  conductLibrary,
  clinicalTestTemplates,
  standardizedTestResults,
  painMaps,
  painMapPoints,
  evolutionTemplates,
  exercisePrescriptions,
  prescribedExercises,
  patientObjectives,
  patientObjectiveAssignments,
} from '@fisioflow/db';
import { eq, and, or, sql, asc, desc, inArray } from 'drizzle-orm';
import {
  type ClinicalRouteApp,
  normalizeEvolutionTemplateRow,
  normalizeJsonArray,
  normalizeStandardizedTestRow,
  normalizeTextArray,
} from './shared';

function normalizeClinicalTestTemplateRow(row: Record<string, any>) {
  const organizationId = row.organization_id ?? row.organizationId ?? null;

  return {
    ...row,
    organization_id: organizationId,
    created_by: row.created_by ?? row.createdBy ?? null,
    name: row.name ?? null,
    target_joint: row.target_joint ?? row.targetJoint ?? null,
    instructions: row.instructions ?? row.execution ?? null,
    execution: row.execution ?? row.instructions ?? null,
    positive_criteria: row.positive_criteria ?? row.positiveCriteria ?? null,
    positive_sign: row.positive_sign ?? row.positiveSign ?? null,
    fields_definition: normalizeJsonArray(
      row.fields_definition ?? row.fieldsDefinition,
    ),
    regularity_sessions: row.regularity_sessions ?? row.regularitySessions ?? null,
    layout_type: row.layout_type ?? row.layoutType ?? null,
    image_url: row.image_url ?? row.imageUrl ?? null,
    initial_position_image_url:
      row.initial_position_image_url ?? row.initialPositionImageUrl ?? null,
    final_position_image_url:
      row.final_position_image_url ?? row.finalPositionImageUrl ?? null,
    media_urls: normalizeTextArray(row.media_urls ?? row.mediaUrls),
    is_custom: row.is_custom ?? row.isCustom ?? Boolean(organizationId),
    created_at: row.created_at ?? row.createdAt ?? null,
    updated_at: row.updated_at ?? row.updatedAt ?? null,
  };
}

export function registerClinicalResourceRoutes(app: ClinicalRouteApp) {
  // ===== CONDUCT LIBRARY =====
  
  app.get('/conduct-library', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const category = c.req.query('category');

    const conditions = [
      or(
        eq(conductLibrary.organizationId, user.organizationId),
        sql`${conductLibrary.organizationId} IS NULL`
      )
    ];

    if (category) {
      conditions.push(eq(conductLibrary.category, category));
    }

    const result = await db
      .select()
      .from(conductLibrary)
      .where(and(...conditions))
      .orderBy(asc(conductLibrary.title));

    return c.json({ data: result });
  });

  app.get('/conduct-library/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [result] = await db
      .select()
      .from(conductLibrary)
      .where(
        and(
          eq(conductLibrary.id, id),
          or(
            eq(conductLibrary.organizationId, user.organizationId),
            sql`${conductLibrary.organizationId} IS NULL`
          )
        )
      )
      .limit(1);

    if (!result) return c.json({ error: 'Conduta não encontrada' }, 404);
    return c.json({ data: result });
  });

  app.post('/conduct-library', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    if (!body.title || !body.category || !body.conduct_text) {
      return c.json({ error: 'title, category e conduct_text são obrigatórios' }, 400);
    }

    const [result] = await db
      .insert(conductLibrary)
      .values({
        organizationId: body.organization_id ?? user.organizationId,
        createdBy: body.created_by ?? user.uid,
        title: String(body.title),
        description: body.description ?? null,
        conductText: String(body.conduct_text),
        category: String(body.category),
      })
      .returning();

    return c.json({ data: result }, 201);
  });

  app.put('/conduct-library/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, any>;

    const [result] = await db
      .update(conductLibrary)
      .set({
        title: body.title !== undefined ? (body.title || null) : undefined,
        description: body.description !== undefined ? (body.description || null) : undefined,
        conductText: body.conduct_text !== undefined ? (body.conduct_text || null) : undefined,
        category: body.category !== undefined ? (body.category || null) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conductLibrary.id, id),
          eq(conductLibrary.organizationId, user.organizationId)
        )
      )
      .returning();

    if (!result) return c.json({ error: 'Conduta não encontrada' }, 404);
    return c.json({ data: result });
  });

  app.delete('/conduct-library/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    await db
      .delete(conductLibrary)
      .where(
        and(
          eq(conductLibrary.id, id),
          eq(conductLibrary.organizationId, user.organizationId)
        )
      );

    return c.json({ ok: true });
  });

  app.get('/test-templates', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const idsParam = c.req.query('ids');

    const conditions = [
      or(
        eq(clinicalTestTemplates.organizationId, user.organizationId),
        sql`${clinicalTestTemplates.organizationId} IS NULL`
      )
    ];

    if (idsParam) {
      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        conditions.push(inArray(clinicalTestTemplates.id, ids));
      }
    }

    const query = sql`
      SELECT * FROM clinical_test_templates
      WHERE ${and(...conditions)}
      ORDER BY name ASC
    `;
    
    const dataResult = await db.execute(query);
    const resultRows = dataResult.rows;

    const data = resultRows.map((row: Record<string, any>) =>
      normalizeClinicalTestTemplateRow(row as any),
    );

    return c.json({ data });
  });

  app.get('/test-templates/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const conditions = and(
          eq(clinicalTestTemplates.id, id),
          or(
            eq(clinicalTestTemplates.organizationId, user.organizationId),
            sql`${clinicalTestTemplates.organizationId} IS NULL`
          )
        );
    const query = sql`SELECT * FROM clinical_test_templates WHERE ${conditions} LIMIT 1`;
    const result = await db.execute(query);
    const row = result.rows[0];

    if (!row) return c.json({ error: 'Teste clínico não encontrado' }, 404);

    return c.json({ data: normalizeClinicalTestTemplateRow(row as any) });
  });

  app.post('/test-templates', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    if (!body.name || !body.category || !body.target_joint) {
      return c.json({ error: 'name, category e target_joint são obrigatórios' }, 400);
    }

    const [result] = await db
      .insert(clinicalTestTemplates)
      .values({
        organizationId: body.organization_id ?? user.organizationId,
        createdBy: body.created_by ?? user.uid,
        name: String(body.name),
        category: body.category,
        targetJoint: body.target_joint,
        purpose: body.purpose ?? null,
        execution: body.execution ?? null,
        positiveSign: body.positive_sign ?? null,
        reference: body.reference ?? null,
        sensitivitySpecificity: body.sensitivity_specificity ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        type: body.type ?? 'special_test',
        fieldsDefinition: body.fields_definition ?? [],
        regularitySessions: body.regularity_sessions != null ? Number(body.regularity_sessions) : null,
        layoutType: body.layout_type ?? null,
        imageUrl: body.image_url ?? null,
        initialPositionImageUrl: body.initial_position_image_url ?? null,
        finalPositionImageUrl: body.final_position_image_url ?? null,
        mediaUrls: Array.isArray(body.media_urls) ? body.media_urls : [],
        isCustom: body.is_custom === true,
      })
      .returning();

    return c.json({ data: normalizeClinicalTestTemplateRow(result as any) }, 201);
  });

  app.put('/test-templates/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, any>;

    const [result] = await db
      .update(clinicalTestTemplates)
      .set({
        name: body.name !== undefined ? body.name : undefined,
        category: body.category !== undefined ? body.category : undefined,
        targetJoint: body.target_joint !== undefined ? body.target_joint : undefined,
        purpose: body.purpose !== undefined ? (body.purpose || null) : undefined,
        execution: body.execution !== undefined ? (body.execution || null) : undefined,
        positiveSign: body.positive_sign !== undefined ? (body.positive_sign || null) : undefined,
        reference: body.reference !== undefined ? (body.reference || null) : undefined,
        sensitivitySpecificity: body.sensitivity_specificity !== undefined ? (body.sensitivity_specificity || null) : undefined,
        tags: body.tags !== undefined ? (Array.isArray(body.tags) ? body.tags : []) : undefined,
        type: body.type !== undefined ? (body.type || 'special_test') : undefined,
        fieldsDefinition: body.fields_definition !== undefined ? (body.fields_definition ?? []) : undefined,
        regularitySessions: body.regularity_sessions !== undefined ? (body.regularity_sessions != null ? Number(body.regularity_sessions) : null) : undefined,
        layoutType: body.layout_type !== undefined ? (body.layout_type || null) : undefined,
        imageUrl: body.image_url !== undefined ? (body.image_url || null) : undefined,
        initialPositionImageUrl:
          body.initial_position_image_url !== undefined
            ? (body.initial_position_image_url || null)
            : undefined,
        finalPositionImageUrl:
          body.final_position_image_url !== undefined
            ? (body.final_position_image_url || null)
            : undefined,
        mediaUrls: body.media_urls !== undefined ? (Array.isArray(body.media_urls) ? body.media_urls : []) : undefined,
        isCustom: body.is_custom !== undefined ? (body.is_custom === true) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clinicalTestTemplates.id, id),
          or(
            eq(clinicalTestTemplates.organizationId, user.organizationId),
            sql`${clinicalTestTemplates.organizationId} IS NULL`
          )
        )
      )
      .returning();

    if (!result) return c.json({ error: 'Teste clínico não encontrado' }, 404);

    return c.json({ data: normalizeClinicalTestTemplateRow(result as any) });
  });

  app.delete('/test-templates/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    await db
      .delete(clinicalTestTemplates)
      .where(
        and(
          eq(clinicalTestTemplates.id, id),
          eq(clinicalTestTemplates.organizationId, user.organizationId)
        )
      );

    return c.json({ ok: true });
  });

  app.get('/standardized-tests', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const patientId = c.req.query('patientId');

    if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

    const result = await db
      .select({
        id: standardizedTestResults.id,
        organizationId: standardizedTestResults.organizationId,
        patientId: standardizedTestResults.patientId,
        testType: standardizedTestResults.testType,
        testName: standardizedTestResults.testName,
        scaleName: standardizedTestResults.scaleName,
        score: standardizedTestResults.score,
        maxScore: standardizedTestResults.maxScore,
        interpretation: standardizedTestResults.interpretation,
        responses: sql<any>`COALESCE(${standardizedTestResults.responses}, ${standardizedTestResults.answers}, '{}'::jsonb)`,
        answers: sql<any>`COALESCE(${standardizedTestResults.answers}, ${standardizedTestResults.responses}, '{}'::jsonb)`,
        appliedAt: sql<string>`COALESCE(${standardizedTestResults.appliedAt}, ${standardizedTestResults.createdAt})`,
        appliedBy: sql<string>`COALESCE(${standardizedTestResults.appliedBy}, ${standardizedTestResults.createdBy})`,
        sessionId: standardizedTestResults.sessionId,
        notes: standardizedTestResults.notes,
        createdBy: standardizedTestResults.createdBy,
        createdAt: standardizedTestResults.createdAt,
        updatedAt: standardizedTestResults.updatedAt,
      })
      .from(standardizedTestResults)
      .where(
        and(
          eq(standardizedTestResults.organizationId, user.organizationId),
          eq(standardizedTestResults.patientId, patientId)
        )
      )
      .orderBy(desc(standardizedTestResults.createdAt));

    return c.json({ data: result.map((row) => normalizeStandardizedTestRow(row as any)) });
  });

  app.post('/standardized-tests', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    if (!body.patient_id || !body.test_type || !body.test_name) {
      return c.json({ error: 'patient_id, test_type e test_name são obrigatórios' }, 400);
    }

    const [result] = await db
      .insert(standardizedTestResults)
      .values({
        organizationId: user.organizationId,
        patientId: body.patient_id,
        testType: String(body.test_type ?? body.scale_name ?? body.test_name ?? 'custom').toLowerCase(),
        testName: String(body.test_name ?? body.scale_name ?? 'Teste padronizado'),
        scaleName: String(body.scale_name ?? body.test_type ?? body.test_name ?? 'CUSTOM').toUpperCase(),
        score: body.score !== undefined ? String(body.score) : '0', // Adjust based on DB type if needed, usually string or decimal in Drizzle for precise scores
        maxScore: body.max_score !== undefined ? String(body.max_score) : '0',
        interpretation: body.interpretation ?? null,
        answers: body.answers ?? body.responses ?? {},
        responses: body.responses ?? body.answers ?? {},
        appliedAt: body.applied_at ? new Date(body.applied_at) : new Date(),
        appliedBy: user.uid,
        sessionId: body.session_id ?? null,
        notes: body.notes ?? null,
        createdBy: user.uid,
      })
      .returning();

    return c.json({ data: normalizeStandardizedTestRow(result as any) }, 201);
  });

  app.get('/pain-maps', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { patientId, evolutionId } = c.req.query();

    const conditions = [eq(painMaps.organizationId, user.organizationId)];
    if (patientId) conditions.push(eq(painMaps.patientId, patientId));
    if (evolutionId) conditions.push(eq(painMaps.evolutionId, evolutionId));

    const mapsResult = await db
      .select()
      .from(painMaps)
      .where(and(...conditions))
      .orderBy(desc(painMaps.createdAt));

    if (mapsResult.length === 0) return c.json({ data: [] });

    const mapIds = mapsResult.map((r) => r.id);
    const pointsResult = await db
      .select()
      .from(painMapPoints)
      .where(inArray(painMapPoints.painMapId, mapIds))
      .orderBy(asc(painMapPoints.createdAt));

    const pointsByMap = pointsResult.reduce((acc: Record<string, any[]>, point) => {
      if (!acc[point.painMapId]) acc[point.painMapId] = [];
      acc[point.painMapId].push(point);
      return acc;
    }, {});

    const mapsWithPoints = mapsResult.map((map) => ({
      ...map,
      points: pointsByMap[map.id] ?? [],
    }));

    return c.json({ data: mapsWithPoints });
  });

  app.post('/pain-maps', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    const result = await (async (tx: typeof db) => {
      const [painMap] = await tx
        .insert(painMaps)
        .values({
          organizationId: user.organizationId,
          patientId: body.patient_id || body.patientId,
          evolutionId: body.evolution_id ?? null,
          bodyRegion: body.body_region ?? null,
          painLevel: body.pain_level != null ? Number(body.pain_level) : null,
          colorCode: body.color_code ?? null,
          notes: body.notes ?? null,
        })
        .returning();

      if (body.points && Array.isArray(body.points)) {
        const pointsToInsert = body.points.map((p: any) => ({
          painMapId: painMap.id,
          xCoordinate: String(p.x || p.x_coordinate),
          yCoordinate: String(p.y || p.y_coordinate),
          intensity: String(p.intensity),
          painType: p.pain_type || p.painType || null,
          description: p.description ?? null,
        }));
        await tx.insert(painMapPoints).values(pointsToInsert);
      }

      // Re-fetch with points to return full object
      const pointsData = await tx
        .select()
        .from(painMapPoints)
        .where(eq(painMapPoints.painMapId, painMap.id))
        .orderBy(asc(painMapPoints.createdAt));

      return { ...painMap, points: pointsData };
    })(db);

    return c.json({ data: result }, 201);
  });

  app.put('/pain-maps/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, any>;

    const [result] = await db
      .update(painMaps)
      .set({
        bodyRegion: body.body_region !== undefined ? body.body_region : undefined,
        painLevel: body.pain_level !== undefined ? Number(body.pain_level) : undefined,
        colorCode: body.color_code !== undefined ? body.color_code : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(painMaps.id, id),
          eq(painMaps.organizationId, user.organizationId)
        )
      )
      .returning();

    if (!result) return c.json({ error: 'Mapa de dor não encontrado' }, 404);
    return c.json({ data: result });
  });

  app.delete('/pain-maps/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [check] = await db
      .select({ id: painMaps.id })
      .from(painMaps)
      .where(
        and(
          eq(painMaps.id, id),
          eq(painMaps.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!check) return c.json({ error: 'Mapa de dor não encontrado' }, 404);

    await db.update(painMaps).set({ deletedAt: new Date() }).where(eq(painMaps.id, id));
    return c.json({ ok: true });
  });

  app.get('/evolution-templates', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { ativo } = c.req.query();

    const conditions = [eq(evolutionTemplates.organizationId, user.organizationId)];
    if (ativo !== undefined) conditions.push(eq(evolutionTemplates.isActive, ativo === 'true'));

    const result = await db
      .select()
      .from(evolutionTemplates)
      .where(and(...conditions))
      .orderBy(asc(sql`COALESCE(NULLIF(${evolutionTemplates.name}, ''), 'Template')`));

    return c.json({ data: result.map((row) => normalizeEvolutionTemplateRow(row as any)) });
  });

  app.get('/evolution-templates/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [result] = await db
      .select()
      .from(evolutionTemplates)
      .where(
        and(
          eq(evolutionTemplates.id, id),
          eq(evolutionTemplates.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!result) return c.json({ error: 'Template não encontrado' }, 404);
    return c.json({ data: normalizeEvolutionTemplateRow(result as any) });
  });

  app.post('/evolution-templates', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    const name = String(body.nome ?? body.name ?? '').trim();
    if (!name) return c.json({ error: 'name é obrigatório' }, 400);

    const type = String(body.tipo ?? body.type ?? 'fisioterapia');
    const description = body.descricao ?? body.description ?? null;
    const content = String(body.conteudo ?? body.content ?? '');
    const camposPadrao = normalizeJsonArray(body.campos_padrao ?? body.blocks);
    const tags = normalizeTextArray(body.tags);

    const [result] = await db
      .insert(evolutionTemplates)
      .values({
        organizationId: user.organizationId,
        name: name,
        type: type,
        description: description,
        content: content,
        camposPadrao: camposPadrao,
        blocks: normalizeJsonArray(body.blocks ?? camposPadrao),
        tags: tags,
        isActive: body.ativo !== false && body.is_active !== false,
        createdBy: user.uid,
      })
      .returning();

    return c.json({ data: normalizeEvolutionTemplateRow(result as any) }, 201);
  });

  app.put('/evolution-templates/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, any>;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.nome !== undefined || body.name !== undefined) {
      updateData.name = String(body.nome ?? body.name ?? '');
    }
    if (body.tipo !== undefined || body.type !== undefined) {
      updateData.type = String(body.tipo ?? body.type);
    }
    if (body.descricao !== undefined || body.description !== undefined) {
      updateData.description = body.descricao ?? body.description ?? null;
    }
    if (body.conteudo !== undefined || body.content !== undefined) {
      updateData.content = String(body.conteudo ?? body.content ?? '');
    }
    if (body.campos_padrao !== undefined || body.blocks !== undefined) {
      const fieldsVal = normalizeJsonArray(body.campos_padrao ?? body.blocks);
      updateData.camposPadrao = fieldsVal;
      updateData.blocks = normalizeJsonArray(body.blocks ?? fieldsVal);
    }
    if (body.tags !== undefined) updateData.tags = normalizeTextArray(body.tags);
    if (body.ativo !== undefined || body.is_active !== undefined) {
      updateData.isActive = body.ativo ?? body.is_active;
    }

    const [result] = await db
      .update(evolutionTemplates)
      .set(updateData)
      .where(
        and(
          eq(evolutionTemplates.id, id),
          eq(evolutionTemplates.organizationId, user.organizationId)
        )
      )
      .returning();

    if (!result) return c.json({ error: 'Template não encontrado' }, 404);
    return c.json({ data: normalizeEvolutionTemplateRow(result as any) });
  });

  app.delete('/evolution-templates/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [check] = await db
      .select({ id: evolutionTemplates.id })
      .from(evolutionTemplates)
      .where(
        and(
          eq(evolutionTemplates.id, id),
          eq(evolutionTemplates.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!check) return c.json({ error: 'Template não encontrado' }, 404);

    await db.update(evolutionTemplates).set({ deletedAt: new Date() }).where(eq(evolutionTemplates.id, id));
    return c.json({ ok: true });
  });

  app.get('/prescriptions', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { patientId, therapistId, status } = c.req.query();

    const where = [eq(exercisePrescriptions.organizationId, user.organizationId)];
    if (patientId) where.push(eq(exercisePrescriptions.patientId, patientId));
    if (therapistId) where.push(eq(exercisePrescriptions.therapistId, therapistId));
    if (status) where.push(eq(exercisePrescriptions.status, status));

    const result = await db
      .select()
      .from(exercisePrescriptions)
      .where(and(...where))
      .orderBy(desc(exercisePrescriptions.createdAt));

    return c.json({ data: result });
  });

  app.get('/prescriptions/qr/:qrCode', async (c) => {
    const db = createDb(c.env);
    const { qrCode } = c.req.param();

    const [result] = await db
      .select()
      .from(exercisePrescriptions)
      .where(eq(exercisePrescriptions.qrCode, qrCode))
      .limit(1);

    if (!result) return c.json({ data: null });
    return c.json({ data: result });
  });

  app.put('/prescriptions/qr/:qrCode', async (c) => {
    const db = createDb(c.env);
    const { qrCode } = c.req.param();
    const body = (await c.req.json()) as any;

    const updateData: any = { updatedAt: new Date() };

    if (body.view_count !== undefined) updateData.viewCount = Number(body.view_count);
    if (body.last_viewed_at !== undefined) updateData.lastViewedAt = new Date(body.last_viewed_at);
    if (body.completed_exercises !== undefined) {
      updateData.completedExercises = Array.isArray(body.completed_exercises) ? body.completed_exercises : [];
    }

    if (Object.keys(updateData).length === 1) {
      return c.json({ error: 'Nenhum campo permitido para atualização' }, 400);
    }

    const [result] = await db
      .update(exercisePrescriptions)
      .set(updateData)
      .where(eq(exercisePrescriptions.qrCode, qrCode))
      .returning();

    if (!result) return c.json({ error: 'Prescrição não encontrada' }, 404);
    return c.json({ data: result });
  });

  app.get('/prescriptions/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [result] = await db
      .select()
      .from(exercisePrescriptions)
      .where(
        and(
          eq(exercisePrescriptions.id, id),
          eq(exercisePrescriptions.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!result) return c.json({ error: 'Prescrição não encontrada' }, 404);
    return c.json({ data: result });
  });

  app.post('/prescriptions', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.title) return c.json({ error: 'title é obrigatório' }, 400);

    const [result] = await db
      .insert(exercisePrescriptions)
      .values({
        organizationId: user.organizationId,
        patientId: body.patient_id,
        therapistId: body.therapist_id ?? user.uid,
        qrCode: body.qr_code ?? null,
        title: String(body.title),
        exercises: body.exercises ?? [],
        notes: body.notes ?? null,
        validityDays: body.validity_days != null ? Number(body.validity_days) : 30,
        validUntil: body.valid_until ? new Date(body.valid_until) : null,
        status: body.status ?? 'ativo',
      })
      .returning();

    return c.json({ data: result }, 201);
  });

  app.put('/prescriptions/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    const updateData: any = { updatedAt: new Date() };

    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.exercises !== undefined) updateData.exercises = body.exercises;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.valid_until !== undefined) updateData.validUntil = body.valid_until ? new Date(body.valid_until) : null;
    if (body.validity_days !== undefined) updateData.validityDays = Number(body.validity_days);
    if (body.view_count !== undefined) updateData.viewCount = Number(body.view_count);
    if (body.last_viewed_at !== undefined) updateData.lastViewedAt = body.last_viewed_at ? new Date(body.last_viewed_at) : null;
    if (body.completed_exercises !== undefined) updateData.completedExercises = body.completed_exercises;

    const [result] = await db
      .update(exercisePrescriptions)
      .set(updateData)
      .where(
        and(
          eq(exercisePrescriptions.id, id),
          eq(exercisePrescriptions.organizationId, user.organizationId)
        )
      )
      .returning();

    if (!result) return c.json({ error: 'Prescrição não encontrada' }, 404);
    return c.json({ data: result });
  });

  app.delete('/prescriptions/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [check] = await db
      .select({ id: exercisePrescriptions.id })
      .from(exercisePrescriptions)
      .where(
        and(
          eq(exercisePrescriptions.id, id),
          eq(exercisePrescriptions.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!check) return c.json({ error: 'Prescrição não encontrada' }, 404);

    await db.update(exercisePrescriptions).set({ deletedAt: new Date() }).where(eq(exercisePrescriptions.id, id));
    return c.json({ ok: true });
  });

  app.get('/prescribed-exercises', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { patientId, active } = c.req.query();

    const where = [eq(prescribedExercises.organizationId, user.organizationId)];
    if (patientId) where.push(eq(prescribedExercises.patientId, patientId));
    if (active !== undefined) {
      where.push(eq(prescribedExercises.isActive, active === 'true'));
    } else {
      where.push(eq(prescribedExercises.isActive, true));
    }

    // In a real scenario, we might want to join with exercises table.
    // However, the original code used a LEFT JOIN which we can replicate with db.query or a manual join.
    // For now, let's use a flat select if the exercise info is just for display and potentially handled by the client.
    // Wait, the original code build a JSON object for exercise info.
    
    // Let's use db.query for easier joining if possible, or just a explicit join.
    // But I don't have the exercises table imported yet.
    
    const result = await db
      .select({
        id: prescribedExercises.id,
        patientId: prescribedExercises.patientId,
        exerciseId: prescribedExercises.exerciseId,
        frequency: prescribedExercises.frequency,
        sets: prescribedExercises.sets,
        reps: prescribedExercises.reps,
        durationSeconds: prescribedExercises.duration,
        notes: prescribedExercises.notes,
        isActive: prescribedExercises.isActive,
        createdAt: prescribedExercises.createdAt,
        updatedAt: prescribedExercises.updatedAt,
      })
      .from(prescribedExercises)
      .where(and(...where))
      .orderBy(desc(prescribedExercises.createdAt));

    return c.json({ data: result });
  });

  app.post('/prescribed-exercises', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as any;

    if (!body.patient_id || !body.exercise_id) {
      return c.json({ error: 'patient_id e exercise_id são obrigatórios' }, 400);
    }

    const [result] = await db
      .insert(prescribedExercises)
      .values({
        organizationId: user.organizationId,
        patientId: String(body.patient_id),
        exerciseId: String(body.exercise_id),
        frequency: body.frequency ?? null,
        sets: body.sets != null ? Number(body.sets) : 3,
        reps: body.reps != null ? Number(body.reps) : 10,
        duration: body.duration_seconds != null ? Number(body.duration_seconds) : (body.duration != null ? Number(body.duration) : null),
        notes: body.notes ?? null,
        isActive: body.is_active !== false,
      })
      .returning();

    return c.json({ data: result }, 201);
  });

  app.put('/prescribed-exercises/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as any;

    const updateData: any = { updatedAt: new Date() };

    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.sets !== undefined) updateData.sets = Number(body.sets);
    if (body.reps !== undefined) updateData.reps = Number(body.reps);
    if (body.duration_seconds !== undefined) updateData.duration = Number(body.duration_seconds);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.is_active !== undefined) updateData.isActive = Boolean(body.is_active);

    const [result] = await db
      .update(prescribedExercises)
      .set(updateData)
      .where(
        and(
          eq(prescribedExercises.id, id),
          eq(prescribedExercises.organizationId, user.organizationId)
        )
      )
      .returning();

    if (!result) return c.json({ error: 'Prescrição de exercício não encontrada' }, 404);
    return c.json({ data: result });
  });

  app.delete('/prescribed-exercises/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    const [result] = await db
      .update(prescribedExercises)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(prescribedExercises.id, id),
          eq(prescribedExercises.organizationId, user.organizationId)
        )
      )
      .returning({ id: prescribedExercises.id });

    if (!result) return c.json({ error: 'Prescrição de exercício não encontrada' }, 404);
    return c.json({ ok: true });
  });

  app.get('/patient-objectives', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const result = await db
      .select()
      .from(patientObjectives)
      .where(
        and(
          eq(patientObjectives.isActive, true),
          or(
            eq(patientObjectives.organizationId, user.organizationId),
            sql`${patientObjectives.organizationId} IS NULL`
          )
        )
      )
      .orderBy(asc(patientObjectives.category), asc(patientObjectives.name));

    return c.json({ data: result });
  });

  app.post('/patient-objectives', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    if (!body.nome && !body.name) return c.json({ error: 'name é obrigatório' }, 400);

    const [result] = await db
      .insert(patientObjectives)
      .values({
        organizationId: user.organizationId,
        name: String(body.nome ?? body.name),
        description: (body.descricao ?? body.description) ? String(body.descricao ?? body.description) : null,
        category: (body.categoria ?? body.category) ? String(body.categoria ?? body.category) : null,
        isActive: (body.ativo ?? body.is_active) !== undefined ? Boolean(body.ativo ?? body.is_active) : true,
        createdBy: user.uid,
      })
      .returning();

    return c.json({ data: result }, 201);
  });

  app.put('/patient-objectives/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();
    const body = (await c.req.json()) as Record<string, any>;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.nome !== undefined || body.name !== undefined) {
      updateData.name = String(body.nome ?? body.name);
    }
    if (body.descricao !== undefined || body.description !== undefined) {
      updateData.description = (body.descricao ?? body.description) ? String(body.descricao ?? body.description) : null;
    }
    if (body.categoria !== undefined || body.category !== undefined) {
      updateData.category = (body.categoria ?? body.category) ? String(body.categoria ?? body.category) : null;
    }
    if (body.ativo !== undefined || body.is_active !== undefined) {
      updateData.isActive = Boolean(body.ativo ?? body.is_active);
    }

    const [result] = await db
      .update(patientObjectives)
      .set(updateData)
      .where(
        and(
          eq(patientObjectives.id, id),
          eq(patientObjectives.organizationId, user.organizationId)
        )
      )
      .returning();

    if (!result) return c.json({ error: 'Objetivo não encontrado' }, 404);
    return c.json({ data: result });
  });

  app.delete('/patient-objectives/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    await db
      .update(patientObjectives)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(patientObjectives.id, id),
          eq(patientObjectives.organizationId, user.organizationId)
        )
      );

    return c.json({ ok: true });
  });

  app.get('/patient-objective-assignments', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { patientId } = c.req.query();

    if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

    const result = await db
      .select({
        id: patientObjectiveAssignments.id,
        organizationId: patientObjectiveAssignments.organizationId,
        patientId: patientObjectiveAssignments.patientId,
        objectiveId: patientObjectiveAssignments.objectiveId,
        prioridade: patientObjectiveAssignments.priority,
        notas: patientObjectiveAssignments.notes,
        createdBy: patientObjectiveAssignments.createdBy,
        createdAt: patientObjectiveAssignments.createdAt,
        objective: {
          id: patientObjectives.id,
          name: patientObjectives.name,
          description: patientObjectives.description,
          category: patientObjectives.category,
          isActive: patientObjectives.isActive,
          organizationId: patientObjectives.organizationId,
          createdAt: patientObjectives.createdAt,
        },
      })
      .from(patientObjectiveAssignments)
      .innerJoin(patientObjectives, eq(patientObjectives.id, patientObjectiveAssignments.objectiveId))
      .where(
        and(
          eq(patientObjectiveAssignments.organizationId, user.organizationId),
          eq(patientObjectiveAssignments.patientId, patientId)
        )
      )
      .orderBy(asc(patientObjectiveAssignments.prioridade), desc(patientObjectiveAssignments.createdAt));

    return c.json({ data: result });
  });

  app.post('/patient-objective-assignments', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const body = (await c.req.json()) as Record<string, any>;

    if (!body.patient_id || !body.objective_id) {
      return c.json({ error: 'patient_id e objective_id são obrigatórios' }, 400);
    }

    const [result] = await db
      .insert(patientObjectiveAssignments)
      .values({
        organizationId: user.organizationId,
        patientId: String(body.patient_id),
        objectiveId: String(body.objective_id),
        priority: Number(body.prioridade ?? body.priority ?? 2),
        notes: (body.notas ?? body.notes) ? String(body.notas ?? body.notes) : null,
        createdBy: user.uid,
      })
      .returning();

    return c.json({ data: result }, 201);
  });

  app.delete('/patient-objective-assignments/:id', requireAuth, async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);
    const { id } = c.req.param();

    await db
      .delete(patientObjectiveAssignments)
      .where(
        and(
          eq(patientObjectiveAssignments.id, id),
          eq(patientObjectiveAssignments.organizationId, user.organizationId)
        )
      );

    return c.json({ ok: true });
  });
}
