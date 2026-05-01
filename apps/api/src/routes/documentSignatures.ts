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

// POST /api/document-signatures/:id/send-for-signature
// Generate signing token + send WhatsApp to patient
app.post("/:id/send-for-signature", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const db = createPool(c.env);

  const doc = await db.query(
    `SELECT id, document_id, document_title, signer_name, signer_id FROM document_signatures WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (!doc.rows.length) return c.json({ error: "Documento não encontrado" }, 404);
  const row = doc.rows[0] as Record<string, unknown>;

  // Token expires in 48h
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.query(
    `UPDATE document_signatures SET signing_token = $1, signing_token_expires_at = $2 WHERE id = $3`,
    [token, expiresAt.toISOString(), id],
  ).catch(async () => {
    // Column might not exist yet — try adding it
    await db.query(
      `ALTER TABLE document_signatures ADD COLUMN IF NOT EXISTS signing_token TEXT,
       ADD COLUMN IF NOT EXISTS signing_token_expires_at TIMESTAMPTZ`,
    );
    await db.query(
      `UPDATE document_signatures SET signing_token = $1, signing_token_expires_at = $2 WHERE id = $3`,
      [token, expiresAt.toISOString(), id],
    );
  });

  const baseUrl = c.env.PAGES_URL ?? "https://fisioflow.pages.dev";
  const signingUrl = `${baseUrl}/assinar/${token}`;

  // Try sending via WhatsApp if patient has a phone on record
  if (row.signer_id) {
    const patientRes = await db.query(
      `SELECT phone FROM patients WHERE id = $1 LIMIT 1`,
      [row.signer_id],
    ).catch(() => ({ rows: [] }));
    const phone = (patientRes.rows[0] as any)?.phone;
    if (phone) {
      const { WhatsAppService } = await import("../lib/whatsapp");
      const wa = new WhatsAppService(c.env);
      await wa
        .sendTextMessage(
          phone,
          `Olá${row.signer_name ? " " + row.signer_name : ""}! O documento "${row.document_title}" está aguardando sua assinatura eletrônica.\n\nAcesse o link para assinar: ${signingUrl}\n\n(Válido por 48 horas)`,
        )
        .catch(() => {});
    }
  }

  return c.json({ data: { signingUrl, expiresAt: expiresAt.toISOString() } });
});

// GET /api/document-signatures/sign/:token — Public, no auth needed
app.get("/sign/:token", async (c) => {
  const { token } = c.req.param();
  const db = createPool(c.env);

  const result = await db.query(
    `SELECT id, document_id, document_title, document_type, signer_name,
            signing_token_expires_at, signed_at, signature_hash
     FROM document_signatures WHERE signing_token = $1 LIMIT 1`,
    [token],
  ).catch(() => ({ rows: [] }));

  if (!result.rows.length) return c.json({ error: "Link de assinatura inválido ou expirado" }, 404);
  const row = result.rows[0] as Record<string, unknown>;

  if (row.signed_at) {
    return c.json({ error: "Documento já foi assinado", signedAt: row.signed_at }, 409);
  }
  if (row.signing_token_expires_at && new Date() > new Date(String(row.signing_token_expires_at))) {
    return c.json({ error: "Link de assinatura expirado" }, 410);
  }

  return c.json({
    data: {
      id: row.id,
      documentTitle: row.document_title,
      documentType: row.document_type,
      signerName: row.signer_name,
    },
  });
});

// POST /api/document-signatures/sign/:token/confirm — Patient confirms signature (public)
app.post("/sign/:token/confirm", async (c) => {
  const { token } = c.req.param();
  const db = createPool(c.env);

  const result = await db.query(
    `SELECT id, document_id, document_title, signer_name, signing_token_expires_at, signed_at
     FROM document_signatures WHERE signing_token = $1 LIMIT 1`,
    [token],
  ).catch(() => ({ rows: [] }));

  if (!result.rows.length) return c.json({ error: "Link inválido ou expirado" }, 404);
  const row = result.rows[0] as Record<string, unknown>;

  if (row.signed_at) return c.json({ error: "Documento já assinado" }, 409);
  if (row.signing_token_expires_at && new Date() > new Date(String(row.signing_token_expires_at))) {
    return c.json({ error: "Link expirado" }, 410);
  }

  const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "unknown";
  const ua = c.req.header("User-Agent") ?? "unknown";
  const now = new Date().toISOString();

  // SHA-256 hash of document_id + signer + timestamp
  const content = `${row.document_id}:${row.signer_name}:${now}`;
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await db.query(
    `UPDATE document_signatures
     SET signed_at = $1, signature_hash = $2, ip_address = $3, user_agent = $4
     WHERE id = $5`,
    [now, hash, ip, ua, row.id],
  );

  return c.json({ success: true, data: { signedAt: now, hash } });
});

export { app as documentSignaturesRoutes };
