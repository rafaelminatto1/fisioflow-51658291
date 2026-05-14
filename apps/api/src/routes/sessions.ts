import { Hono } from "hono";
import { createDb } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { sessions, sessionAttachments, sessionTemplates, patients } from "@fisioflow/db";
import { eq, and, desc, count, sql, or, ilike } from "drizzle-orm";
import { withTenant } from "../lib/db-utils";
import { invalidatePatientCache } from "../lib/ai-context-cache";
import { processClinicalEmbedding } from "../lib/ai/embeddings";
import { triggerFiscalCycleNotification } from "../lib/fiscal/notificationTrigger";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== HELPERS =====

/** Texto único para embedding/IA (observação clínica) */
function extractEvolutionText(row: any): string {
  return typeof row.observacao === "string" ? row.observacao : "";
}

/** Verifica se uma string é um UUID válido */
function isValidUuid(val: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/** Coerção segura de array para JSONB (procedures/exercises/measurements/homeExercises) */
function toJsonArray(val: unknown): any[] | undefined {
  if (val === undefined) return undefined;
  if (val === null) return [];
  return Array.isArray(val) ? val : [];
}

/** Coerção segura de pain_scale (0-10) */
function toPainScale(val: unknown): number | null | undefined {
  if (val === undefined) return undefined;
  if (val === null || val === "") return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n)));
}

/** Plain-text snippet a partir do HTML da observação (para preview/timeline) */
function observacaoPreview(html: unknown, max = 200): string {
  if (typeof html !== "string" || !html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

type DbSessionStatus = "draft" | "finalized" | "cancelled";

const SESSION_STATUS_ALIASES: Record<string, DbSessionStatus> = {
  draft: "draft",
  rascunho: "draft",
  finalized: "finalized",
  finalizado: "finalized",
  completed: "finalized",
  complete: "finalized",
  concluido: "finalized",
  "concluído": "finalized",
  signed: "finalized",
  cancelled: "cancelled",
  canceled: "cancelled",
  cancelado: "cancelled",
  cancelada: "cancelled",
};

function normalizeSessionStatusInput(value: unknown): DbSessionStatus | null | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return null;
  return SESSION_STATUS_ALIASES[value.trim().toLowerCase()] ?? null;
}

/** Mapeia linha do Drizzle (camelCase) para o shape do frontend (snake_case) */
function rowToRecord(row: any) {
  return {
    id: row.id,
    patient_id: row.patientId,
    appointment_id: row.appointmentId ?? undefined,
    session_number: row.sessionNumber != null ? Number(row.sessionNumber) : undefined,
    observacao: typeof row.observacao === "string" ? row.observacao : "",
    pain_scale: row.painScale ?? null,
    procedures: Array.isArray(row.procedures) ? row.procedures : [],
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    measurements: Array.isArray(row.measurements) ? row.measurements : [],
    home_exercises: Array.isArray(row.homeExercises) ? row.homeExercises : [],
    status: (row.status as string) ?? "draft",
    duration_minutes: row.duration ?? undefined,
    last_auto_save_at: row.lastAutoSaveAt ? new Date(row.lastAutoSaveAt).toISOString() : undefined,
    finalized_at: row.finalizedAt ? new Date(row.finalizedAt).toISOString() : undefined,
    finalized_by: row.finalizedBy ? String(row.finalizedBy) : undefined,
    record_date: row.date
      ? new Date(row.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    created_by: row.therapistId ? String(row.therapistId) : undefined,
    created_at: new Date(row.createdAt).toISOString(),
    updated_at: new Date(row.updatedAt).toISOString(),
    signed_at: row.finalizedAt ? new Date(row.finalizedAt).toISOString() : undefined,
    is_edited: row.isEdited,
    last_edited_by: row.lastEditedBy ? String(row.lastEditedBy) : undefined,
    edit_reason: row.editReason ?? undefined,
  };
}

// ===== LISTA =====
app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const { patientId, status, appointmentId, limit = "20", offset = "0" } = c.req.query();

  if (!patientId) return c.json({ error: "patientId é obrigatório" }, 400);
  if (!isValidUuid(patientId)) return c.json({ error: "patientId inválido" }, 400);
  if (appointmentId && !isValidUuid(appointmentId))
    return c.json({ error: "appointmentId inválido" }, 400);

  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
  const offsetNum = Math.max(0, parseInt(offset) || 0);

  try {
    const conditions: any[] = [
      withTenant(sessions, user.organizationId, eq(sessions.patientId, patientId)),
    ];

    if (status) {
      conditions.push(eq(sessions.status, status as any));
    }
    if (appointmentId) {
      conditions.push(eq(sessions.appointmentId, appointmentId));
    }

    const whereClause = and(...conditions);

    const [dataRes, countRes] = await Promise.all([
      db
        .select()
        .from(sessions)
        .where(whereClause)
        .orderBy(desc(sessions.date))
        .limit(limitNum)
        .offset(offsetNum),
      db.select({ total: count() }).from(sessions).where(whereClause),
    ]);

    return c.json({
      data: dataRes.map(rowToRecord),
      total: countRes[0]?.total ?? 0,
    });
  } catch (error: any) {
    return c.json({ error: "Erro ao listar sessões", details: error.message }, 500);
  }
});

