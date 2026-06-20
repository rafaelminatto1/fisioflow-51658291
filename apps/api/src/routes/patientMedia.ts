/**
 * Patient Media — exames, fotos clínicas e vídeos curtos
 *
 * Todos os arquivos ficam no R2 `fisioflow-exams` (PRIVADO).
 * Acesso sempre via presigned URLs geradas sob demanda (15min TTL).
 * Fotos são servidas via Cloudflare Images API (resize + WebP/AVIF automático).
 *
 * Estrutura R2:
 *   {orgId}/{patientId}/exams/{uuid}.{ext}
 *   {orgId}/{patientId}/photos/{uuid}.{ext}
 *   {orgId}/{patientId}/videos/{uuid}.{ext}
 *   {orgId}/{patientId}/medical-requests/{uuid}.{ext}
 *
 * Rotas:
 *   POST   /api/patient-media/upload-url                    — presigned PUT para qualquer tipo
 *   GET    /api/patient-media/access-url/*                  — presigned GET (15min)
 *   GET    /api/patient-media/image/*?w=400&h=400&fit=cover — serve imagem otimizada (Images API)
 *
 *   GET    /api/patient-media/:patientId/photos         — listar fotos
 *   POST   /api/patient-media/:patientId/photos         — registrar metadados após upload
 *   DELETE /api/patient-media/:patientId/photos/:id     — deletar foto + R2
 *
 *   GET    /api/patient-media/:patientId/videos         — listar vídeos
 *   POST   /api/patient-media/:patientId/videos         — registrar metadados após upload
 *   DELETE /api/patient-media/:patientId/videos/:id     — deletar vídeo + R2
 *
 *   GET    /api/patient-media/:patientId/medical-requests         — listar pedidos
 *   POST   /api/patient-media/:patientId/medical-requests         — registrar pedido
 *   PATCH  /api/patient-media/:patientId/medical-requests/:id     — atualizar status
 *   DELETE /api/patient-media/:patientId/medical-requests/:id     — deletar
 */
import { Hono } from "hono";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const EXAMS_BUCKET = "fisioflow-exams";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const ALLOWED_DOC_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const ALL_ALLOWED = { ...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOC_TYPES };

// Max sizes: imagens 20MB, vídeos 200MB, docs 50MB
const MAX_SIZE: Record<string, number> = {
  photo: 20 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  medical_request: 50 * 1024 * 1024,
  exam: 50 * 1024 * 1024,
};

function makeS3(env: Env) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// ─── Presigned PUT — frontend faz upload direto para R2 ──────────────────────

