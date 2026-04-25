import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createDb } from "../lib/db";
import { biomechanicsAssessments } from "@fisioflow/db";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Listar avaliações por paciente
app.get("/patient/:patientId", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("patientId");
  const db = await createDb(c.env);

  const results = await db
    .select()
    .from(biomechanicsAssessments)
    .where(
      and(
        eq(biomechanicsAssessments.patientId, patientId),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    )
    .orderBy(desc(biomechanicsAssessments.createdAt));

  return c.json({ data: results });
});

// Criar nova avaliação
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = await createDb(c.env);

  const [newAssessment] = await db
    .insert(biomechanicsAssessments)
    .values({
      patientId: body.patientId,
      organizationId: user.organizationId,
      professionalId: user.uid,
      type: body.type,
      mediaUrl: body.mediaUrl,
      thumbnailUrl: body.thumbnailUrl,
      analysisData: body.analysisData || {},
      observations: body.observations,
      conclusions: body.conclusions,
    })
    .returning();

  return c.json({ data: newAssessment }, 201);
});

// Atualizar avaliação (dados de análise)
app.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = await createDb(c.env);

  const [updated] = await db
    .update(biomechanicsAssessments)
    .set({
      analysisData: body.analysisData,
      observations: body.observations,
      conclusions: body.conclusions,
      status: body.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(biomechanicsAssessments.id, id),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return c.json({ error: "Avaliação não encontrada" }, 404);
  }

  return c.json({ data: updated });
});

// Detalhes de uma avaliação
app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createDb(c.env);

  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(
      and(
        eq(biomechanicsAssessments.id, id),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    );

  if (!assessment) {
    return c.json({ error: "Avaliação não encontrada" }, 404);
  }

  return c.json({ data: assessment });
});

export { app as biomechanicsRoutes };