// ===== AUTOSAVE =====
app.post("/autosave", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const body = (await c.req.json()) as Record<string, any>;

  const patientId = String(body.patient_id ?? "").trim();
  if (!patientId) return c.json({ error: "patient_id é obrigatório" }, 400);

  const observacao = typeof body.observacao === "string" ? body.observacao : undefined;
  const painScale = toPainScale(body.pain_scale);
  const procedures = toJsonArray(body.procedures);
  const exercises = toJsonArray(body.exercises);
  const measurements = toJsonArray(body.measurements);
  const homeExercises = toJsonArray(body.home_exercises);
  const durationNum = body.duration_minutes != null ? Number(body.duration_minutes) : undefined;

  const buildUpdatePayload = () => {
    const payload: any = {
      lastAutoSaveAt: new Date(),
      updatedAt: new Date(),
    };
    if (observacao !== undefined) payload.observacao = observacao;
    if (painScale !== undefined) payload.painScale = painScale;
    if (procedures !== undefined) payload.procedures = procedures;
    if (exercises !== undefined) payload.exercises = exercises;
    if (measurements !== undefined) payload.measurements = measurements;
    if (homeExercises !== undefined) payload.homeExercises = homeExercises;
    if (durationNum !== undefined) payload.duration = durationNum;
    if (body.therapist_id && isValidUuid(String(body.therapist_id))) {
      payload.therapistId = String(body.therapist_id);
    }
    return payload;
  };

  const idToUpdate = body.recordId || body.id;
  if (idToUpdate) {
    // Check if finalized before update to set isEdited flag
    const [existingSession] = await db
      .select({ status: sessions.status })
      .from(sessions)
      .where(withTenant(sessions, user.organizationId, eq(sessions.id, idToUpdate)))
      .limit(1);

    const payload = buildUpdatePayload();
    if (existingSession?.status === "finalized") {
      payload.isEdited = true;
      payload.lastEditedBy = user.uid as any;
    }

    const res = await db
      .update(sessions)
      .set(payload)
      .where(withTenant(sessions, user.organizationId, eq(sessions.id, idToUpdate)))
      .returning();

    if (res.length) {
      return c.json({ data: { ...rowToRecord(res[0]), isNew: false } });
    }
  }

  if (body.appointment_id) {
    const existing = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        withTenant(
          sessions,
          user.organizationId,
          eq(sessions.appointmentId, body.appointment_id),
          eq(sessions.status, "draft"),
        ),
      )
      .limit(1);

    if (existing.length) {
      const res = await db
        .update(sessions)
        .set(buildUpdatePayload())
        .where(eq(sessions.id, existing[0].id))
        .returning();

      if (res.length) {
        return c.json({ data: { ...rowToRecord(res[0]), isNew: false } });
      }
    }
  }

  const recordDate = body.record_date ? new Date(String(body.record_date)) : new Date();

  const insertValues: any = {
    patientId,
    appointmentId: body.appointment_id || null,
    therapistId: (body.therapist_id && isValidUuid(String(body.therapist_id)))
      ? String(body.therapist_id)
      : isValidUuid(user.uid) ? user.uid : (null as any),
    organizationId: user.organizationId,
    date: recordDate,
    duration: durationNum || null,
    observacao: observacao ?? null,
    painScale: painScale ?? null,
    procedures: procedures ?? [],
    exercises: exercises ?? [],
    measurements: measurements ?? [],
    homeExercises: homeExercises ?? [],
    status: "draft",
    lastAutoSaveAt: new Date(),
  };

  const [newSession] = await db.insert(sessions).values(insertValues).returning();

  return c.json({ data: { ...rowToRecord(newSession), isNew: true } }, 201);
});

// ===== DETALHE =====
app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID é obrigatório" }, 400);
  if (!isValidUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const [row] = await db
    .select()
    .from(sessions)
    .where(withTenant(sessions, user.organizationId, eq(sessions.id, id)))
    .limit(1);

  if (!row) return c.json({ error: "Sessão não encontrada" }, 404);
  return c.json({ data: rowToRecord(row) });
});

