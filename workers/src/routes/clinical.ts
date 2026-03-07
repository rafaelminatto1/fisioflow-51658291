/**
 * Rotas: Domínio Clínico (Mapas de Dor, Templates de Evolução, Prescrições)
 *
 * GET/POST/PUT/DELETE /api/clinical/pain-maps
 * GET/POST/PUT/DELETE /api/clinical/evolution-templates
 * GET/POST/PUT/DELETE /api/clinical/prescriptions
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

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

// ===== PAIN MAPS =====

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

  const mapIds = mapsResult.rows.map((r: { id: string }) => r.id);
  const placeholders = mapIds.map((_: string, i: number) => `$${i + 1}`).join(',');
  const pointsResult = await pool.query(
    `SELECT * FROM pain_map_points WHERE pain_map_id IN (${placeholders}) ORDER BY created_at ASC`,
    mapIds,
  );

  const pointsByMap = pointsResult.rows.reduce((acc: Record<string, unknown[]>, point: { pain_map_id: string }) => {
    if (!acc[point.pain_map_id]) acc[point.pain_map_id] = [];
    acc[point.pain_map_id].push(point);
    return acc;
  }, {} as Record<string, unknown[]>);

  const mapsWithPoints = mapsResult.rows.map((map: { id: string }) => ({
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
  return c.json({ data: result.rows });
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
  return c.json({ data: result.rows });
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

  return c.json({ data: result.rows });
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

export { app as clinicalRoutes };
