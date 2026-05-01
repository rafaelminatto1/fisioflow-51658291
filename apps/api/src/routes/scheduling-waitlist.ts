import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import {
  emptyData,
  mapWaitlistRow,
  normalizeWaitlistPayload,
  mapWaitlistOfferRow,
  parseStringArray,
} from "./scheduling-helpers";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/waitlist", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const { status, priority } = c.req.query();
    const params: unknown[] = [user.organizationId];
    let idx = 2;
    let sql = "SELECT * FROM waitlist WHERE organization_id = $1";

    if (status) {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND priority = $${idx++}`;
      params.push(priority);
    }

    sql += " ORDER BY created_at ASC";

    const result = await pool.query(sql, params);
    return c.json({ data: result.rows.map(mapWaitlistRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post("/waitlist", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const normalized = normalizeWaitlistPayload(body);

    if (!normalized.patientId) {
      return c.json({ error: "patient_id é obrigatório" }, 400);
    }

    const result = await pool.query(
      `INSERT INTO waitlist (
        organization_id, patient_id, preferred_days, preferred_periods,
        preferred_therapist_id, priority, status, notes, refusal_count,
        offered_slot, offered_at, offer_expires_at, updated_at
      )
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [
        user.organizationId,
        normalized.patientId,
        normalized.preferredDays,
        normalized.preferredPeriods,
        normalized.preferredTherapistId,
        normalized.priority,
        normalized.status,
        normalized.notes,
        normalized.refusalCount,
        normalized.offeredSlot,
        normalized.offeredAt,
        normalized.offerExpiresAt,
      ],
    );

    return c.json({ data: mapWaitlistRow(result.rows[0]) }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/waitlist/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const allowed = [
      "preferred_days",
      "preferred_periods",
      "preferred_therapist_id",
      "priority",
      "status",
      "notes",
      "refusal_count",
      "offered_slot",
      "offered_at",
      "offer_expires_at",
    ] as const;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (!(key in body)) continue;

      let value = body[key];
      if (key === "preferred_days" || key === "preferred_periods") {
        value = JSON.stringify(parseStringArray(value));
        sets.push(`${key} = $${idx++}::jsonb`);
      } else {
        sets.push(`${key} = $${idx++}`);
      }
      params.push(value);
    }

    if (!sets.length) {
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    sets.push("updated_at = NOW()");
    params.push(id, user.organizationId);

    const result = await pool.query(
      `UPDATE waitlist
       SET ${sets.join(", ")}
       WHERE id = $${idx++} AND organization_id = $${idx++}
       RETURNING *`,
      params,
    );

    if (!result.rows[0]) {
      return c.json({ error: "Entrada da lista de espera não encontrada" }, 404);
    }

    return c.json({ data: mapWaitlistRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/waitlist/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await pool.query("DELETE FROM waitlist WHERE id = $1 AND organization_id = $2", [
      id,
      user.organizationId,
    ]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/waitlist-offers", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const { waitlistId } = c.req.query();
    const params: unknown[] = [user.organizationId];
    let sql = "SELECT * FROM waitlist_offers WHERE organization_id = $1";
    if (waitlistId) {
      sql += " AND waitlist_id = $2";
      params.push(waitlistId);
    }
    sql += " ORDER BY created_at DESC";

    const result = await pool.query(sql, params);
    return c.json({ data: result.rows.map(mapWaitlistOfferRow) });
  } catch {
    return c.json(emptyData());
  }
});

app.post("/waitlist-offers", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  try {
    const body = await c.req.json();
    const waitlistId = String(body.waitlist_id ?? "").trim();
    const offeredSlot = String(body.offered_slot ?? "").trim();

    if (!waitlistId || !offeredSlot) {
      return c.json({ error: "waitlist_id e offered_slot são obrigatórios" }, 400);
    }

    const result = await pool.query(
      `INSERT INTO waitlist_offers (
        organization_id, waitlist_id, offered_slot, response, status,
        expiration_time, responded_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        user.organizationId,
        waitlistId,
        offeredSlot,
        body.response ?? "pending",
        body.status ?? "pending",
        body.expiration_time ?? null,
        body.responded_at ?? null,
      ],
    );

    return c.json({ data: mapWaitlistOfferRow(result.rows[0]) }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/waitlist-offers/:id/respond", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const response = body.response ?? body.status ?? "pending";
    const result = await pool.query(
      `UPDATE waitlist_offers
       SET response = $1,
           status = $2,
           responded_at = COALESCE($3, NOW()),
           updated_at = NOW()
       WHERE id = $4 AND organization_id = $5
       RETURNING *`,
      [response, body.status ?? response, body.responded_at ?? null, id, user.organizationId],
    );

    if (!result.rows[0]) {
      return c.json({ error: "Oferta não encontrada" }, 404);
    }

    return c.json({ data: mapWaitlistOfferRow(result.rows[0]) });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export { app as waitlistRoutes };