// ===== FINALIZAR =====
app.post("/:id/finalize", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID é obrigatório" }, 400);
  if (!isValidUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const [row] = await db
    .update(sessions)
    .set({
      status: "finalized",
      finalizedAt: new Date(),
      finalizedBy: user.uid as any,
      updatedAt: new Date(),
    })
    .where(
      withTenant(
        sessions,
        user.organizationId,
        eq(sessions.id, id),
        sql`${sessions.status} != 'finalized'`,
      ),
    )
    .returning();

  if (!row) return c.json({ error: "Sessão não encontrada ou já finalizada" }, 404);

  if (row.patientId) {
    c.executionCtx.waitUntil(
      Promise.all([
        invalidatePatientCache(c.env, row.patientId),
        processClinicalEmbedding(
          c.env,
          user.organizationId,
          row.patientId,
          row.id,
          extractEvolutionText(row),
        ),
      ]).catch(() => {}),
    );

    // Trigger SessionSummaryWorkflow to generate SOAP summary and send WhatsApp
    if (c.env.WORKFLOW_SESSION_SUMMARY) {
      c.env.WORKFLOW_SESSION_SUMMARY.create({
        id: `session-summary-${row.id}`,
        params: {
          sessionId: row.id,
          patientId: row.patientId,
          orgId: user.organizationId,
        },
      }).catch((err) => {
        console.warn("[sessions/finalize] Could not start SessionSummaryWorkflow:", err?.message);
      });
    }

    // New: Fiscal Notification Trigger (on every 10th session)
    c.executionCtx.waitUntil(
      (async () => {
        try {
          // Count finalized sessions for this patient
          const [countResult] = await db
            .select({ total: count() })
            .from(sessions)
            .where(
              and(
                eq(sessions.patientId, row.patientId!),
                eq(sessions.status, "finalized"),
                eq(sessions.organizationId, user.organizationId as any),
              ),
            );

          const total = Number(countResult?.total || 0);

          if (total > 0 && total % 10 === 0) {
            // Get patient name for the notification
            const [patientRow] = await db
              .select({ fullName: patients.fullName })
              .from(patients)
              .where(eq(patients.id, row.patientId!))
              .limit(1);

            await triggerFiscalCycleNotification(
              c.env,
              user.organizationId,
              row.patientId!,
              patientRow?.fullName || "Paciente",
              total,
            );
          }
        } catch (err) {
          console.error("[FiscalTrigger] Failed to process milestone check:", err);
        }
      })(),
    );
  }
  return c.json({ data: rowToRecord(row) });
});

