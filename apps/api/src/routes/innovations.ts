import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const hasTable = async (pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> => {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
};

app.get('/inventory', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const activeOnly = c.req.query('activeOnly') !== 'false';

  if (!(await hasTable(pool, 'clinic_inventory'))) return c.json({ data: [] });

  const params: unknown[] = [user.organizationId];
  const conditions = ['organization_id = $1'];
  if (activeOnly) {
    params.push(true);
    conditions.push(`is_active = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT * FROM clinic_inventory WHERE ${conditions.join(' AND ')} ORDER BY item_name ASC`,
    params,
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.post('/inventory', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.item_name) return c.json({ error: 'item_name é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO clinic_inventory
      (organization_id, item_name, category, current_quantity, minimum_quantity, unit, cost_per_unit,
       supplier, last_restock_date, expiration_date, location, is_active, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.item_name),
      body.category ?? null,
      Number(body.current_quantity ?? 0),
      Number(body.minimum_quantity ?? 0),
      String(body.unit ?? 'unidade'),
      body.cost_per_unit != null ? Number(body.cost_per_unit) : null,
      body.supplier ?? null,
      body.last_restock_date ?? null,
      body.expiration_date ?? null,
      body.location ?? null,
      body.is_active !== false,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/inventory/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  const mapField = (field: string, value: unknown) => {
    params.push(value);
    sets.push(`${field} = $${params.length}`);
  };

  if (body.item_name !== undefined) mapField('item_name', body.item_name);
  if (body.category !== undefined) mapField('category', body.category);
  if (body.current_quantity !== undefined) mapField('current_quantity', Number(body.current_quantity));
  if (body.minimum_quantity !== undefined) mapField('minimum_quantity', Number(body.minimum_quantity));
  if (body.unit !== undefined) mapField('unit', body.unit);
  if (body.cost_per_unit !== undefined) mapField('cost_per_unit', body.cost_per_unit != null ? Number(body.cost_per_unit) : null);
  if (body.supplier !== undefined) mapField('supplier', body.supplier);
  if (body.last_restock_date !== undefined) mapField('last_restock_date', body.last_restock_date);
  if (body.expiration_date !== undefined) mapField('expiration_date', body.expiration_date);
  if (body.location !== undefined) mapField('location', body.location);
  if (body.is_active !== undefined) mapField('is_active', body.is_active);

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE clinic_inventory SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND organization_id = $${params.length}
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: 'Item não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.get('/inventory-movements', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const inventoryId = c.req.query('inventoryId');
  const limit = Math.min(Number(c.req.query('limit') ?? 100) || 100, 500);

  if (!(await hasTable(pool, 'inventory_movements'))) return c.json({ data: [] });

  const params: unknown[] = [user.organizationId];
  const conditions = ['organization_id = $1'];
  if (inventoryId) {
    params.push(inventoryId);
    conditions.push(`inventory_id = $${params.length}`);
  }
  params.push(limit);
  const result = await pool.query(
    `SELECT * FROM inventory_movements
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.post('/inventory-movements', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const inventoryId = String(body.inventory_id ?? '').trim();
  const movementType = String(body.movement_type ?? '').trim();
  const quantity = Number(body.quantity ?? 0);

  if (!inventoryId) return c.json({ error: 'inventory_id é obrigatório' }, 400);
  if (!movementType) return c.json({ error: 'movement_type é obrigatório' }, 400);
  if (!Number.isFinite(quantity) || quantity <= 0) return c.json({ error: 'quantity inválido' }, 400);

  const itemResult = await pool.query(
    'SELECT * FROM clinic_inventory WHERE id = $1 AND organization_id = $2',
    [inventoryId, user.organizationId],
  );
  const item = itemResult.rows[0];
  if (!item) return c.json({ error: 'Item de estoque não encontrado' }, 404);

  const currentQuantity = Number(item.current_quantity ?? 0);
  let nextQuantity = currentQuantity;
  if (movementType === 'entrada') nextQuantity = currentQuantity + quantity;
  if (movementType === 'saida' || movementType === 'perda') nextQuantity = currentQuantity - quantity;
  if (movementType === 'ajuste') nextQuantity = quantity;
  if (nextQuantity < 0) return c.json({ error: 'Quantidade insuficiente em estoque' }, 400);

  await pool.query('BEGIN');
  try {
    const movementResult = await pool.query(
      `INSERT INTO inventory_movements
        (organization_id, inventory_id, movement_type, quantity, reason, related_appointment_id, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       RETURNING *`,
      [
        user.organizationId,
        inventoryId,
        movementType,
        quantity,
        body.reason ?? null,
        body.related_appointment_id ?? null,
        user.uid,
      ],
    );

    await pool.query(
      `UPDATE clinic_inventory
       SET current_quantity = $1,
           last_restock_date = CASE WHEN $2 = 'entrada' THEN NOW() ELSE last_restock_date END,
           updated_at = NOW()
       WHERE id = $3 AND organization_id = $4`,
      [nextQuantity, movementType, inventoryId, user.organizationId],
    );

    await pool.query('COMMIT');
    return c.json({ data: movementResult.rows[0] }, 201);
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
});

app.get('/staff-performance', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const therapistId = c.req.query('therapistId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!(await hasTable(pool, 'staff_performance_metrics'))) return c.json({ data: [] });

  const params: unknown[] = [user.organizationId];
  const conditions = ['organization_id = $1'];
  if (therapistId) {
    params.push(therapistId);
    conditions.push(`therapist_id = $${params.length}`);
  }
  if (startDate) {
    params.push(startDate);
    conditions.push(`metric_date >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`metric_date <= $${params.length}`);
  }
  const result = await pool.query(
    `SELECT * FROM staff_performance_metrics
     WHERE ${conditions.join(' AND ')}
     ORDER BY metric_date DESC`,
    params,
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.get('/appointment-predictions', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const limit = Math.min(Number(c.req.query('limit') ?? 50) || 50, 200);

  if (!(await hasTable(pool, 'patient_predictions'))) return c.json({ data: [] });

  const result = await pool.query(
    `SELECT id, patient_id, predicted_value, risk_factors, treatment_recommendations, prediction_date, created_at
     FROM patient_predictions
     WHERE organization_id = $1
     ORDER BY predicted_value DESC NULLS LAST, prediction_date DESC
     LIMIT $2`,
    [user.organizationId, limit],
  );

  const data = result.rows.map((row) => ({
    id: String(row.id),
    appointment_id: null,
    patient_id: String(row.patient_id),
    no_show_probability: Number(row.predicted_value ?? 0),
    risk_factors: Array.isArray(row.risk_factors) ? row.risk_factors : [],
    recommended_actions:
      row.treatment_recommendations && typeof row.treatment_recommendations === 'object'
        ? Object.values(row.treatment_recommendations as Record<string, unknown>).flatMap((value) =>
            Array.isArray(value) ? value.map(String) : [String(value)],
          )
        : null,
    prediction_date: row.prediction_date ?? row.created_at,
    was_accurate: null,
    created_at: row.created_at,
  }));

  return c.json({ data });
});

app.get('/revenue-forecasts', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const limit = Math.min(Number(c.req.query('limit') ?? 90) || 90, 365);

  if (!(await hasTable(pool, 'revenue_forecasts'))) return c.json({ data: [] });

  const result = await pool.query(
    `SELECT * FROM revenue_forecasts
     WHERE organization_id = $1
     ORDER BY forecast_date ASC
     LIMIT $2`,
    [user.organizationId, limit],
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.get('/whatsapp-exercise-queue', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const limit = Math.min(Number(c.req.query('limit') ?? 100) || 100, 500);

  if (!(await hasTable(pool, 'whatsapp_exercise_queue'))) return c.json({ data: [] });

  const result = await pool.query(
    `SELECT * FROM whatsapp_exercise_queue
     WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [user.organizationId, limit],
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.post('/whatsapp-exercise-queue', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.patient_id) return c.json({ error: 'patient_id é obrigatório' }, 400);
  if (!body.phone_number) return c.json({ error: 'phone_number é obrigatório' }, 400);

  const result = await pool.query(
    `INSERT INTO whatsapp_exercise_queue
      (organization_id, patient_id, exercise_plan_id, phone_number, exercises, scheduled_for, sent_at,
       delivered_at, opened_at, status, error_message, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
     RETURNING *`,
    [
      user.organizationId,
      String(body.patient_id),
      body.exercise_plan_id ?? null,
      String(body.phone_number),
      JSON.stringify(body.exercises ?? []),
      body.scheduled_for ?? null,
      body.sent_at ?? null,
      body.delivered_at ?? null,
      body.opened_at ?? null,
      body.status ?? 'pending',
      body.error_message ?? null,
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.get('/patient-self-assessments', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const patientId = c.req.query('patientId');
  const limit = Math.min(Number(c.req.query('limit') ?? 100) || 100, 500);

  if (!(await hasTable(pool, 'patient_self_assessments'))) return c.json({ data: [] });

  const params: unknown[] = [user.organizationId];
  const conditions = ['organization_id = $1'];
  if (patientId) {
    params.push(patientId);
    conditions.push(`patient_id = $${params.length}`);
  }
  params.push(limit);

  const result = await pool.query(
    `SELECT * FROM patient_self_assessments
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

export const innovationsRoutes = app;
