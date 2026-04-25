import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId, dataType, source, limit } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT * FROM wearable_data WHERE organization_id = $1`;
  const params: unknown[] = [user.organizationId];
  let idx = 2;

  if (patientId) {
    sql += ` AND patient_id = $${idx++}`;
    params.push(patientId);
  }
  if (dataType) {
    sql += ` AND data_type = $${idx++}`;
    params.push(dataType);
  }
  if (source) {
    sql += ` AND source = $${idx++}`;
    params.push(source);
  }

  sql += " ORDER BY timestamp DESC";
  if (limit) {
    sql += ` LIMIT $${idx++}`;
    params.push(Number(limit));
  }

  const result = await db.query(sql, params);
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = await createPool(c.env);

  const result = await db.query(
    `INSERT INTO wearable_data (organization_id, patient_id, source, data_type, value, unit, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      user.organizationId,
      body.patient_id,
      body.source,
      body.data_type,
      body.value,
      body.unit ?? null,
      body.timestamp ?? new Date().toISOString(),
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

// Bulk insert
app.post("/bulk", requireAuth, async (c) => {
  const user = c.get("user");
  const { entries } = (await c.req.json()) as {
    entries: Array<{
      patient_id: string;
      source: string;
      data_type: string;
      value: number;
      unit?: string;
      timestamp?: string;
    }>;
  };
  const db = await createPool(c.env);

  const inserted = await Promise.all(
    entries.map((e) =>
      db.query(
        `INSERT INTO wearable_data (organization_id, patient_id, source, data_type, value, unit, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          user.organizationId,
          e.patient_id,
          e.source,
          e.data_type,
          e.value,
          e.unit ?? null,
          e.timestamp ?? new Date().toISOString(),
        ],
      ),
    ),
  );

  return c.json({ data: inserted.map((r) => r.rows[0]) }, 201);
});

export { app as wearablesRoutes };