// ===== CRIAR =====
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const body = (await c.req.json()) as Record<string, any>;

  const patientId = String(body.patient_id ?? "").trim();
  if (!patientId) return c.json({ error: "patient_id é obrigatório" }, 400);
  if (!isValidUuid(patientId)) return c.json({ error: "patient_id inválido" }, 400);

  const recordDate = body.record_date ? new Date(String(body.record_date)) : new Date();
  const status = normalizeSessionStatusInput(body.status);
  if (status === null) return c.json({ error: "Status inválido" }, 400);

  const insertValues: any = {
    patientId,
    appointmentId: body.appointment_id || null,
    therapistId: isValidUuid(user.uid) ? user.uid : (null as any),
    organizationId: user.organizationId,
    date: recordDate,
    duration: body.duration_minutes != null ? Number(body.duration_minutes) : null,
    observacao: typeof body.observacao === "string" ? body.observacao : null,
    painScale: toPainScale(body.pain_scale) ?? null,
    procedures: toJsonArray(body.procedures) ?? [],
    exercises: toJsonArray(body.exercises) ?? [],
    measurements: toJsonArray(body.measurements) ?? [],
    homeExercises: toJsonArray(body.home_exercises) ?? [],
    status: (status as any) ?? "draft",
    finalizedAt: status === "finalized" ? new Date() : null,
    finalizedBy: status === "finalized" && isValidUuid(user.uid) ? user.uid : null,
  };

  const [newSession] = await db.insert(sessions).values(insertValues).returning();

  // Indexar no D1 para timeline edge (fire-and-forget)
  if (c.env.DB) {
    const preview = observacaoPreview(body.observacao);
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `INSERT OR REPLACE INTO evolution_index (id, patient_id, appointment_id, therapist_id, organization_id, preview_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
        .bind(
          newSession.id,
          patientId,
          body.appointment_id ?? null,
          user.uid,
          user.organizationId,
          preview,
        )
        .run(),
    );
  }

  c.executionCtx.waitUntil(invalidatePatientCache(c.env, patientId).catch(() => {}));

  return c.json({ data: rowToRecord(newSession) }, 201);
});

// ===== ATUALIZAR =====
app.put("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID é obrigatório" }, 400);
  if (!isValidUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const body = (await c.req.json()) as Record<string, any>;

  const updatePayload: any = {
    updatedAt: new Date(),
  };

  if ("observacao" in body) {
    updatePayload.observacao = typeof body.observacao === "string" ? body.observacao : null;
  }
  if ("pain_scale" in body) {
    updatePayload.painScale = toPainScale(body.pain_scale) ?? null;
  }
  if ("procedures" in body) updatePayload.procedures = toJsonArray(body.procedures) ?? [];
  if ("exercises" in body) updatePayload.exercises = toJsonArray(body.exercises) ?? [];
  if ("measurements" in body) updatePayload.measurements = toJsonArray(body.measurements) ?? [];
  if ("home_exercises" in body) updatePayload.homeExercises = toJsonArray(body.home_exercises) ?? [];
  if (body.duration_minutes != null) updatePayload.duration = Number(body.duration_minutes);
  if ("status" in body) {
    const status = normalizeSessionStatusInput(body.status);
    if (status === null) return c.json({ error: "Status inválido" }, 400);
    if (status !== undefined) {
      updatePayload.status = status as any;
      if (status === "finalized") {
        updatePayload.finalizedAt = new Date();
        updatePayload.finalizedBy = isValidUuid(user.uid) ? user.uid : null;
      }
    }
  }

  // Check if finalized before update to set isEdited flag
  const [existingSession] = await db
    .select({ status: sessions.status })
    .from(sessions)
    .where(withTenant(sessions, user.organizationId, eq(sessions.id, id)))
    .limit(1);

  if (existingSession?.status === "finalized" && !("status" in body && body.status === "finalized")) {
    updatePayload.isEdited = true;
    updatePayload.lastEditedBy = user.uid as any;
  }

  const [updated] = await db
    .update(sessions)
    .set(updatePayload)
    .where(withTenant(sessions, user.organizationId, eq(sessions.id, id)))
    .returning();

  if (!updated) return c.json({ error: "Sessão não encontrada" }, 404);

  // Atualizar índice no D1 (fire-and-forget)
  if (c.env.DB && "observacao" in body) {
    const preview = observacaoPreview(body.observacao);
    const patientIdForIndex = updated.patientId;
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `INSERT OR REPLACE INTO evolution_index (id, patient_id, appointment_id, therapist_id, organization_id, preview_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
        .bind(
          id,
          patientIdForIndex,
          updated.appointmentId ?? null,
          user.uid,
          user.organizationId,
          preview,
        )
        .run(),
    );
  }

  if (updated.patientId) {
    c.executionCtx.waitUntil(invalidatePatientCache(c.env, updated.patientId).catch(() => {}));
  }

  return c.json({ data: rowToRecord(updated) });
});

// ===== EXCLUIR =====
app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "ID é obrigatório" }, 400);
  if (!isValidUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const [existing] = await db
    .select({ status: sessions.status, patientId: sessions.patientId })
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.organizationId, user.organizationId)))
    .limit(1);

  if (!existing) return c.json({ error: "Sessão não encontrada" }, 404);
  if (existing.status === "finalized") {
    return c.json({ error: "Não é possível excluir uma evolução finalizada" }, 409);
  }

  await db
    .update(sessions)
    .set({ deletedAt: new Date() })
    .where(withTenant(sessions, user.organizationId, eq(sessions.id, id)));

  if (existing.patientId) {
    c.executionCtx.waitUntil(invalidatePatientCache(c.env, existing.patientId).catch(() => {}));
  }

  return c.json({ success: true });
});

// ===== TEMPLATES =====
app.get("/templates", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const { search } = c.req.query();

  const conditions = [
    or(
      eq(sessionTemplates.organizationId, user.organizationId),
      eq(sessionTemplates.isGlobal, true),
    ),
  ];

  if (search) {
    conditions.push(
      or(
        ilike(sessionTemplates.name, `%${search}%`),
        ilike(sessionTemplates.description, `%${search}%`),
      ),
    );
  }

  const results = await db
    .select()
    .from(sessionTemplates)
    .where(and(...conditions))
    .orderBy(desc(sessionTemplates.createdAt));

  return c.json({
    data: results.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category ?? null,
      body_html: t.bodyHtml ?? "",
      is_global: t.isGlobal,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    })),
  });
});

