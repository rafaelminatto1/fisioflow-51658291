import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const MAX_VERSIONS = 25;

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const { soapRecordId } = c.req.query();
  if (!soapRecordId) return c.json({ error: "soapRecordId required" }, 400);
  try {
    const db = await createPool(c.env);
    const result = await db.query(
      `SELECT * FROM evolution_versions WHERE soap_record_id = $1 ORDER BY saved_at DESC LIMIT $2`,
      [soapRecordId, MAX_VERSIONS],
    );
    return c.json({ data: result.rows || [] });
  } catch (err: any) {
    console.error("[EvolutionVersions/GET] Error:", err?.message, err?.code, err?.detail);
    return c.json({ data: [] });
  }
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  try {
    const body = await c.req.json();
    const soapRecordId = body.soap_record_id ?? body.soapRecordId;

    if (!soapRecordId) {
      return c.json({ error: "soap_record_id é obrigatório" }, 400);
    }

    const db = await createPool(c.env, undefined, "write");

    const result = await db.query(
      `INSERT INTO evolution_versions (soap_record_id, saved_by, change_type, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        soapRecordId,
        body.saved_by ?? user.uid,
        body.change_type ?? body.changeType ?? "auto",
        JSON.stringify(body.content ?? {}),
      ],
    );

    return c.json({ data: result.rows[0] }, 201);
  } catch (err: any) {
    console.error(
      "[EvolutionVersions/POST] Error:",
      err?.message,
      "Code:",
      err?.code,
      "Detail:",
      err?.detail,
      "Hint:",
      err?.hint,
    );
    return c.json(
      {
        error: "Erro ao salvar versão da evolução",
        details: err?.message,
        code: err?.code,
      },
      500,
    );
  }
});

export { app as evolutionVersionsRoutes };
