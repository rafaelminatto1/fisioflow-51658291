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

// POST /api/biomechanics/:id/sign — Lock and sign the assessment
app.post("/:id/sign", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createDb(c.env);

  // Check if already signed
  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(
      and(
        eq(biomechanicsAssessments.id, id),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    );

  if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);
  if (assessment.status === 'signed') return c.json({ error: "Avaliação já está assinada" }, 409);

  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const now = new Date().toISOString();
  
  // Create Signature Metadata (Simulating ICP-Brasil)
  const signatureMetadata = {
    signerId: user.uid,
    signerName: user.email || "Therapist",
    timestamp: now,
    ip,
    userAgent: c.req.header("User-Agent") || "unknown",
    // SHA-256 of the assessment content to ensure integrity
    contentHash: await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(assessment.analysisData))
    ).then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""))
  };

  const [updated] = await db
    .update(biomechanicsAssessments)
    .set({
      status: 'signed',
      analysisData: {
        ...(assessment.analysisData as object),
        _signature: signatureMetadata
      } as any,
      updatedAt: new Date(),
    })
    .where(eq(biomechanicsAssessments.id, id))
    .returning();

  return c.json({ success: true, data: updated });
});

// GET /api/biomechanics/:id/verify — Verify the integrity of a signed report
app.get("/:id/verify", async (c) => {
  const id = c.req.param("id");
  const db = await createDb(c.env);

  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(eq(biomechanicsAssessments.id, id));

  if (!assessment) return c.json({ error: "Relatório não encontrado" }, 404);
  if (assessment.status !== 'signed') return c.json({ valid: false, error: "Relatório não está assinado" });

  const analysisData = assessment.analysisData as any;
  const signature = analysisData?._signature;

  if (!signature) return c.json({ valid: false, error: "Metadados de assinatura ausentes" });

  // Re-calculate hash to verify integrity
  const dataToHash = { ...analysisData };
  delete dataToHash._signature;

  const currentHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(dataToHash))
  ).then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""));

  const isValid = currentHash === signature.contentHash;

  return c.json({
    valid: isValid,
    signer: signature.signerName,
    signedAt: signature.timestamp,
    integrityStatus: isValid ? "verified" : "compromised"
  });
});

export { app as biomechanicsRoutes };