app.post("/upload-url", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as {
    patientId: string;
    mediaType: "photo" | "video" | "medical_request" | "exam";
    contentType: string;
    fileSize?: number;
    fileName?: string;
  };

  const { patientId, mediaType, contentType, fileSize, fileName } = body;

  if (!patientId || !mediaType || !contentType) {
    return c.json({ error: "patientId, mediaType e contentType são obrigatórios" }, 400);
  }

  if (!ALL_ALLOWED[contentType]) {
    return c.json(
      { error: "Tipo de arquivo não suportado", allowed: Object.keys(ALL_ALLOWED) },
      400,
    );
  }

  if (fileSize && fileSize > (MAX_SIZE[mediaType] ?? 50 * 1024 * 1024)) {
    return c.json({ error: `Arquivo excede o limite para ${mediaType}` }, 400);
  }

  const ext = ALL_ALLOWED[contentType];
  const uuid = crypto.randomUUID();
  const folderMap = {
    photo: "photos",
    video: "videos",
    medical_request: "medical-requests",
    exam: "exams",
  };
  const r2Key = `${user.organizationId}/${patientId}/${folderMap[mediaType]}/${uuid}${ext}`;

  const s3 = makeS3(c.env);
  const command = new PutObjectCommand({
    Bucket: EXAMS_BUCKET,
    Key: r2Key,
    ContentType: contentType,
    ContentLength: fileSize,
    // Metadados embutidos no objeto R2
    Metadata: {
      "org-id": user.organizationId,
      "patient-id": patientId,
      "media-type": mediaType,
      "uploaded-by": user.uid,
      "original-name": encodeURIComponent(fileName ?? uuid),
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return c.json({
    data: {
      uploadUrl,
      r2Key,
      expiresIn: 3600,
      mediaType,
    },
  });
});

// ─── Presigned GET — gera URL temporária de acesso (15min) ───────────────────

app.get("/access-url/*", requireAuth, async (c) => {
  const user = c.get("user");
  // Extract everything after /access-url/
  const r2Key = c.req.path.replace(/^.*\/access-url\//, "");

  if (!r2Key) return c.json({ error: "r2Key é obrigatório" }, 400);

  // Segurança: o key deve começar com o orgId do usuário
  if (!r2Key.startsWith(`${user.organizationId}/`)) {
    return c.json({ error: "Acesso negado" }, 403);
  }

  const s3 = makeS3(c.env);
  const command = new GetObjectCommand({ Bucket: EXAMS_BUCKET, Key: r2Key });
  const url = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min

  return c.json({ url, expiresIn: 900 });
});

// ─── Serve de imagem otimizado via Cloudflare Images API ─────────────────────
// GET /api/patient-media/image/{orgId}/{patientId}/photos/{uuid}.jpg?w=400&h=400&fit=cover
// Lê direto do R2 (sem presigned URL) e transforma inline — sem URL pública exposta.
// Accept: image/avif → AVIF  |  image/webp → WebP  |  fallback → JPEG

app.get("/image/*", requireAuth, async (c) => {
  const user = c.get("user");
  const r2Key = c.req.path.replace(/^.*\/image\//, "");

  if (!r2Key) return c.json({ error: "r2Key inválido" }, 400);
  if (!r2Key.startsWith(`${user.organizationId}/`)) return c.json({ error: "Acesso negado" }, 403);

  const bucket = c.env.EXAMS_BUCKET;
  if (!bucket) return c.json({ error: "Storage não configurado" }, 503);

  const object = await bucket.get(r2Key);
  if (!object) return c.json({ error: "Arquivo não encontrado" }, 404);

  // Se não temos Images API ou o arquivo é um PDF/vídeo, streaming direto
  const mime = object.httpMetadata?.contentType ?? "application/octet-stream";
  const isImage = mime.startsWith("image/");

  if (!isImage || !c.env.IMAGES) {
    const headers = new Headers();
    headers.set("Content-Type", mime);
    headers.set("Cache-Control", "private, max-age=900"); // 15min cache no browser
    if (object.size) headers.set("Content-Length", String(object.size));
    return new Response(object.body, { headers });
  }

  // Parâmetros de transformação
  const w = parseInt(c.req.query("w") ?? "0") || undefined;
  const h = parseInt(c.req.query("h") ?? "0") || undefined;
  const fit = (c.req.query("fit") ?? "cover") as "cover" | "contain" | "scale-down";
  const q = parseInt(c.req.query("q") ?? "85");
  const blur = parseInt(c.req.query("blur") ?? "0") || undefined;

  // Formato automático por Accept header
  const accept = c.req.header("Accept") ?? "";
  const outFormat: "image/avif" | "image/webp" | "image/jpeg" = /image\/avif/.test(accept)
    ? "image/avif"
    : /image\/webp/.test(accept)
      ? "image/webp"
      : "image/jpeg";

  try {
    const transformOpts: Record<string, unknown> = { fit, quality: q };
    if (w) transformOpts.width = w;
    if (h) transformOpts.height = h;
    if (blur) transformOpts.blur = blur;

    const transformed = await c.env.IMAGES.input(object.body as ReadableStream)
      .transform(transformOpts as any)
      .output({ format: outFormat, quality: q });

    const res = transformed.response();
    // Cache privado de 1h na borda, 15min no browser
    res.headers.set("Cache-Control", "private, max-age=900, s-maxage=3600");
    res.headers.set("Vary", "Accept");
    return res;
  } catch (err) {
    console.error("[PatientMedia] Images transform failed:", err);
    // Fallback: streaming direto sem transformação
    const object2 = await bucket.get(r2Key);
    if (!object2) return c.json({ error: "Arquivo não encontrado" }, 404);
    return new Response(object2.body, {
      headers: { "Content-Type": mime, "Cache-Control": "private, max-age=900" },
    });
  }
});

// ─── FOTOS ────────────────────────────────────────────────────────────────────

app.get("/:patientId/photos", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const { series_id, photo_type } = c.req.query();
  const pool = createPool(c.env);

  let sql = `SELECT * FROM patient_photos
             WHERE patient_id = $1 AND organization_id = $2`;
  const params: unknown[] = [patientId, user.organizationId];

  if (series_id) {
    sql += ` AND series_id = $${params.push(series_id)}`;
  }
  if (photo_type) {
    sql += ` AND photo_type = $${params.push(photo_type)}`;
  }
  sql += " ORDER BY created_at DESC";

  const res = await pool.query(sql, params);
  return c.json({ data: res.rows });
});

app.post("/:patientId/photos", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const pool = createPool(c.env);

  if (!body.r2_key) return c.json({ error: "r2_key é obrigatório" }, 400);
  if (!String(body.r2_key).startsWith(`${user.organizationId}/${patientId}/`)) {
    return c.json({ error: "r2_key inválido" }, 400);
  }

  const res = await pool.query(
    `INSERT INTO patient_photos
       (patient_id, organization_id, professional_id, photo_type, r2_key, file_name,
        file_size, mime_type, session_id, body_region, side, notes, tags, series_id, series_order,
        comparison_group_title)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      patientId,
      user.organizationId,
      user.uid,
      body.photo_type ?? "clinical",
      body.r2_key,
      body.file_name ?? null,
      body.file_size ?? null,
      body.mime_type ?? "image/jpeg",
      body.session_id ?? null,
      body.body_region ?? null,
      body.side ?? null,
      body.notes ?? null,
      body.tags ?? [],
      body.series_id ?? null,
      body.series_order ?? 1,
      body.comparison_group_title ?? null,
    ],
  );
  return c.json({ data: res.rows[0] }, 201);
});

app.delete("/:patientId/photos/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId, id } = c.req.param();
  const pool = createPool(c.env);

  const check = await pool.query(
    "SELECT r2_key FROM patient_photos WHERE id=$1 AND patient_id=$2 AND organization_id=$3",
    [id, patientId, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: "Foto não encontrada" }, 404);

  const r2Key = check.rows[0].r2_key as string;
  await pool.query("DELETE FROM patient_photos WHERE id=$1", [id]);

  // Remove do R2
  try {
    const s3 = makeS3(c.env);
    await s3.send(new DeleteObjectCommand({ Bucket: EXAMS_BUCKET, Key: r2Key }));
  } catch (e) {
    console.warn("[PatientMedia] R2 delete failed for photo:", r2Key, e);
  }

  return c.json({ ok: true });
});

// ─── VÍDEOS ───────────────────────────────────────────────────────────────────

app.get("/:patientId/videos", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const { video_type } = c.req.query();
  const pool = createPool(c.env);

  let sql = `SELECT * FROM patient_videos
             WHERE patient_id = $1 AND organization_id = $2`;
  const params: unknown[] = [patientId, user.organizationId];
  if (video_type) {
    sql += ` AND video_type = $${params.push(video_type)}`;
  }
  sql += " ORDER BY created_at DESC";

  const res = await pool.query(sql, params);
  return c.json({ data: res.rows });
});

app.post("/:patientId/videos", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const pool = createPool(c.env);

  if (!body.r2_key) return c.json({ error: "r2_key é obrigatório" }, 400);
  if (!String(body.r2_key).startsWith(`${user.organizationId}/${patientId}/`)) {
    return c.json({ error: "r2_key inválido" }, 400);
  }

  const res = await pool.query(
    `INSERT INTO patient_videos
       (patient_id, organization_id, professional_id, video_type, r2_key, file_name,
        file_size, mime_type, duration_seconds, session_id, body_region, notes, tags,
        thumbnail_r2_key, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      patientId,
      user.organizationId,
      user.uid,
      body.video_type ?? "clinical",
      body.r2_key,
      body.file_name ?? null,
      body.file_size ?? null,
      body.mime_type ?? "video/mp4",
      body.duration_seconds ?? null,
      body.session_id ?? null,
      body.body_region ?? null,
      body.notes ?? null,
      body.tags ?? [],
      body.thumbnail_r2_key ?? null,
      "ready",
    ],
  );
  return c.json({ data: res.rows[0] }, 201);
});

app.delete("/:patientId/videos/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId, id } = c.req.param();
  const pool = createPool(c.env);

  const check = await pool.query(
    "SELECT r2_key, thumbnail_r2_key FROM patient_videos WHERE id=$1 AND patient_id=$2 AND organization_id=$3",
    [id, patientId, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: "Vídeo não encontrado" }, 404);

  const { r2_key, thumbnail_r2_key } = check.rows[0];
  await pool.query("DELETE FROM patient_videos WHERE id=$1", [id]);

  const s3 = makeS3(c.env);
  const toDelete = [r2_key, thumbnail_r2_key].filter(Boolean) as string[];
  await Promise.all(
    toDelete.map((key) =>
      s3
        .send(new DeleteObjectCommand({ Bucket: EXAMS_BUCKET, Key: key }))
        .catch((e) => console.warn("[PatientMedia] R2 delete failed for video:", key, e)),
    ),
  );

  return c.json({ ok: true });
});

// ─── PEDIDOS MÉDICOS ──────────────────────────────────────────────────────────

app.get("/:patientId/medical-requests", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const pool = createPool(c.env);

  const res = await pool.query(
    `SELECT * FROM medical_requests
     WHERE patient_id = $1 AND organization_id = $2
     ORDER BY created_at DESC`,
    [patientId, user.organizationId],
  );
  return c.json({ data: res.rows });
});

