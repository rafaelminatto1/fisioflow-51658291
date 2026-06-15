import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { getRawSql } from "../../lib/db";
import { isUuid } from "../../lib/validators";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const HomeExerciseShareSchema = z.object({
  exerciseId: z.string().uuid(),
  metrics: z.object({
    rom: z.number().optional(),
    reps: z.number().optional(),
    compensations: z.array(z.string()).default([]),
    feedback: z.string().optional(),
  }),
  videoBase64: z.string().optional(), // In a real scenario, we might use multipart/form-data
});

/**
 * POST /api/clinical/home-exercises/share
 * Salva e compartilha exercícios feitos em casa com o fisioterapeuta.
 */
app.post("/share", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));

  const validation = HomeExerciseShareSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: "Dados inválidos", details: validation.error.format() }, 400);
  }

  const { exerciseId, metrics, videoBase64 } = validation.data;
  const sql = getRawSql(c.env, "write");

  try {
    // 1. Upload clipe para R2 se fornecido
    let videoUrl = null;
    if (videoBase64 && c.env.MEDIA_BUCKET) {
      const key = `home-exercises/${user.uid}/${Date.now()}.mp4`;
      const buffer = Buffer.from(videoBase64, "base64");

      await c.env.MEDIA_BUCKET.put(key, buffer, {
        httpMetadata: { contentType: "video/mp4" },
      });

      videoUrl = `${c.env.R2_PUBLIC_URL}/${key}`;
    }

    // 2. Persistir no Neon
    const result = await sql`
      INSERT INTO patient_home_exercises (
        organization_id,
        patient_id,
        exercise_id,
        metrics,
        video_clipe_url,
        status
      ) VALUES (
        ${user.organizationId}::uuid,
        (SELECT id FROM patients WHERE auth_id = ${user.uid}::uuid),
        ${exerciseId}::uuid,
        ${JSON.stringify(metrics)}::jsonb,
        ${videoUrl},
        'shared'
      ) RETURNING id;
    `;

    return c.json({
      success: true,
      id: result.rows[0].id,
      message: "Exercício compartilhado com sucesso!",
    });
  } catch (error: any) {
    console.error("[HomeExercise/Share] Error:", error);
    return c.json({ error: "Erro ao compartilhar exercício", details: error.message }, 500);
  }
});

/**
 * GET /api/clinical/home-exercises/patient/:patientId
 * Lista exercícios compartilhados de um paciente específico (para o profissional).
 */
app.get("/patient/:patientId", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("patientId");

  if (!isUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);

  try {
    const sql = getRawSql(c.env, "read");
    const results = await sql`
      SELECT 
        phe.id,
        phe.exercise_id as "exerciseId",
        e.name as "exerciseName",
        phe.metrics,
        phe.video_clipe_url as "videoUrl",
        phe.created_at as "createdAt"
      FROM patient_home_exercises phe
      JOIN exercises e ON e.id = phe.exercise_id
      WHERE phe.patient_id = ${patientId}::uuid
        AND phe.organization_id = ${user.organizationId}::uuid
        AND phe.status = 'shared'
      ORDER BY phe.created_at DESC
      LIMIT 20;
    `;

    return c.json({
      success: true,
      data: results.rows,
    });
  } catch (error: any) {
    console.error("[HomeExercise/List] Error:", error);
    return c.json({ error: "Erro ao buscar histórico domiciliar" }, 500);
  }
});

export { app as homeExerciseRoutes };
