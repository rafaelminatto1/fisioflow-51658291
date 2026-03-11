/**
 * Rotas: Domínio Clínico (Mapas de Dor, Templates de Evolução, Prescrições)
 *
 * GET/POST/PUT/DELETE /api/clinical/pain-maps
 * GET/POST/PUT/DELETE /api/clinical/evolution-templates
 * GET/POST/PUT/DELETE /api/clinical/prescriptions
 * GET/POST/PUT/DELETE /api/clinical/test-templates
 * GET/POST/PUT/DELETE /api/clinical/conduct-library
 * GET/POST /api/clinical/standardized-tests
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function getColumns(
  pool: ReturnType<typeof createPool>,
  tableName: string,
): Promise<Set<string>> {
  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );

  return new Set(result.rows.map((row) => String(row.column_name)));
}

async function hasTable(
  pool: ReturnType<typeof createPool>,
  tableName: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT to_regclass($1)::text AS table_name`,
    [`public.${tableName}`],
  );
  return Boolean(result.rows[0]?.table_name);
}

app.get('/insights', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const [hasGoals, hasPathologies, hasMetrics] = await Promise.all([
    hasTable(pool, 'patient_goals'),
    hasTable(pool, 'patient_pathologies'),
    hasTable(pool, 'patient_session_metrics'),
  ]);

  const goals = hasGoals
    ? await pool.query(
        `
          SELECT
            COALESCE(status, 'sem_status') AS status,
            COUNT(*)::text AS count,
            ROUND(
              AVG(
                CASE
                  WHEN achieved_at IS NOT NULL AND created_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (achieved_at - created_at)) / 86400.0
                  ELSE NULL
                END
              )::numeric,
              1
            ) AS avg_days_to_achieve
          FROM patient_goals
          WHERE organization_id = $1
          GROUP BY 1
          ORDER BY COUNT(*) DESC
        `,
        [user.organizationId],
      )
    : { rows: [] };

  const pathologyColumns = hasPathologies ? await getColumns(pool, 'patient_pathologies') : new Set<string>();
  const pathologyNameColumn = pathologyColumns.has('pathology_name')
    ? 'pathology_name'
    : pathologyColumns.has('name')
      ? 'name'
      : null;
  const painColumn = hasMetrics
    ? await getColumns(pool, 'patient_session_metrics').then((columns) =>
        columns.has('pain_level_after')
          ? 'pain_level_after'
          : columns.has('pain_level_before')
            ? 'pain_level_before'
            : null,
      )
    : null;

  const pathologies = pathologyNameColumn
    ? await pool.query(
        `
          SELECT
            ${pathologyNameColumn} AS name,
            COUNT(*)::text AS patient_count
          FROM patient_pathologies
          WHERE organization_id = $1
          GROUP BY 1
          ORDER BY COUNT(*) DESC, ${pathologyNameColumn} ASC
          LIMIT 10
        `,
        [user.organizationId],
      )
    : { rows: [] };

  const painTrend = pathologyNameColumn && painColumn
    ? await pool.query(
        `
          WITH ranked_pathologies AS (
            SELECT
              patient_id,
              ${pathologyNameColumn} AS pathology,
              ROW_NUMBER() OVER (
                PARTITION BY patient_id
                ORDER BY
                  CASE WHEN status = 'ativo' THEN 0 ELSE 1 END,
                  created_at DESC
              ) AS row_rank
            FROM patient_pathologies
            WHERE organization_id = $1
          )
          SELECT
            COALESCE(ranked_pathologies.pathology, 'Sem classificacao') AS pathology,
            ROUND(AVG(psm.${painColumn})::numeric, 1) AS avg_pain_level,
            COUNT(*)::text AS record_count
          FROM patient_session_metrics psm
          LEFT JOIN ranked_pathologies
            ON ranked_pathologies.patient_id = psm.patient_id
           AND ranked_pathologies.row_rank = 1
          WHERE psm.organization_id = $1
            AND psm.${painColumn} IS NOT NULL
          GROUP BY 1
          ORDER BY AVG(psm.${painColumn}) DESC NULLS LAST, COUNT(*) DESC
          LIMIT 8
        `,
        [user.organizationId],
      )
    : { rows: [] };

  return c.json({
    data: {
      goals: goals.rows.map((row) => ({
        status: String(row.status ?? 'sem_status'),
        count: String(row.count ?? '0'),
        avg_days_to_achieve:
          row.avg_days_to_achieve !== null && row.avg_days_to_achieve !== undefined
            ? Number(row.avg_days_to_achieve)
            : null,
      })),
      pathologies: pathologies.rows.map((row) => ({
        name: String(row.name ?? 'Sem classificacao'),
        patient_count: String(row.patient_count ?? '0'),
      })),
      painTrend: painTrend.rows.map((row) => ({
        pathology: String(row.pathology ?? 'Sem classificacao'),
        avg_pain_level: Number(row.avg_pain_level ?? 0),
        record_count: String(row.record_count ?? '0'),
      })),
      timestamp: new Date().toISOString(),
    },
  });
});

// ===== PAIN MAPS =====

// ===== CLINICAL TEST TEMPLATES =====

// ===== CONDUCT LIBRARY =====

app.get('/conduct-library', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const category = c.req.query('category');

  const params: unknown[] = [user.organizationId];
  const conditions: string[] = ['(organization_id = $1 OR organization_id IS NULL)'];

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  const result = await pool.query(
    `
      SELECT *
      FROM conduct_library
      WHERE ${conditions.join(' AND ')}
      ORDER BY title ASC
    `,
    params,
  );

  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.get('/conduct-library/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      SELECT *
      FROM conduct_library
      WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Conduta não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/conduct-library', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.title || !body.category || !body.conduct_text) {
    return c.json({ error: 'title, category e conduct_text são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO conduct_library (
        organization_id, created_by, title, description, conduct_text, category, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW()
      )
      RETURNING *
    `,
    [
      body.organization_id ?? user.organizationId,
      body.created_by ?? user.uid,
      String(body.title),
      body.description ?? null,
      String(body.conduct_text),
      String(body.category),
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/conduct-library/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.title !== undefined) { params.push(body.title || null); sets.push(`title = $${params.length}`); }
  if (body.description !== undefined) { params.push(body.description || null); sets.push(`description = $${params.length}`); }
  if (body.conduct_text !== undefined) { params.push(body.conduct_text || null); sets.push(`conduct_text = $${params.length}`); }
  if (body.category !== undefined) { params.push(body.category || null); sets.push(`category = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE conduct_library
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Conduta não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/conduct-library/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query(
    'DELETE FROM conduct_library WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/test-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const idsParam = c.req.query('ids');

  const params: unknown[] = [];
  const conditions: string[] = ['(organization_id = $1 OR organization_id IS NULL)'];
  params.push(user.organizationId);

  if (idsParam) {
    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length > 0) {
      params.push(ids);
      conditions.push(`id = ANY($${params.length})`);
    }
  }

  const result = await pool.query(
    `
      SELECT *
      FROM clinical_test_templates
      WHERE ${conditions.join(' AND ')}
      ORDER BY name ASC
    `,
    params,
  );

  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.get('/test-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      SELECT *
      FROM clinical_test_templates
      WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Teste clínico não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/test-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.name || !body.category || !body.target_joint) {
    return c.json({ error: 'name, category e target_joint são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO clinical_test_templates (
        organization_id, created_by, name, name_en, category, target_joint, purpose, execution,
        positive_sign, reference, sensitivity_specificity, tags, type, fields_definition,
        regularity_sessions, layout_type, image_url, media_urls, is_custom, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,NOW(),NOW()
      )
      RETURNING *
    `,
    [
      body.organization_id ?? user.organizationId,
      body.created_by ?? user.uid,
      String(body.name),
      body.name_en ?? null,
      body.category,
      body.target_joint,
      body.purpose ?? null,
      body.execution ?? null,
      body.positive_sign ?? null,
      body.reference ?? null,
      body.sensitivity_specificity ?? null,
      Array.isArray(body.tags) ? body.tags : [],
      body.type ?? 'special_test',
      JSON.stringify(body.fields_definition ?? []),
      body.regularity_sessions != null ? Number(body.regularity_sessions) : null,
      body.layout_type ?? null,
      body.image_url ?? null,
      Array.isArray(body.media_urls) ? body.media_urls : [],
      body.is_custom === true,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/test-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.name !== undefined) { params.push(body.name); sets.push(`name = $${params.length}`); }
  if (body.name_en !== undefined) { params.push(body.name_en || null); sets.push(`name_en = $${params.length}`); }
  if (body.category !== undefined) { params.push(body.category); sets.push(`category = $${params.length}`); }
  if (body.target_joint !== undefined) { params.push(body.target_joint); sets.push(`target_joint = $${params.length}`); }
  if (body.purpose !== undefined) { params.push(body.purpose || null); sets.push(`purpose = $${params.length}`); }
  if (body.execution !== undefined) { params.push(body.execution || null); sets.push(`execution = $${params.length}`); }
  if (body.positive_sign !== undefined) { params.push(body.positive_sign || null); sets.push(`positive_sign = $${params.length}`); }
  if (body.reference !== undefined) { params.push(body.reference || null); sets.push(`reference = $${params.length}`); }
  if (body.sensitivity_specificity !== undefined) { params.push(body.sensitivity_specificity || null); sets.push(`sensitivity_specificity = $${params.length}`); }
  if (body.tags !== undefined) { params.push(Array.isArray(body.tags) ? body.tags : []); sets.push(`tags = $${params.length}`); }
  if (body.type !== undefined) { params.push(body.type || 'special_test'); sets.push(`type = $${params.length}`); }
  if (body.fields_definition !== undefined) { params.push(JSON.stringify(body.fields_definition ?? [])); sets.push(`fields_definition = $${params.length}::jsonb`); }
  if (body.regularity_sessions !== undefined) { params.push(body.regularity_sessions != null ? Number(body.regularity_sessions) : null); sets.push(`regularity_sessions = $${params.length}`); }
  if (body.layout_type !== undefined) { params.push(body.layout_type || null); sets.push(`layout_type = $${params.length}`); }
  if (body.image_url !== undefined) { params.push(body.image_url || null); sets.push(`image_url = $${params.length}`); }
  if (body.media_urls !== undefined) { params.push(Array.isArray(body.media_urls) ? body.media_urls : []); sets.push(`media_urls = $${params.length}`); }
  if (body.is_custom !== undefined) { params.push(body.is_custom === true); sets.push(`is_custom = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE clinical_test_templates
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND (organization_id = $${params.length} OR organization_id IS NULL)
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Teste clínico não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/test-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query(
    'DELETE FROM clinical_test_templates WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/standardized-tests', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const patientId = c.req.query('patientId');

  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const result = await pool.query(
    `
      SELECT *
      FROM standardized_test_results
      WHERE organization_id = $1 AND patient_id = $2
      ORDER BY created_at DESC
    `,
    [user.organizationId, patientId],
  );

  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/standardized-tests', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.patient_id || !body.test_type || !body.test_name) {
    return c.json({ error: 'patient_id, test_type e test_name são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO standardized_test_results (
        organization_id, patient_id, test_type, test_name, score, max_score,
        interpretation, answers, created_by, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,NOW(),NOW()
      )
      RETURNING *
    `,
    [
      user.organizationId,
      body.patient_id,
      body.test_type,
      body.test_name,
      Number(body.score ?? 0),
      Number(body.max_score ?? 0),
      body.interpretation ?? null,
      JSON.stringify(body.answers ?? {}),
      user.uid,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.get('/pain-maps', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, evolutionId } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (patientId) { params.push(patientId); conditions.push(`patient_id = $${params.length}`); }
  if (evolutionId) { params.push(evolutionId); conditions.push(`evolution_id = $${params.length}`); }

  const mapsResult = await pool.query(
    `SELECT * FROM pain_maps WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params,
  );

  // Fetch points for all maps
  if (mapsResult.rows.length === 0) return c.json({ data: [] });

  const mapIds = mapsResult.rows.map((r: any) => r.id);
  const placeholders = mapIds.map((_: string, i: number) => `$${i + 1}`).join(',');
  const pointsResult = await pool.query(
    `SELECT * FROM pain_map_points WHERE pain_map_id IN (${placeholders}) ORDER BY created_at ASC`,
    mapIds,
  );

  const pointsByMap = pointsResult.rows.reduce((acc: Record<string, unknown[]>, point: any) => {
    if (!acc[point.pain_map_id]) acc[point.pain_map_id] = [];
    acc[point.pain_map_id].push(point);
    return acc;
  }, {} as Record<string, unknown[]>);

  const mapsWithPoints = mapsResult.rows.map((map: any) => ({
    ...map,
    points: pointsByMap[map.id] ?? [],
  }));

  return c.json({ data: mapsWithPoints });
});

app.post('/pain-maps', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const mapResult = await pool.query(
    `INSERT INTO pain_maps
       (organization_id, patient_id, evolution_id, body_region, pain_level,
        color_code, notes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.patient_id ?? null,
      body.evolution_id ?? null,
      body.body_region ?? null,
      body.pain_level != null ? Number(body.pain_level) : null,
      body.color_code ?? null,
      body.notes ?? null,
    ],
  );

  const map = mapResult.rows[0] as { id: string };

  // Insert points if provided
  const points = Array.isArray(body.points) ? body.points as Record<string, unknown>[] : [];
  const insertedPoints: unknown[] = [];
  for (const point of points) {
    const pResult = await pool.query(
      `INSERT INTO pain_map_points
         (pain_map_id, x_coordinate, y_coordinate, intensity, region, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING *`,
      [
        map.id,
        point.x_coordinate != null ? Number(point.x_coordinate) : null,
        point.y_coordinate != null ? Number(point.y_coordinate) : null,
        point.intensity != null ? Number(point.intensity) : null,
        point.region ?? null,
      ],
    );
    insertedPoints.push(pResult.rows[0]);
  }

  return c.json({ data: { ...map, points: insertedPoints } }, 201);
});

app.put('/pain-maps/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.body_region !== undefined) { params.push(body.body_region); sets.push(`body_region = $${params.length}`); }
  if (body.pain_level !== undefined) { params.push(Number(body.pain_level)); sets.push(`pain_level = $${params.length}`); }
  if (body.color_code !== undefined) { params.push(body.color_code); sets.push(`color_code = $${params.length}`); }
  if (body.notes !== undefined) { params.push(body.notes); sets.push(`notes = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE pain_maps SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Mapa de dor não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/pain-maps/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM pain_maps WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Mapa de dor não encontrado' }, 404);

  await pool.query('DELETE FROM pain_maps WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== EVOLUTION TEMPLATES =====

app.get('/evolution-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { ativo } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (ativo !== undefined) { params.push(ativo === 'true'); conditions.push(`ativo = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM evolution_templates WHERE ${conditions.join(' AND ')} ORDER BY name ASC`,
    params,
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.get('/evolution-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'SELECT * FROM evolution_templates WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Template não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/evolution-templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.name) return c.json({ error: 'name é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO evolution_templates
       (organization_id, name, description, blocks, tags, ativo, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.name),
      body.description ?? null,
      body.blocks ? JSON.stringify(body.blocks) : '[]',
      body.tags ?? [],
      body.ativo !== false,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/evolution-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.name !== undefined) { params.push(body.name); sets.push(`name = $${params.length}`); }
  if (body.description !== undefined) { params.push(body.description); sets.push(`description = $${params.length}`); }
  if (body.blocks !== undefined) { params.push(JSON.stringify(body.blocks)); sets.push(`blocks = $${params.length}`); }
  if (body.tags !== undefined) { params.push(body.tags); sets.push(`tags = $${params.length}`); }
  if (body.ativo !== undefined) { params.push(body.ativo); sets.push(`ativo = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE evolution_templates SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Template não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/evolution-templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM evolution_templates WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Template não encontrado' }, 404);

  await pool.query('DELETE FROM evolution_templates WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== EXERCISE PRESCRIPTIONS =====

app.get('/prescriptions', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, therapistId, status } = c.req.query();

  const conditions: string[] = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];

  if (patientId) { params.push(patientId); conditions.push(`patient_id = $${params.length}`); }
  if (therapistId) { params.push(therapistId); conditions.push(`therapist_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }

  const result = await pool.query(
    `SELECT * FROM exercise_prescriptions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params,
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.get('/prescriptions/qr/:qrCode', async (c) => {
  const pool = createPool(c.env);
  const { qrCode } = c.req.param();

  const result = await pool.query(
    'SELECT * FROM exercise_prescriptions WHERE qr_code = $1 LIMIT 1',
    [qrCode],
  );
  if (!result.rows.length) return c.json({ data: null });
  return c.json({ data: result.rows[0] });
});

app.put('/prescriptions/qr/:qrCode', async (c) => {
  const pool = createPool(c.env);
  const { qrCode } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.view_count !== undefined) {
    params.push(Number(body.view_count));
    sets.push(`view_count = $${params.length}`);
  }
  if (body.last_viewed_at !== undefined) {
    params.push(body.last_viewed_at);
    sets.push(`last_viewed_at = $${params.length}`);
  }
  if (body.completed_exercises !== undefined) {
    const completed = Array.isArray(body.completed_exercises) ? body.completed_exercises : [];
    params.push(JSON.stringify(completed));
    sets.push(`completed_exercises = $${params.length}`);
  }

  if (sets.length === 1) {
    return c.json({ error: 'Nenhum campo permitido para atualização' }, 400);
  }

  params.push(qrCode);
  const result = await pool.query(
    `UPDATE exercise_prescriptions SET ${sets.join(', ')}
     WHERE qr_code = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Prescrição não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.get('/prescriptions/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    'SELECT * FROM exercise_prescriptions WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: 'Prescrição não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.post('/prescriptions', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.title) return c.json({ error: 'title é obrigatório' }, 400);

  const validityDays = body.validity_days != null ? Number(body.validity_days) : 30;
  const validUntil = body.valid_until ?? null;

  const result = await pool.query(
    `INSERT INTO exercise_prescriptions
       (organization_id, patient_id, therapist_id, qr_code, title, exercises,
        notes, validity_days, valid_until, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      body.patient_id ?? null,
      body.therapist_id ?? user.uid,
      body.qr_code ?? null,
      String(body.title),
      body.exercises ? JSON.stringify(body.exercises) : '[]',
      body.notes ?? null,
      validityDays,
      validUntil,
      body.status ?? 'ativo',
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/prescriptions/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.title !== undefined) { params.push(body.title); sets.push(`title = $${params.length}`); }
  if (body.exercises !== undefined) { params.push(JSON.stringify(body.exercises)); sets.push(`exercises = $${params.length}`); }
  if (body.notes !== undefined) { params.push(body.notes); sets.push(`notes = $${params.length}`); }
  if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
  if (body.valid_until !== undefined) { params.push(body.valid_until); sets.push(`valid_until = $${params.length}`); }
  if (body.validity_days !== undefined) { params.push(Number(body.validity_days)); sets.push(`validity_days = $${params.length}`); }
  if (body.view_count !== undefined) { params.push(Number(body.view_count)); sets.push(`view_count = $${params.length}`); }
  if (body.last_viewed_at !== undefined) { params.push(body.last_viewed_at); sets.push(`last_viewed_at = $${params.length}`); }
  if (body.completed_exercises !== undefined) { params.push(JSON.stringify(body.completed_exercises)); sets.push(`completed_exercises = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE exercise_prescriptions SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Prescrição não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/prescriptions/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  const check = await pool.query(
    'SELECT id FROM exercise_prescriptions WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: 'Prescrição não encontrada' }, 404);

  await pool.query('DELETE FROM exercise_prescriptions WHERE id = $1', [id]);
  return c.json({ ok: true });
});

// ===== HOME CARE (PRESCRIBED EXERCISES) =====

app.get('/prescribed-exercises', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId, active } = c.req.query();

  if (!(await hasTable(pool, 'prescribed_exercises'))) {
    return c.json({ data: [] });
  }

  const params: unknown[] = [user.organizationId];
  const conditions: string[] = ['pe.organization_id = $1'];

  if (patientId) {
    params.push(patientId);
    conditions.push(`pe.patient_id = $${params.length}`);
  }
  if (active !== undefined) {
    params.push(active === 'true');
    conditions.push(`pe.is_active = $${params.length}`);
  } else {
    conditions.push('pe.is_active = true');
  }

  const result = await pool.query(
    `
    SELECT
      pe.id,
      pe.patient_id,
      pe.exercise_id,
      pe.frequency,
      pe.sets,
      pe.reps,
      pe.duration AS duration_seconds,
      pe.notes,
      pe.is_active,
      pe.created_at,
      pe.updated_at,
      json_build_object(
        'id', e.id,
        'name', e.name,
        'image_url', e.image_url,
        'video_url', e.video_url
      ) AS exercise
    FROM prescribed_exercises pe
    LEFT JOIN exercises e ON e.id = pe.exercise_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY pe.created_at DESC
    `,
    params,
  );

  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/prescribed-exercises', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'prescribed_exercises'))) {
    return c.json({ error: 'Tabela prescribed_exercises não disponível' }, 503);
  }

  if (!body.patient_id || !body.exercise_id) {
    return c.json({ error: 'patient_id e exercise_id são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
    INSERT INTO prescribed_exercises
      (organization_id, patient_id, exercise_id, frequency, sets, reps, duration, notes, is_active, created_at, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    RETURNING *
    `,
    [
      user.organizationId,
      String(body.patient_id),
      String(body.exercise_id),
      body.frequency ?? null,
      body.sets != null ? Number(body.sets) : 3,
      body.reps != null ? Number(body.reps) : 10,
      body.duration_seconds != null ? Number(body.duration_seconds) : (body.duration != null ? Number(body.duration) : null),
      body.notes ?? null,
      body.is_active !== false,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/prescribed-exercises/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!(await hasTable(pool, 'prescribed_exercises'))) {
    return c.json({ error: 'Tabela prescribed_exercises não disponível' }, 503);
  }

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.frequency !== undefined) { params.push(body.frequency); sets.push(`frequency = $${params.length}`); }
  if (body.sets !== undefined) { params.push(Number(body.sets)); sets.push(`sets = $${params.length}`); }
  if (body.reps !== undefined) { params.push(Number(body.reps)); sets.push(`reps = $${params.length}`); }
  if (body.duration_seconds !== undefined) { params.push(Number(body.duration_seconds)); sets.push(`duration = $${params.length}`); }
  if (body.notes !== undefined) { params.push(body.notes); sets.push(`notes = $${params.length}`); }
  if (body.is_active !== undefined) { params.push(Boolean(body.is_active)); sets.push(`is_active = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
    UPDATE prescribed_exercises
    SET ${sets.join(', ')}
    WHERE id = $${params.length - 1} AND organization_id = $${params.length}
    RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Prescrição de exercício não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/prescribed-exercises/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  if (!(await hasTable(pool, 'prescribed_exercises'))) {
    return c.json({ error: 'Tabela prescribed_exercises não disponível' }, 503);
  }

  const result = await pool.query(
    `
    UPDATE prescribed_exercises
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND organization_id = $2
    RETURNING id
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Prescrição de exercício não encontrada' }, 404);
  return c.json({ ok: true });
});

app.get('/patient-objectives', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  const result = await pool.query(
    `
      SELECT *
      FROM patient_objectives
      WHERE ativo = true AND (organization_id = $1 OR organization_id IS NULL)
      ORDER BY categoria ASC NULLS LAST, nome ASC
    `,
    [user.organizationId],
  );

  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/patient-objectives', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400);

  const result = await pool.query(
    `
      INSERT INTO patient_objectives (
        organization_id, nome, descricao, categoria, ativo, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      String(body.nome),
      body.descricao ? String(body.descricao) : null,
      body.categoria ? String(body.categoria) : null,
      body.ativo !== undefined ? Boolean(body.ativo) : true,
      user.uid,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/patient-objectives/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.nome !== undefined) { params.push(String(body.nome)); sets.push(`nome = $${params.length}`); }
  if (body.descricao !== undefined) { params.push(body.descricao ? String(body.descricao) : null); sets.push(`descricao = $${params.length}`); }
  if (body.categoria !== undefined) { params.push(body.categoria ? String(body.categoria) : null); sets.push(`categoria = $${params.length}`); }
  if (body.ativo !== undefined) { params.push(Boolean(body.ativo)); sets.push(`ativo = $${params.length}`); }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `
      UPDATE patient_objectives
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING *
    `,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Objetivo não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/patient-objectives/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query(
    `
      UPDATE patient_objectives
      SET ativo = false, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
    `,
    [id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/patient-objective-assignments', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { patientId } = c.req.query();

  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const result = await pool.query(
    `
      SELECT
        a.*,
        o.id AS objective_ref_id,
        o.nome AS objective_nome,
        o.descricao AS objective_descricao,
        o.categoria AS objective_categoria,
        o.ativo AS objective_ativo,
        o.organization_id AS objective_organization_id,
        o.created_at AS objective_created_at
      FROM patient_objective_assignments a
      INNER JOIN patient_objectives o ON o.id = a.objective_id
      WHERE a.organization_id = $1 AND a.patient_id = $2
      ORDER BY a.prioridade ASC, a.created_at DESC
    `,
    [user.organizationId, patientId],
  );

  const data = result.rows.map((row) => ({
    ...row,
    objective: {
      id: row.objective_ref_id,
      nome: row.objective_nome,
      descricao: row.objective_descricao,
      categoria: row.objective_categoria,
      ativo: row.objective_ativo,
      organization_id: row.objective_organization_id,
      created_at: row.objective_created_at,
    },
  }));

  return c.json({ data });
});

app.post('/patient-objective-assignments', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.patient_id || !body.objective_id) {
    return c.json({ error: 'patient_id e objective_id são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO patient_objective_assignments (
        organization_id, patient_id, objective_id, prioridade, notas, created_by, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      String(body.patient_id),
      String(body.objective_id),
      Number(body.prioridade ?? 2),
      body.notas ? String(body.notas) : null,
      user.uid,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.delete('/patient-objective-assignments/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();

  await pool.query(
    'DELETE FROM patient_objective_assignments WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );

  return c.json({ ok: true });
});

export { app as clinicalRoutes };