app.post("/:patientId/medical-requests", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const pool = createPool(c.env);

  const res = await pool.query(
    `INSERT INTO medical_requests
       (patient_id, organization_id, professional_id, request_type, title, notes,
        r2_key, file_name, file_size, mime_type, request_date, requested_by, specialty, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      patientId,
      user.organizationId,
      user.uid,
      body.request_type ?? "exam_request",
      body.title ?? null,
      body.notes ?? null,
      body.r2_key ?? null,
      body.file_name ?? null,
      body.file_size ?? null,
      body.mime_type ?? null,
      body.request_date ?? null,
      body.requested_by ?? null,
      body.specialty ?? null,
      body.status ?? "pending",
    ],
  );
  return c.json({ data: res.rows[0] }, 201);
});

app.patch("/:patientId/medical-requests/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId, id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const pool = createPool(c.env);

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of [
    "title",
    "notes",
    "status",
    "r2_key",
    "file_name",
    "file_size",
    "mime_type",
    "request_date",
    "requested_by",
    "specialty",
  ] as const) {
    if (key in body) {
      fields.push(`${key} = $${values.push(body[key])}`);
    }
  }
  if (!fields.length) return c.json({ error: "Nenhum campo para atualizar" }, 400);
  fields.push(`updated_at = NOW()`);

  const res = await pool.query(
    `UPDATE medical_requests SET ${fields.join(", ")}
     WHERE id = $${values.push(id)} AND patient_id = $${values.push(patientId)} AND organization_id = $${values.push(user.organizationId)}
     RETURNING *`,
    values,
  );
  if (!res.rows.length) return c.json({ error: "Pedido não encontrado" }, 404);
  return c.json({ data: res.rows[0] });
});

app.delete("/:patientId/medical-requests/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId, id } = c.req.param();
  const pool = createPool(c.env);

  const check = await pool.query(
    "SELECT r2_key FROM medical_requests WHERE id=$1 AND patient_id=$2 AND organization_id=$3",
    [id, patientId, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: "Pedido não encontrado" }, 404);

  const r2Key = check.rows[0].r2_key as string | null;
  await pool.query("DELETE FROM medical_requests WHERE id=$1", [id]);

  if (r2Key) {
    try {
      const s3 = makeS3(c.env);
      await s3.send(new DeleteObjectCommand({ Bucket: EXAMS_BUCKET, Key: r2Key }));
    } catch (e) {
      console.warn("[PatientMedia] R2 delete failed for medical-request:", r2Key, e);
    }
  }

  return c.json({ ok: true });
});

export { app as patientMediaRoutes };
