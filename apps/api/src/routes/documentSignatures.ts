import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const { documentId } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT id, document_id, document_type, document_title, signer_name, signer_id,
               signature_hash, ip_address, user_agent, signed_at, created_at
             FROM document_signatures`;
  const params: unknown[] = [];

  if (documentId) {
    sql += ` WHERE document_id = $1`;
    params.push(documentId);
  }
  sql += " ORDER BY signed_at DESC";

  const result = await db.query(sql, params);
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.post("/", requireAuth, async (c) => {
  const body = await c.req.json();
  const db = await createPool(c.env);

  // Capture metadata from request
  const ipAddress = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? null;
  const userAgent = c.req.header("User-Agent") ?? null;

  const result = await db.query(
    `INSERT INTO document_signatures
       (document_id, document_type, document_title, signer_name, signer_id,
        signature_image, signature_hash, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      body.document_id,
      body.document_type,
      body.document_title,
      body.signer_name,
      body.signer_id ?? null,
      body.signature_image,
      body.signature_hash,
      ipAddress,
      userAgent,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

// Verify signature by hash
app.get("/verify", async (c) => {
  const { documentId, hash } = c.req.query();
  if (!documentId || !hash) return c.json({ error: "documentId and hash required" }, 400);

  const db = await createPool(c.env);
  const result = await db.query(
    `SELECT id, document_id, document_type, document_title, signer_name, signer_id,
       signature_hash, signed_at, created_at
     FROM document_signatures WHERE document_id = $1 AND signature_hash = $2 LIMIT 1`,
    [documentId, hash],
  );

  const valid = result.rowCount !== null && result.rowCount > 0;
  return c.json({ data: { valid, signature: valid ? result.rows[0] : null } });
});

export { app as documentSignaturesRoutes };
