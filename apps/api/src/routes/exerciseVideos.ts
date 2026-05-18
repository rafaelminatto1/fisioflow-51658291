/**
 * Exercise Videos Routes — Neon PostgreSQL + Cloudflare Stream
 *
 * GET    /api/exercise-videos               — lista com filtros (category, difficulty, bodyPart, equipment, search)
 * GET    /api/exercise-videos/:id           — vídeo por ID
 * GET    /api/exercise-videos/by-exercise/:exerciseId — vídeos de um exercício
 * POST   /api/exercise-videos               — cria registro de metadados (upload já feito no R2 — legado)
 * PUT    /api/exercise-videos/:id           — atualiza metadados
 * DELETE /api/exercise-videos/:id           — remove registro (limpeza R2 pelo frontend)
 *
 * Stream Bindings (GA 2026-05-07):
 * POST   /api/exercise-videos/upload-url    — cria direct-upload URL (tus); persiste linha com stream_id
 * POST   /api/exercise-videos/stream-webhook — recebe notificação CF Stream (HMAC validado)
 */
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── GET / (lista) ────────────────────────────────────────────────────────────

app.get("/", requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get("user");
  const q = c.req.query();

  const params: unknown[] = [user.organizationId];
  const where: string[] = ["(organization_id = $1 OR organization_id IS NULL)"];

  if (q.category && q.category !== "all") {
    params.push(q.category);
    where.push(`category = $${params.length}`);
  }
  if (q.difficulty && q.difficulty !== "all") {
    params.push(q.difficulty);
    where.push(`difficulty = $${params.length}`);
  }
  if (q.bodyPart && q.bodyPart !== "all") {
    params.push(q.bodyPart);
    where.push(`$${params.length} = ANY(body_parts)`);
  }
  if (q.equipment && q.equipment !== "all") {
    params.push(q.equipment);
    where.push(`$${params.length} = ANY(equipment)`);
  }
  if (q.search) {
    params.push(`%${q.search.toLowerCase()}%`);
    where.push(
      `(LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`,
    );
  }

  const result = await pool.query(
    `SELECT * FROM exercise_videos WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    params,
  );
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

// ─── GET /by-exercise/:exerciseId ─────────────────────────────────────────────

app.get("/by-exercise/:exerciseId", requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { exerciseId } = c.req.param();
  const result = await pool.query(
    "SELECT * FROM exercise_videos WHERE exercise_id = $1 ORDER BY created_at DESC",
    [exerciseId],
  );
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

// ─── GET /:id ──────────────────────────────────────────────────────────────────

app.get("/:id", requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const result = await pool.query("SELECT * FROM exercise_videos WHERE id = $1", [id]);
  if (!result.rows.length) return c.json({ error: "Vídeo não encontrado" }, 404);
  return c.json({ data: result.rows[0] });
});

// ─── POST / (cria metadados após upload R2) ───────────────────────────────────

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const title = String(body.title ?? "").trim();
  const videoUrl = String(body.video_url ?? "").trim();
  if (!title) return c.json({ error: "title é obrigatório" }, 400);
  if (!videoUrl) return c.json({ error: "video_url é obrigatório" }, 400);

  const result = await pool.query(
    `INSERT INTO exercise_videos
       (exercise_id, organization_id, title, description, video_url, thumbnail_url,
        duration, file_size, category, difficulty, body_parts, equipment,
        uploaded_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     RETURNING *`,
    [
      body.exercise_id ?? null,
      user.organizationId,
      title,
      body.description ?? null,
      videoUrl,
      body.thumbnail_url ?? null,
      body.duration ?? null,
      body.file_size ?? 0,
      body.category ?? "fortalecimento",
      body.difficulty ?? "iniciante",
      body.body_parts ?? [],
      body.equipment ?? [],
      user.uid,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

app.put("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];

  const patchable = [
    "title",
    "description",
    "thumbnail_url",
    "duration",
    "category",
    "difficulty",
    "body_parts",
    "equipment",
    "exercise_id",
  ] as const;
  for (const key of patchable) {
    if (body[key] !== undefined) {
      params.push(body[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE exercise_videos SET ${sets.join(", ")}
     WHERE id = $${params.length - 1} AND (organization_id = $${params.length} OR organization_id IS NULL)
     RETURNING *`,
    params,
  );
  if (!result.rows.length) return c.json({ error: "Vídeo não encontrado" }, 404);
  return c.json({ data: result.rows[0] });
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    "DELETE FROM exercise_videos WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL) RETURNING *",
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: "Vídeo não encontrado" }, 404);

  // Cleanup defensivo no Cloudflare Stream — evita órfão (cobra storage por minuto)
  const streamId = (result.rows[0] as any).stream_id;
  if (streamId && c.env.STREAM) {
    try {
      await (c.env.STREAM as any).video(streamId).delete();
    } catch (err) {
      console.warn(`[exerciseVideos] Falha ao deletar Stream video ${streamId}:`, err);
      // não rollback: linha Neon já apagou; órfão Stream pode ser limpado depois
    }
  }
  return c.json({ data: result.rows[0] });
});