app.post("/templates", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const body = (await c.req.json()) as any;

  if (!body.name) return c.json({ error: "Nome é obrigatório" }, 400);

  const insertValues: any = {
    organizationId: user.organizationId,
    therapistId: user.uid as any,
    name: body.name,
    description: body.description || null,
    category: body.category || null,
    bodyHtml: typeof body.body_html === "string" ? body.body_html : null,
    isGlobal: body.is_global ?? false,
  };

  const [newTemplate] = await db.insert(sessionTemplates).values(insertValues).returning();

  return c.json({ data: newTemplate }, 201);
});

app.put("/templates/:templateId", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const { templateId } = c.req.param();
  const body = (await c.req.json()) as any;

  const updatePayload: any = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) updatePayload.name = body.name;
  if (body.description !== undefined) updatePayload.description = body.description;
  if (body.category !== undefined) updatePayload.category = body.category;
  if (body.body_html !== undefined) updatePayload.bodyHtml = body.body_html;
  if (body.is_global !== undefined) updatePayload.isGlobal = body.is_global;

  const [updated] = await db
    .update(sessionTemplates)
    .set(updatePayload)
    .where(
      and(
        eq(sessionTemplates.id, templateId),
        eq(sessionTemplates.organizationId, user.organizationId),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: "Template não encontrado" }, 404);
  return c.json({ data: updated });
});

app.delete("/templates/:templateId", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const { templateId } = c.req.param();

  const [deleted] = await db
    .update(sessionTemplates)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(sessionTemplates.id, templateId),
        eq(sessionTemplates.organizationId, user.organizationId),
      ),
    )
    .returning();

  if (!deleted) return c.json({ error: "Template não encontrado" }, 404);
  return c.json({ success: true });
});

// ===== ANEXOS =====
app.get("/:id/attachments", requireAuth, async (c) => {
  const db = createDb(c.env);
  const id = c.req.param("id");
  if (!isValidUuid(id)) return c.json({ error: "ID inválido" }, 400);

  const results = await db
    .select()
    .from(sessionAttachments)
    .where(eq(sessionAttachments.sessionId, id))
    .orderBy(desc(sessionAttachments.uploadedAt));

  return c.json({
    data: results.map((a) => ({
      id: a.id,
      file_name: a.fileName,
      original_name: a.originalName,
      file_url: a.fileUrl,
      thumbnail_url: a.thumbnailUrl,
      file_type: a.fileType,
      mime_type: a.mimeType,
      category: a.category,
      size_bytes: a.sizeBytes,
      description: a.description,
      uploaded_at: a.uploadedAt,
    })),
  });
});

app.post("/:id/attachments", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const id = c.req.param("id");
  if (!isValidUuid(id)) return c.json({ error: "ID inválido" }, 400);
  const body = (await c.req.json()) as any;

  if (!body.file_url) return c.json({ error: "file_url é obrigatório" }, 400);

  const [session] = await db
    .select({ patientId: sessions.patientId })
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.organizationId, user.organizationId)))
    .limit(1);

  if (!session) return c.json({ error: "Sessão não encontrada" }, 404);

  const fileTypeMap: Record<string, string> = {
    "image/jpeg": "image",
    "image/png": "image",
    "image/gif": "image",
    "image/webp": "image",
    "application/pdf": "pdf",
    "video/mp4": "video",
    "video/webm": "video",
  };
  const mime = String(body.mime_type ?? "");
  const fileType = (fileTypeMap[mime] ?? "other") as any;

  const insertValues: any = {
    sessionId: id,
    patientId: session.patientId,
    fileName: body.file_name || "unnamed",
    originalName: body.original_name || body.file_name || null,
    fileUrl: body.file_url,
    thumbnailUrl: body.thumbnail_url || null,
    fileType: fileType,
    mimeType: mime || null,
    category: body.category || "other",
    sizeBytes: body.size_bytes != null ? Number(body.size_bytes) : null,
    description: body.description || null,
    uploadedBy: user.uid as any,
  };

  const [newAttachment] = await db.insert(sessionAttachments).values(insertValues).returning();

  return c.json({ data: newAttachment }, 201);
});

app.delete("/:id/attachments/:attachmentId", requireAuth, async (c) => {
  const db = createDb(c.env);
  const id = c.req.param("id");
  const attachmentId = c.req.param("attachmentId");

  const [deleted] = await db
    .delete(sessionAttachments)
    .where(and(eq(sessionAttachments.id, attachmentId), eq(sessionAttachments.sessionId, id)))
    .returning();

  if (!deleted) return c.json({ error: "Anexo não encontrado" }, 404);
  return c.json({ success: true, file_url: deleted.fileUrl });
});

export { app as sessionsRoutes };
