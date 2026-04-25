import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createDb, createPool } from "../lib/db";
import type { Env } from "../types/env";
import { mediaGallery, exerciseMediaAttachments, mediaTypeEnum } from "@fisioflow/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Tipos suportados
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
};

// ===== GALLERY MANAGEMENT =====

// Listar mídia da galeria
app.get("/gallery", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get("user");
    const folder = c.req.query("folder");
    const type = c.req.query("type");

    let query = db
      .select()
      .from(mediaGallery)
      .where(eq(mediaGallery.organizationId, user.organizationId));

    const filters = [eq(mediaGallery.organizationId, user.organizationId)];
    if (folder) filters.push(eq(mediaGallery.folder, folder));
    if (type) filters.push(eq(mediaGallery.type, type as any));

    const rows = await db
      .select()
      .from(mediaGallery)
      .where(and(...filters))
      .orderBy(desc(mediaGallery.createdAt));

    return c.json({ data: rows });
  } catch (error: any) {
    console.error("[Media/Gallery] Error:", error.message);
    return c.json({ error: "Falha ao listar galeria" }, 500);
  }
});

// Listar pastas únicas
app.get("/gallery/folders", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get("user");

    const rows = await db
      .select({ folder: mediaGallery.folder })
      .from(mediaGallery)
      .where(eq(mediaGallery.organizationId, user.organizationId))
      .groupBy(mediaGallery.folder);

    return c.json({ data: rows.map((r) => r.folder) });
  } catch (error: any) {
    console.error("[Media/Folders] Error:", error.message);
    return c.json({ error: "Falha ao listar pastas" }, 500);
  }
});

// Registrar nova mídia na galeria
app.post("/gallery", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get("user");
    const body = await c.req.json();

    const [row] = await db
      .insert(mediaGallery)
      .values({
        ...body,
        organizationId: user.organizationId,
      })
      .returning();

    return c.json({ data: row }, 201);
  } catch (error: any) {
    console.error("[Media/GallerySave] Error:", error.message);
    return c.json({ error: "Falha ao salvar mídia na galeria" }, 500);
  }
});

// Remover da galeria
app.delete("/gallery/:id", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get("user");
    const { id } = c.req.param();

    const [row] = await db
      .delete(mediaGallery)
      .where(and(eq(mediaGallery.id, id), eq(mediaGallery.organizationId, user.organizationId)))
      .returning();

    if (!row) return c.json({ error: "Mídia não encontrada" }, 404);

    return c.json({ ok: true });
  } catch (error: any) {
    console.error("[Media/GalleryDelete] Error:", error.message);
    return c.json({ error: "Falha ao excluir mídia da galeria" }, 500);
  }
});

// ===== EXERCISE ATTACHMENTS =====

// Listar mídia de um exercício
app.get("/exercise/:exerciseId", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const { exerciseId } = c.req.param();

    const rows = await db
      .select()
      .from(exerciseMediaAttachments)
      .where(eq(exerciseMediaAttachments.exerciseId, exerciseId))
      .orderBy(exerciseMediaAttachments.orderIndex);

    return c.json({ data: rows });
  } catch (error: any) {
    console.error("[Media/ExerciseList] Error:", error.message);
    return c.json({ error: "Falha ao listar mídias do exercício" }, 500);
  }
});

// Anexar mídia ao exercício
app.post("/exercise/:exerciseId", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const { exerciseId } = c.req.param();
    const body = await c.req.json();

    const [row] = await db
      .insert(exerciseMediaAttachments)
      .values({
        ...body,
        exerciseId,
      })
      .returning();

    return c.json({ data: row }, 201);
  } catch (error: any) {
    console.error("[Media/ExerciseAttach] Error:", error.message);
    return c.json({ error: "Falha ao anexar mídia" }, 500);
  }
});

// Atualizar anexo (reordenação ou legenda)
app.put("/exercise/attachment/:id", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const { id } = c.req.param();
    const body = await c.req.json();

    const [row] = await db
      .update(exerciseMediaAttachments)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(exerciseMediaAttachments.id, id))
      .returning();

    return c.json({ data: row });
  } catch (error: any) {
    console.error("[Media/ExerciseUpdate] Error:", error.message);
    return c.json({ error: "Falha ao atualizar anexo" }, 500);
  }
});

// Desanexar
app.delete("/exercise/attachment/:id", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const { id } = c.req.param();

    await db.delete(exerciseMediaAttachments).where(eq(exerciseMediaAttachments.id, id));

    return c.json({ ok: true });
  } catch (error: any) {
    console.error("[Media/ExerciseDetach] Error:", error.message);
    return c.json({ error: "Falha ao desanexar mídia" }, 500);
  }
});

// ===== ROTA DE UPLOAD LEGADA (Pre-Signed URL) =====
app.post("/upload-url", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { contentType, folder = "uploads" } = body;

    if (!contentType || !ALLOWED_TYPES[contentType]) {
      return c.json(
        {
          error: "Tipo de arquivo não suportado",
          allowed: Object.keys(ALLOWED_TYPES),
        },
        400,
      );
    }

    const user = c.get("user");
    const userId = user?.uid || "anonymous";

    // Segurança contra path traversal
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const ext = ALLOWED_TYPES[contentType];
    const timestamp = new Date().toISOString().split("T")[0]; // yyyy-MM-dd
    const keyId = uuidv4();

    // Caminho no bucket: pasta/ano-mes-dia/id_user/uuid.extensão
    const key = `${safeFolder}/${timestamp}/${userId}/${keyId}${ext}`;

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: c.env.R2_ACCESS_KEY_ID,
        secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new PutObjectCommand({
      Bucket: "fisioflow-media",
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 5400 });
    const publicUrl = `${c.env.R2_PUBLIC_URL}/${key}`;

    return c.json({
      data: {
        uploadUrl: signedUrl,
        publicUrl,
        key,
        expiresIn: 5400,
      },
    });
  } catch (error) {
    console.error("[Media] Erro ao gerar upload URL:", error);
    return c.json({ error: "Falha ao gerar URL de upload" }, 500);
  }
});

// ===== ROTA DE EXCLUSÃO DE ARQUIVO LEGADA =====
app.delete("/:key{.*}", requireAuth, async (c) => {
  try {
    const key = c.req.param("key");
    const user = c.get("user");

    if (!key) {
      return c.json({ error: "Chave não informada" }, 400);
    }

    if (!key.includes(`/${user.uid}/`)) {
      return c.json({ error: "Acesso negado para remover este arquivo" }, 403);
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: c.env.R2_ACCESS_KEY_ID,
        secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new DeleteObjectCommand({
      Bucket: "fisioflow-media",
      Key: key,
    });

    await s3Client.send(command);

    return c.json({ ok: true, message: "Arquivo deletado com sucesso" });
  } catch (error) {
    console.error("[Media] Erro ao excluir arquivo:", error);
    return c.json({ error: "Falha ao excluir o arquivo" }, 500);
  }
});

export { app as mediaRoutes };