// ─── POST /upload-url (Cloudflare Stream direct upload) ──────────────────────
//
// Why: substitui upload manual para R2 por encoding adaptativo + HLS automático.
// Frontend usa tus-js-client (resumable) ou PUT simples contra `uploadURL`.
// O webhook do Stream (`/stream-webhook`) atualiza `stream_status` quando ready.

app.post("/upload-url", requireAuth, async (c) => {
  const user = c.get("user");
  if (!c.env.STREAM) return c.json({ error: "Stream binding não configurado" }, 503);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return c.json({ error: "title é obrigatório" }, 400);

  const exerciseId = body.exercise_id ? String(body.exercise_id) : null;
  const maxDurationSeconds = Math.min(Number(body.max_duration_seconds) || 600, 3600);

  try {
    const upload = await c.env.STREAM.directUpload({
      maxDurationSeconds,
      expiryMinutes: 30,
      creator: user.uid,
      meta: {
        title,
        org_id: user.organizationId,
        ...(exerciseId ? { exercise_id: exerciseId } : {}),
      },
    });

    const pool = await createPool(c.env);
    const result = await pool.query(
      `INSERT INTO exercise_videos
         (exercise_id, organization_id, title, description, video_url,
          stream_id, stream_status, category, difficulty, body_parts, equipment,
          uploaded_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING id, stream_id`,
      [
        exerciseId,
        user.organizationId,
        title,
        body.description ?? null,
        "", // video_url preenchido após ready (Stream playback URL)
        upload.uid,
        "pendingupload",
        body.category ?? "fortalecimento",
        body.difficulty ?? "iniciante",
        body.body_parts ?? [],
        body.equipment ?? [],
        user.uid,
      ],
    );

    return c.json(
      {
        data: {
          id: result.rows[0].id,
          stream_id: upload.uid,
          upload_url: upload.uploadURL,
        },
      },
      201,
    );
  } catch (err: any) {
    console.error("[exerciseVideos] directUpload failed:", err);
    return c.json({ error: "Falha ao criar upload URL", details: err.message }, 500);
  }
});

// ─── POST /stream-webhook (Cloudflare Stream notification) ───────────────────
//
// Why: Stream notifica encoding done/error. Validamos HMAC com STREAM_WEBHOOK_SECRET.
// Payload: { uid, readyToStream, status, thumbnail, playback, duration, meta }

app.post("/stream-webhook", async (c) => {
  const secret = c.env.STREAM_WEBHOOK_SECRET;
  if (!secret) return c.json({ error: "Webhook secret não configurado" }, 503);

  const signatureHeader = c.req.header("Webhook-Signature") ?? "";
  const rawBody = await c.req.text();

  // Formato CF: "time=1234567890,sig1=hex..."
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split("=") as [string, string]),
  );
  const time = parts.time;
  const sig1 = parts.sig1;
  if (!time || !sig1) return c.json({ error: "Assinatura inválida" }, 401);

  // Janela de 5min anti-replay
  if (Math.abs(Date.now() / 1000 - Number(time)) > 300) {
    return c.json({ error: "Timestamp fora da janela" }, 401);
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const computed = await crypto.subtle.sign("HMAC", key, enc.encode(`${time}.${rawBody}`));
  const expected = Array.from(new Uint8Array(computed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected !== sig1) return c.json({ error: "HMAC mismatch" }, 401);

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "JSON inválido" }, 400);
  }

  const uid = payload?.uid;
  if (!uid) return c.json({ error: "uid ausente" }, 400);

  const pool = await createPool(c.env);
  const playbackId = payload?.playback?.hls
    ? String(payload.playback.hls).split("/").slice(-2, -1)[0]
    : null;

  await pool.query(
    `UPDATE exercise_videos
       SET stream_status = $2,
           stream_thumbnail_url = COALESCE($3, stream_thumbnail_url),
           stream_playback_id = COALESCE($4, stream_playback_id),
           stream_duration_seconds = COALESCE($5, stream_duration_seconds),
           video_url = COALESCE(NULLIF($6,''), video_url),
           thumbnail_url = COALESCE($3, thumbnail_url),
           stream_ready_at = CASE WHEN $2 = 'ready' THEN NOW() ELSE stream_ready_at END,
           updated_at = NOW()
     WHERE stream_id = $1`,
    [
      uid,
      payload?.status?.state ?? (payload?.readyToStream ? "ready" : "inprogress"),
      payload?.thumbnail ?? null,
      playbackId,
      payload?.duration ?? null,
      payload?.playback?.hls ?? "",
    ],
  );

  return c.json({ ok: true });
});

export { app as exerciseVideosRoutes };
