import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { getRawSql } from "../../lib/db";
import {
  ICF_CLASSES,
  ICF_CLASS_HINTS,
  ICF_CLASS_LABELS,
  classifyGoal,
} from "../../lib/clinical/goalClassification";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const goalSchema = z.object({
  patientId: z.string().uuid(),
  description: z.string().min(3).max(1000),
  /** Omitido = usa a sugestão da heurística. O profissional pode sobrescrever. */
  icfClass: z.enum(ICF_CLASSES).nullish(),
  targetDate: z.string().date().nullish(),
  priority: z.enum(["baixa", "media", "alta"]).nullish(),
});

/**
 * GET /api/clinical/goals/icf-classes
 * Catálogo com rótulo e exemplo — a UI não deve inventar os seus.
 */
app.get("/goals/icf-classes", requireAuth, (c) =>
  c.json({
    data: ICF_CLASSES.map((value) => ({
      value,
      label: ICF_CLASS_LABELS[value],
      hint: ICF_CLASS_HINTS[value],
    })),
    meta: {
      fundamento:
        "Objetivos de atividade/participação associaram-se a melhor desfecho (OR 1,80) e objetivos vagos a pior evolução da dor — FYSIOPRIM, N=2.591.",
    },
  }),
);

/**
 * POST /api/clinical/goals/classify
 * Classifica sem salvar — permite avisar enquanto o profissional digita.
 */
app.post(
  "/goals/classify",
  requireAuth,
  zValidator("json", z.object({ description: z.string().max(1000) })),
  (c) => c.json({ data: classifyGoal(c.req.valid("json").description) }),
);

/** GET /api/clinical/goals?patientId=... */
app.get("/goals", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.query("patientId");
  if (!patientId) return c.json({ error: "patientId é obrigatório" }, 400);

  try {
    const sql = getRawSql(c.env, "read");
    const result = await sql`
      SELECT id, description, icf_class AS "icfClass", status, priority,
             target_date AS "targetDate", achieved_at AS "achievedAt", created_at AS "createdAt"
      FROM patient_goals
      WHERE organization_id = ${user.organizationId}::uuid
        AND patient_id = ${patientId}::uuid
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    return c.json({ data: result.rows ?? [] });
  } catch (error: any) {
    console.error("[Clinical/Goals] list:", error);
    return c.json({ error: "Falha ao listar objetivos", details: error.message }, 500);
  }
});

/** POST /api/clinical/goals */
app.post("/goals", requireAuth, zValidator("json", goalSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const classification = classifyGoal(body.description);
  const icfClass = body.icfClass ?? classification.suggested;

  try {
    const sql = getRawSql(c.env, "write");
    const result = await sql`
      INSERT INTO patient_goals (
        patient_id, organization_id, description, icf_class, status, priority,
        target_date, created_at, updated_at
      ) VALUES (
        ${body.patientId}::uuid,
        ${user.organizationId}::uuid,
        ${body.description},
        ${icfClass},
        'em_andamento',
        ${body.priority ?? "media"},
        ${body.targetDate ?? null}::timestamp,
        now(), now()
      )
      RETURNING id, description, icf_class AS "icfClass", status, priority, target_date AS "targetDate"
    `;

    return c.json(
      {
        data: result.rows?.[0] ?? null,
        // Devolvido mesmo quando o objetivo é salvo: o aviso é para a próxima
        // conversa com o paciente, não um bloqueio.
        classification,
      },
      201,
    );
  } catch (error: any) {
    console.error("[Clinical/Goals] create:", error);
    return c.json({ error: "Falha ao criar objetivo", details: error.message }, 500);
  }
});

export default app;
