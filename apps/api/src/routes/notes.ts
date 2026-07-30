import { Hono, type Context } from "hono";
import { and, arrayContains, desc, eq, gt, ilike, isNull, or, sql } from "drizzle-orm";
import {
  noteAuditLogs,
  noteAttachments,
  noteComments,
  noteFavorites,
  noteMentions,
  notePermissions,
  noteRelations,
  noteRevisions,
  noteTasks,
  notes,
  appointments,
  patients,
  sessions,
} from "@fisioflow/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createDb, createPool } from "../lib/db";
import { withTenant } from "../lib/db-utils";
import { DEFAULT_TIMEOUTS } from "../lib/dbWrapper";
import { isUuid } from "../lib/validators";
import { extractRequestContext, writeAuditLog } from "../lib/auditLog";
import { searchAiSearch } from "../lib/cloudflareAiSearch";
import { readAiText, runAi } from "../lib/ai-native";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
type NotesContext = Context<{ Bindings: Env; Variables: AuthVariables }>;

type Capability =
  | "view"
  | "comment"
  | "edit_content"
  | "edit_properties"
  | "share"
  | "export"
  | "publish"
  | "manage_permissions"
  | "delete";

const CAPABILITIES: Capability[] = [
  "view",
  "comment",
  "edit_content",
  "edit_properties",
  "share",
  "export",
  "publish",
  "manage_permissions",
  "delete",
];

const NOTE_TYPES = new Set([
  "personal",
  "team",
  "patient_context",
  "appointment",
  "meeting",
  "clinical_protocol",
  "operational",
  "template",
]);

const NOTE_CLASSIFICATIONS = new Set(["private", "team", "operational", "clinical"]);
const NOTE_SENSITIVITIES = new Set([
  "internal",
  "patient_personal",
  "clinical_sensitive",
  "restricted",
]);
const NOTE_STATUSES = new Set(["draft", "active", "under_review", "archived"]);
const ACCESS_ROLES = new Set(["owner", "editor", "commenter", "viewer", "no_access"]);
const SUPPORTED_PERMISSION_SUBJECTS = new Set(["user", "role", "organization"]);
const SHAREABLE_ROLES = new Set(["admin", "fisioterapeuta", "estagiario", "recepcionista", "owner", "parceiro"]);
const SUPPORTED_MENTION_TYPES = new Set(["patient", "profile", "task", "appointment", "session", "note"]);
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ATTACHMENT_CONTENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

function normalizeNote(row: typeof notes.$inferSelect) {
  return {
    ...row,
    id: String(row.id),
    organization_id: String(row.organizationId),
    patient_id: row.patientId ? String(row.patientId) : null,
    appointment_id: row.appointmentId ? String(row.appointmentId) : null,
    session_id: row.sessionId ? String(row.sessionId) : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function isCapability(value: unknown): value is Capability {
  return typeof value === "string" && CAPABILITIES.includes(value as Capability);
}

function setVersionHeader(c: NotesContext, note: typeof notes.$inferSelect) {
  c.header("ETag", `\"${note.metadataVersion}\"`);
}

function safeAttachmentName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180) || "anexo";
}

/** Allowlist conservadora para HTML que pode sair da API/portal/exportação. */
export function sanitizeNoteHtml(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value
    .replace(/<\/?(script|style|iframe|object|embed|form|base|link|meta)[^>]*>/gi, "")
    .replace(/\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src|action)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .slice(0, 100_000);
}

function textAsSafeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character)).replace(/\n/g, "<br />");
}

function enqueueSemanticIndex(c: NotesContext, noteId: string) {
  const user = c.get("user");
  const queue = c.env.BACKGROUND_QUEUE;
  if (!queue) return;
  c.executionCtx.waitUntil(
    queue.send({ type: "INDEX_NOTE_SEMANTIC", payload: { noteId, organizationId: user.organizationId } }).catch((error) => {
      console.error("[notes] unable to enqueue semantic index", error);
    }),
  );
}

function permissionSubjectConditions(user: AuthVariables["user"]) {
  return [
    and(eq(notePermissions.subjectType, "user"), eq(notePermissions.subjectId, user.uid)),
    and(
      eq(notePermissions.subjectType, "organization"),
      eq(notePermissions.subjectId, user.organizationId),
    ),
    ...[user.role, ...(user.roles ?? [])].filter(Boolean).map((role) =>
      and(eq(notePermissions.subjectType, "role"), eq(notePermissions.subjectId, role!)),
    ),
  ];
}

async function loadNoteForCapability(
  c: NotesContext,
  noteId: string,
  capability: Capability,
) {
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const [note] = await db
    .select()
    .from(notes)
    .where(withTenant(notes, user.organizationId, eq(notes.id, noteId)))
    .limit(1);

  if (!note) return null;
  if (note.ownerId === user.uid) return note;

  const now = new Date();
  const [permission] = await db
    .select({ id: notePermissions.id })
    .from(notePermissions)
    .where(
      and(
        eq(notePermissions.organizationId, user.organizationId),
        eq(notePermissions.noteId, noteId),
        or(...permissionSubjectConditions(user)),
        isNull(notePermissions.revokedAt),
        or(isNull(notePermissions.expiresAt), gt(notePermissions.expiresAt, now)),
        arrayContains(notePermissions.capabilities, [capability]),
      ),
    )
    .limit(1);

  return permission ? note : null;
}

async function auditNote(
  c: NotesContext,
  noteId: string,
  action:
    | "note.create"
    | "note.create_from_appointment"
    | "note.create_from_session"
    | "note.view"
    | "note.update"
    | "note.archive"
    | "note.permission_change"
    | "note.revision_create"
    | "note.revision_view"
    | "note.mention_create"
    | "note.task_link"
    | "note.task_create"
    | "note.comment_create"
    | "note.comment_status_change"
    | "note.permission_revoke"
    | "note.attachment_upload"
    | "note.attachment_download"
    | "note.attachment_delete"
    | "note.ai.request"
    | "note.revision_restore"
    | "note.portal_publish"
    | "note.portal_revoke"
    | "note.export",
  outcome: "allowed" | "denied" = "allowed",
) {
  const user = c.get("user");
  const request = extractRequestContext(c);
  const db = createDb(c.env);
  await db.insert(noteAuditLogs).values({
    noteId,
    organizationId: user.organizationId,
    actorId: user.uid,
    action,
    outcome,
    requestId: c.req.header("X-Request-ID") ?? null,
    ipAddress: request.ipAddress ?? null,
    userAgent: request.userAgent ?? null,
  });
  writeAuditLog(
    c.env,
    {
      action,
      entityId: noteId,
      entityType: "note",
      userId: user.uid,
      organizationId: user.organizationId,
      ...request,
      metadata: { outcome },
    },
    c.executionCtx,
  );
}

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const patientId = c.req.query("patientId") ?? c.req.query("patient_id");
  if (patientId && !isUuid(patientId)) return c.json({ error: "Paciente inválido" }, 400);

  const owned = await db
    .select()
    .from(notes)
    .where(
      withTenant(
        notes,
        user.organizationId,
        and(eq(notes.ownerId, user.uid), patientId ? eq(notes.patientId, patientId) : undefined),
      ),
    )
    .orderBy(desc(notes.updatedAt));

  const shared = await db
    .select({ note: notes })
    .from(notePermissions)
    .innerJoin(notes, eq(notePermissions.noteId, notes.id))
    .where(
      and(
        eq(notePermissions.organizationId, user.organizationId),
        or(...permissionSubjectConditions(user)),
        isNull(notePermissions.revokedAt),
        or(isNull(notePermissions.expiresAt), gt(notePermissions.expiresAt, new Date())),
        arrayContains(notePermissions.capabilities, ["view"]),
        isNull(notes.deletedAt),
        patientId ? eq(notes.patientId, patientId) : undefined,
      ),
    )
    .orderBy(desc(notes.updatedAt));

  const rows = [...owned, ...shared.map((item) => item.note)];
  const deduplicated = [...new Map(rows.map((note) => [note.id, note])).values()];
  return c.json({ data: deduplicated.map(normalizeNote) });
});

app.get("/search", requireAuth, async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  if (query.length < 2) return c.json({ data: [] });
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const term = `%${query.slice(0, 120)}%`;
  const candidates = await db.select().from(notes).where(withTenant(notes, user.organizationId, or(ilike(notes.title, term), ilike(notes.contentText, term)))).orderBy(desc(notes.updatedAt)).limit(40);
  const permitted = (await Promise.all(candidates.map(async (note) => (await loadNoteForCapability(c, note.id, "view")) ? note : null))).filter((note): note is typeof notes.$inferSelect => Boolean(note));
  return c.json({ data: permitted.map(normalizeNote) });
});

/** Busca vetorial segura: o índice só recebe notas não clínicas e a ACL é reavaliada aqui. */
app.get("/semantic-search", requireAuth, async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  if (query.length < 3) return c.json({ data: [] });
  const user = c.get("user");
  if (!c.env.AI_SEARCH) return c.json({ data: [], unavailable: true });
  try {
    const { sources } = await searchAiSearch(c.env, {
      query: query.slice(0, 500),
      maxNumResults: 12,
      // `folder` é um filtro nativo do AI Search para documentos armazenados
      // como `notes/<id>.md`; a ACL ainda é reavaliada em cada resultado.
      filters: {
        folder: { $gte: "notes/", $lt: "notes0" },
        organization_id: user.organizationId,
      },
      retrievalType: "hybrid",
    });
    const candidates = await Promise.all(sources.map(async (source) => {
      const noteId = typeof source.metadata.note_id === "string" ? source.metadata.note_id : "";
      if (!isUuid(noteId) || !(await loadNoteForCapability(c, noteId, "view"))) return null;
      return { id: noteId, title: String(source.metadata.title ?? source.filename), preview: source.content.slice(0, 240), score: source.score };
    }));
    return c.json({ data: candidates.filter((item): item is NonNullable<typeof item> => Boolean(item)) });
  } catch (error) {
    console.error("[notes] semantic search failed", error);
    return c.json({ error: "Busca semântica indisponível" }, 503);
  }
});

/**
 * Catálogo seguro para o autocomplete de @. O cliente nunca recebe entidades
 * de outro tenant e notas são filtradas novamente pela ACL do recurso.
 */
app.get("/mentionables", requireAuth, async (c) => {
  const query = (c.req.query("q") ?? "").trim();
  if (query.length < 2) return c.json({ data: [] });
  const requested = (c.req.query("types") ?? "patient,profile,task,appointment,session,note")
    .split(",")
    .filter((type) => SUPPORTED_MENTION_TYPES.has(type));
  const types = requested.length ? requested : [...SUPPORTED_MENTION_TYPES];
  const user = c.get("user");
  const term = `%${query.slice(0, 120)}%`;
  const db = createDb(c.env, "read");
  const raw = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");
  const results: Array<{ id: string; type: string; label: string; subtitle?: string }> = [];

  if (types.includes("patient")) {
    const rows = await db.select({ id: patients.id, label: patients.fullName }).from(patients)
      .where(withTenant(patients, user.organizationId, ilike(patients.fullName, term))).limit(10);
    results.push(...rows.map((row) => ({ id: row.id, type: "patient", label: row.label })));
  }
  if (types.includes("profile")) {
    const rows = await raw.query(
      `SELECT id::text, COALESCE(full_name, name, email, 'Membro da equipe') AS label, role
       FROM profiles WHERE organization_id = $1 AND is_active IS NOT FALSE
         AND (COALESCE(full_name, name, email, '') ILIKE $2) LIMIT 10`,
      [user.organizationId, term],
    );
    results.push(...(rows.rows ?? []).map((row: any) => ({ id: String(row.id), type: "profile", label: String(row.label), subtitle: row.role ? String(row.role) : undefined })));
  }
  if (types.includes("task")) {
    const rows = await raw.query(
      `SELECT id::text, titulo AS label, status AS subtitle FROM tarefas
       WHERE organization_id = $1 AND deleted_at IS NULL AND titulo ILIKE $2 LIMIT 10`,
      [user.organizationId, term],
    );
    results.push(...(rows.rows ?? []).map((row: any) => ({ id: String(row.id), type: "task", label: String(row.label), subtitle: row.subtitle ? String(row.subtitle) : undefined })));
  }
  if (types.includes("appointment")) {
    const rows = await raw.query(
      `SELECT a.id::text, ('Agendamento · ' || a.date::text || ' · ' || p.full_name) AS label, a.status AS subtitle
       FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE a.organization_id = $1 AND p.organization_id = $1 AND p.deleted_at IS NULL
         AND (p.full_name ILIKE $2 OR a.date::text ILIKE $2) LIMIT 10`,
      [user.organizationId, term],
    );
    results.push(...(rows.rows ?? []).map((row: any) => ({ id: String(row.id), type: "appointment", label: String(row.label), subtitle: row.subtitle ? String(row.subtitle) : undefined })));
  }
  if (types.includes("session")) {
    const rows = await raw.query(
      `SELECT s.id::text, ('Evolução · ' || s.date::date::text || ' · ' || p.full_name) AS label, s.status AS subtitle
       FROM sessions s JOIN patients p ON p.id = s.patient_id
       WHERE s.organization_id = $1 AND p.organization_id = $1 AND p.deleted_at IS NULL
         AND (p.full_name ILIKE $2 OR s.date::date::text ILIKE $2) LIMIT 10`,
      [user.organizationId, term],
    );
    results.push(...(rows.rows ?? []).map((row: any) => ({ id: String(row.id), type: "session", label: String(row.label), subtitle: row.subtitle ? String(row.subtitle) : undefined })));
  }
  if (types.includes("note")) {
    const candidates = await db.select().from(notes)
      .where(withTenant(notes, user.organizationId, ilike(notes.title, term))).orderBy(desc(notes.updatedAt)).limit(20);
    const permitted = (await Promise.all(candidates.map(async (note) => (await loadNoteForCapability(c, note.id, "view")) ? note : null)))
      .filter((note): note is typeof notes.$inferSelect => Boolean(note));
    results.push(...permitted.map((note) => ({ id: note.id, type: "note", label: note.title, subtitle: "Nota" })));
  }
  return c.json({ data: results.slice(0, 30) });
});

/** IDs das favoritas ainda visíveis ao usuário; ACL é reavaliada por nota. */
app.get("/favorites", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const rows = await db.select({ noteId: noteFavorites.noteId }).from(noteFavorites)
    .where(withTenant(noteFavorites, user.organizationId, eq(noteFavorites.userId, user.uid)));
  const visible = await Promise.all(rows.map(async ({ noteId }) => (await loadNoteForCapability(c, noteId, "view")) ? noteId : null));
  return c.json({ data: visible.filter((noteId): noteId is string => Boolean(noteId)) });
});

app.put("/:id/favorite", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  if (!(await loadNoteForCapability(c, id, "view"))) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env);
  await db.insert(noteFavorites).values({ organizationId: user.organizationId, noteId: id, userId: user.uid }).onConflictDoNothing();
  return c.json({ ok: true });
});

app.delete("/:id/favorite", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  if (!(await loadNoteForCapability(c, id, "view"))) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env);
  await db.delete(noteFavorites).where(withTenant(noteFavorites, user.organizationId, and(eq(noteFavorites.noteId, id), eq(noteFavorites.userId, user.uid))));
  return c.json({ ok: true });
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const patientId = body.patientId ?? body.patient_id ?? null;
  if (patientId && !isUuid(patientId)) return c.json({ error: "Paciente inválido" }, 400);
  if (body.type && !NOTE_TYPES.has(body.type)) return c.json({ error: "Tipo de nota inválido" }, 400);
  if (body.classification && !NOTE_CLASSIFICATIONS.has(body.classification)) {
    return c.json({ error: "Classificação inválida" }, 400);
  }
  if (body.sensitivity && !NOTE_SENSITIVITIES.has(body.sensitivity)) {
    return c.json({ error: "Sensibilidade inválida" }, 400);
  }

  const db = createDb(c.env);
  if (patientId) {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(withTenant(patients, user.organizationId, eq(patients.id, patientId)))
      .limit(1);
    if (!patient) return c.json({ error: "Paciente não encontrado" }, 404);
  }

  const classification = patientId ? "clinical" : body.classification ?? "private";
  const sensitivity = patientId ? "restricted" : body.sensitivity ?? "internal";
  const [note] = await db
    .insert(notes)
    .values({
      organizationId: user.organizationId,
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Sem título",
      type: body.type ?? "personal",
      classification,
      sensitivity,
      purposeOfUse: body.purposeOfUse ?? body.purpose_of_use ?? null,
      patientId,
      contentJson: body.contentJson ?? body.content_json ?? { type: "doc", content: [] },
      contentHtml: sanitizeNoteHtml(body.contentHtml ?? body.content_html),
      contentText: body.contentText ?? body.content_text ?? "",
      tags: Array.isArray(body.tags) ? body.tags.filter((tag: unknown) => typeof tag === "string") : [],
      ownerId: user.uid,
      createdBy: user.uid,
      updatedBy: user.uid,
      isTemplate: body.isTemplate ?? body.is_template ?? false,
    })
    .returning();

  await auditNote(c, note.id, "note.create");
  enqueueSemanticIndex(c, note.id);
  setVersionHeader(c, note);
  return c.json({ data: normalizeNote(note) }, 201);
});

/**
 * Abre a nota de preparação de um agendamento ou cria uma única nota clínica.
 * A chave única no banco torna a ação segura mesmo em cliques concorrentes.
 */
app.post("/from-appointment/:appointmentId", requireAuth, async (c) => {
  const appointmentId = c.req.param("appointmentId");
  if (!isUuid(appointmentId)) return c.json({ error: "Agendamento não encontrado" }, 404);
  const user = c.get("user");
  const db = createDb(c.env);
  const [appointment] = await db
    .select({ id: appointments.id, patientId: appointments.patientId, date: appointments.date })
    .from(appointments)
    .where(withTenant(appointments, user.organizationId, eq(appointments.id, appointmentId)))
    .limit(1);
  if (!appointment?.patientId) return c.json({ error: "Agendamento não encontrado" }, 404);

  const [existing] = await db
    .select()
    .from(notes)
    .where(withTenant(notes, user.organizationId, eq(notes.appointmentId, appointmentId)))
    .orderBy(desc(notes.updatedAt))
    .limit(1);
  if (existing) {
    setVersionHeader(c, existing);
    return c.json({ data: normalizeNote(existing), created: false });
  }

  const [note] = await db
    .insert(notes)
    .values({
      organizationId: user.organizationId,
      title: `Preparação do agendamento — ${String(appointment.date)}`,
      type: "appointment",
      classification: "clinical",
      sensitivity: "restricted",
      patientId: appointment.patientId,
      appointmentId,
      contentJson: { type: "doc", content: [] },
      contentText: "",
      ownerId: user.uid,
      createdBy: user.uid,
      updatedBy: user.uid,
    })
    .returning();
  await auditNote(c, note.id, "note.create_from_appointment");
  setVersionHeader(c, note);
  return c.json({ data: normalizeNote(note), created: true }, 201);
});

/** Cria/abre uma nota preparatória ligada a uma evolução, sem copiar o prontuário. */
app.post("/from-session/:sessionId", requireAuth, async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!isUuid(sessionId)) return c.json({ error: "Evolução não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env);
  const [session] = await db
    .select({ id: sessions.id, patientId: sessions.patientId, appointmentId: sessions.appointmentId, date: sessions.date })
    .from(sessions)
    .where(withTenant(sessions, user.organizationId, eq(sessions.id, sessionId)))
    .limit(1);
  if (!session) return c.json({ error: "Evolução não encontrada" }, 404);

  const [existing] = await db
    .select()
    .from(notes)
    .where(withTenant(notes, user.organizationId, eq(notes.sessionId, sessionId)))
    .orderBy(desc(notes.updatedAt))
    .limit(1);
  if (existing) {
    setVersionHeader(c, existing);
    return c.json({ data: normalizeNote(existing), created: false });
  }

  const [note] = await db.insert(notes).values({
    organizationId: user.organizationId,
    title: `Preparação da próxima sessão — ${session.date.toISOString().slice(0, 10)}`,
    type: "patient_context",
    classification: "clinical",
    sensitivity: "restricted",
    patientId: session.patientId,
    appointmentId: session.appointmentId,
    sessionId,
    contentJson: { type: "doc", content: [] },
    contentText: "",
    ownerId: user.uid,
    createdBy: user.uid,
    updatedBy: user.uid,
  }).returning();
  await db.insert(noteRelations).values({
    organizationId: user.organizationId,
    sourceNoteId: note.id,
    targetType: "session",
    targetId: sessionId,
    relationType: "derived_from",
    isDerived: true,
    createdBy: user.uid,
  });
  await auditNote(c, note.id, "note.create_from_session");
  setVersionHeader(c, note);
  return c.json({ data: normalizeNote(note), created: true }, 201);
});

/** Credencial de uso único (60s) para não expor o JWT da sessão no WebSocket. */
app.post("/:id/collaboration-ticket", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "edit_content");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  if (!c.env.FISIOFLOW_CONFIG) return c.json({ error: "Colaboração indisponível" }, 503);
  const user = c.get("user");
  const ticket = crypto.randomUUID();
  await c.env.FISIOFLOW_CONFIG.put(
    `notes:collaboration-ticket:${ticket}`,
    JSON.stringify({ noteId: id, userId: user.uid, organizationId: user.organizationId, roles: [...new Set([user.role, ...(user.roles ?? [])].filter(Boolean))] }),
    { expirationTtl: 60 },
  );
  return c.json({ data: { ticket, expiresIn: 60 } }, 201);
});

app.post("/:id/ai/summary", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "view");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  if (note.patientId || note.classification === "clinical" || note.sensitivity !== "internal") {
    // A negativa nunca deve virar erro 500 se a camada de auditoria estiver
    // indisponível; a proteção server-side continua sendo aplicada.
    await auditNote(c, id, "note.ai.request", "denied").catch((error) => console.warn("[notes] denied AI audit failed", error));
    return c.json({ error: "IA disponível apenas para notas internas não clínicas" }, 403);
  }
  const source = (note.contentText ?? "").trim().slice(0, 12000);
  if (!source) return c.json({ error: "A nota não possui conteúdo para resumir" }, 422);
  try {
    const response = await runAi(c.env, "@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: "Resuma notas internas em português brasileiro. Seja objetivo, preserve decisões e próximos passos. Não invente informações." },
        { role: "user", content: source },
      ],
      max_tokens: 500,
    }, { cache: false });
    const summary = readAiText(response).trim();
    if (!summary) return c.json({ error: "IA não retornou um resumo" }, 503);
    await auditNote(c, id, "note.ai.request");
    return c.json({ data: { summary, generatedBy: "workers-ai", sourceChars: source.length } });
  } catch (error) {
    console.error("[notes/ai-summary] failed", error);
    return c.json({ error: "Resumo por IA indisponível" }, 503);
  }
});

app.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "view");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  await auditNote(c, note.id, "note.view");
  setVersionHeader(c, note);
  return c.json({ data: normalizeNote(note) });
});

app.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const body = await c.req.json();
  const changesContent = ["contentJson", "content_json", "contentHtml", "content_html", "contentText", "content_text"]
    .some((field) => Object.prototype.hasOwnProperty.call(body, field));
  const changesProperties = ["title", "tags", "status"].some((field) => Object.prototype.hasOwnProperty.call(body, field));
  const note = await loadNoteForCapability(c, id, changesProperties && !changesContent ? "edit_properties" : "edit_content");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  if (changesContent && changesProperties && !(await loadNoteForCapability(c, id, "edit_properties"))) {
    return c.json({ error: "Nota não encontrada" }, 404);
  }
  const ifMatch = c.req.header("If-Match");
  if (ifMatch && ifMatch !== `\"${note.metadataVersion}\"`) {
    return c.json({ error: "A nota foi alterada por outra pessoa. Atualize e tente novamente." }, 412);
  }
  if (body.status && !NOTE_STATUSES.has(body.status)) {
    return c.json({ error: "Status inválido" }, 400);
  }
  const user = c.get("user");
  const db = createDb(c.env);
  const [updated] = await db
    .update(notes)
    .set({
      title: typeof body.title === "string" ? body.title.trim() || "Sem título" : undefined,
      contentJson: body.contentJson ?? body.content_json ?? undefined,
      contentHtml: body.contentHtml === undefined && body.content_html === undefined ? undefined : sanitizeNoteHtml(body.contentHtml ?? body.content_html),
      contentText: body.contentText ?? body.content_text ?? undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((tag: unknown) => typeof tag === "string") : undefined,
      status: body.status ?? undefined,
      updatedBy: user.uid,
      updatedAt: new Date(),
      metadataVersion: note.metadataVersion + 1,
      lastAutoSaveAt: new Date(),
    })
    .where(withTenant(notes, user.organizationId, and(eq(notes.id, id), eq(notes.metadataVersion, note.metadataVersion))))
    .returning();

  if (!updated) {
    return c.json({ error: "A nota foi alterada por outra pessoa. Atualize e tente novamente." }, 412);
  }

  await auditNote(c, id, "note.update");
  enqueueSemanticIndex(c, id);
  setVersionHeader(c, updated);
  return c.json({ data: normalizeNote(updated) });
});

app.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "delete");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env);
  await db
    .update(notes)
    .set({ deletedAt: new Date(), archivedAt: new Date(), status: "archived", updatedBy: user.uid })
    .where(withTenant(notes, user.organizationId, eq(notes.id, id)));
  await auditNote(c, id, "note.archive");
  enqueueSemanticIndex(c, id);
  return c.json({ ok: true });
});

app.get("/:id/revisions", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "view");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const rows = await db
    .select()
    .from(noteRevisions)
    .where(withTenant(noteRevisions, user.organizationId, eq(noteRevisions.noteId, id)))
    .orderBy(desc(noteRevisions.versionNumber));
  await auditNote(c, id, "note.revision_view");
  return c.json({ data: rows });
});

app.post("/:id/revisions", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "edit_content");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env);
  const latest = await db
    .select({ versionNumber: noteRevisions.versionNumber })
    .from(noteRevisions)
    .where(withTenant(noteRevisions, user.organizationId, eq(noteRevisions.noteId, id)))
    .orderBy(desc(noteRevisions.versionNumber))
    .limit(1);
  const body = await c.req.json().catch(() => ({}));
  const [revision] = await db
    .insert(noteRevisions)
    .values({
      organizationId: user.organizationId,
      noteId: id,
      versionNumber: (latest[0]?.versionNumber ?? 0) + 1,
      snapshotJson: note.contentJson,
      contentHtml: note.contentHtml,
      contentText: note.contentText,
      reason: typeof body.reason === "string" ? body.reason.slice(0, 100) : null,
      createdBy: user.uid,
    })
    .returning();
  await auditNote(c, id, "note.revision_create");
  return c.json({ data: revision }, 201);
});

app.post("/:id/revisions/:revisionId/restore", requireAuth, async (c) => {
  const id = c.req.param("id");
  const revisionId = c.req.param("revisionId");
  if (!isUuid(id) || !isUuid(revisionId)) return c.json({ error: "Revisão não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "manage_permissions");
  if (!note) return c.json({ error: "Nota não encontrada ou sem permissão de gerenciamento" }, 404);
  const user = c.get("user");
  const db = createDb(c.env);
  const restored = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM notes WHERE id = ${id} AND organization_id = ${user.organizationId} FOR UPDATE`);
    const [current] = await tx.select().from(notes).where(withTenant(notes, user.organizationId, eq(notes.id, id))).limit(1);
    const [source] = await tx.select().from(noteRevisions).where(withTenant(noteRevisions, user.organizationId, and(eq(noteRevisions.id, revisionId), eq(noteRevisions.noteId, id)))).limit(1);
    if (!current || !source) return null;
    const latest = await tx.select({ versionNumber: noteRevisions.versionNumber }).from(noteRevisions).where(withTenant(noteRevisions, user.organizationId, eq(noteRevisions.noteId, id))).orderBy(desc(noteRevisions.versionNumber)).limit(1);
    const [revision] = await tx.insert(noteRevisions).values({
    organizationId: user.organizationId,
    noteId: id,
    versionNumber: (latest[0]?.versionNumber ?? 0) + 1,
    snapshotJson: source.snapshotJson,
    contentHtml: source.contentHtml,
    contentText: source.contentText,
    reason: "restore",
    changeSummary: `Restaurada a versão ${source.versionNumber}`,
    restoredFromRevisionId: source.id,
    createdBy: user.uid,
    }).returning();
    const [updated] = await tx.update(notes).set({
    contentJson: source.snapshotJson,
    contentHtml: source.contentHtml,
    contentText: source.contentText,
    yjsState: null,
    aclVersion: current.aclVersion + 1,
    metadataVersion: current.metadataVersion + 1,
    updatedBy: user.uid,
    updatedAt: new Date(),
    lastAutoSaveAt: new Date(),
    }).where(withTenant(notes, user.organizationId, eq(notes.id, id))).returning();
    return { note: updated, revision };
  });
  if (!restored) return c.json({ error: "Revisão ou nota não encontrada" }, 404);
  await auditNote(c, id, "note.revision_restore");
  enqueueSemanticIndex(c, id);
  return c.json({ data: { note: normalizeNote(restored.note), revision: restored.revision, resetRequired: true } });
});

app.get("/:id/export", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "export");
  if (!note) return c.json({ error: "Nota não encontrada ou sem permissão de exportação" }, 404);
  const user = c.get("user");
  const title = textAsSafeHtml(note.title);
  const body = `<p>${textAsSafeHtml(note.contentText ?? "")}</p>`;
  await auditNote(c, id, "note.export");
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${body}<hr><small>Exportado por ${textAsSafeHtml(user.uid)} em ${new Date().toISOString()}</small></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="nota-${id}.html"`, "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" },
  });
});

app.get("/:id/portal-publications", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "publish");
  if (!note) return c.json({ error: "Nota não encontrada ou sem permissão de publicação" }, 404);
  const user = c.get("user");
  const pool = await createPool(c.env, 15_000, "read");
  const result = await pool.query(`SELECT id, note_id AS "noteId", patient_id AS "patientId", title, content_text AS "contentText", expires_at AS "expiresAt", revoked_at AS "revokedAt", created_at AS "createdAt" FROM note_portal_publications WHERE organization_id = $1 AND note_id = $2 ORDER BY created_at DESC LIMIT 20`, [user.organizationId, id]);
  return c.json({ data: result.rows });
});

app.post("/:id/portal-publications", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "publish");
  if (!note) return c.json({ error: "Nota não encontrada ou sem permissão de publicação" }, 404);
  if (!note.patientId) return c.json({ error: "A publicação no portal exige paciente vinculado" }, 422);
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const contentText = typeof body.contentText === "string" ? body.contentText.trim().slice(0, 20000) : "";
  if (!contentText) return c.json({ error: "Informe a projeção que será exibida ao paciente" }, 422);
  const expiresAt = new Date(typeof body.expiresAt === "string" ? body.expiresAt : Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date() || expiresAt.getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000) return c.json({ error: "A validade deve ser futura e de no máximo 30 dias" }, 422);
  const user = c.get("user");
  const pool = await createPool(c.env);
  const result = await pool.query(`INSERT INTO note_portal_publications (organization_id, note_id, patient_id, title, content_html, content_text, published_by, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, note_id AS "noteId", patient_id AS "patientId", title, content_text AS "contentText", expires_at AS "expiresAt", created_at AS "createdAt"`, [user.organizationId, id, note.patientId, typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 500) : note.title, null, contentText, user.uid, expiresAt]);
  await auditNote(c, id, "note.portal_publish");
  return c.json({ data: result.rows[0] }, 201);
});

app.delete("/:id/portal-publications/:publicationId", requireAuth, async (c) => {
  const id = c.req.param("id");
  const publicationId = c.req.param("publicationId");
  if (!isUuid(id) || !isUuid(publicationId)) return c.json({ error: "Publicação não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "publish");
  if (!note) return c.json({ error: "Nota não encontrada ou sem permissão de publicação" }, 404);
  const user = c.get("user");
  const pool = await createPool(c.env);
  const result = await pool.query(`UPDATE note_portal_publications SET revoked_at = NOW(), updated_at = NOW() WHERE id = $1 AND note_id = $2 AND organization_id = $3 AND revoked_at IS NULL RETURNING id`, [publicationId, id, user.organizationId]);
  if (!result.rowCount) return c.json({ error: "Publicação não encontrada" }, 404);
  await auditNote(c, id, "note.portal_revoke");
  return c.json({ ok: true });
});

app.get("/:id/mentions", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "view");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const rows = await db
    .select()
    .from(noteMentions)
    .where(withTenant(noteMentions, user.organizationId, eq(noteMentions.noteId, id)))
    .orderBy(desc(noteMentions.createdAt));
  return c.json({ data: rows });
});

app.post("/:id/mentions", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "edit_content");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const body = await c.req.json();
  const mentionType = body.mentionType ?? body.mention_type;
  const targetId = body.targetId ?? body.target_id;
  if (!SUPPORTED_MENTION_TYPES.has(mentionType) || !isUuid(targetId)) {
    return c.json({ error: "Menção inválida" }, 400);
  }

  const user = c.get("user");
  const db = createDb(c.env);
  if (mentionType === "patient") {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(withTenant(patients, user.organizationId, eq(patients.id, targetId)))
      .limit(1);
    if (!patient) return c.json({ error: "Paciente não encontrado" }, 404);
  } else if (mentionType === "note") {
    const targetNote = await loadNoteForCapability(c, targetId, "view");
    if (!targetNote) return c.json({ error: "Nota mencionada não encontrada" }, 404);
  } else {
    const raw = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");
    const targets: Record<string, { sql: string; label: string }> = {
      profile: { sql: "SELECT 1 FROM profiles WHERE id = $2 AND organization_id = $1 AND is_active IS NOT FALSE LIMIT 1", label: "Profissional" },
      task: { sql: "SELECT 1 FROM tarefas WHERE id = $2 AND organization_id = $1 AND deleted_at IS NULL LIMIT 1", label: "Tarefa" },
      appointment: { sql: "SELECT 1 FROM appointments WHERE id = $2 AND organization_id = $1 LIMIT 1", label: "Agendamento" },
      session: { sql: "SELECT 1 FROM sessions WHERE id = $2 AND organization_id = $1 LIMIT 1", label: "Evolução" },
    };
    const target = targets[mentionType];
    const found = target && await raw.query(target.sql, [user.organizationId, targetId]);
    if (!found?.rows?.[0]) return c.json({ error: `${target?.label ?? "Destino"} não encontrado` }, 404);
  }

  const [mention] = await db
    .insert(noteMentions)
    .values({
      organizationId: user.organizationId,
      noteId: id,
      blockId: typeof body.blockId === "string" ? body.blockId.slice(0, 255) : null,
      mentionType,
      targetId,
      displayLabel: typeof body.displayLabel === "string" ? body.displayLabel.slice(0, 255) : null,
      startOffset: Number.isInteger(body.startOffset) ? body.startOffset : null,
      endOffset: Number.isInteger(body.endOffset) ? body.endOffset : null,
      createdBy: user.uid,
    })
    .returning();
  await db.insert(noteRelations).values({
    organizationId: user.organizationId,
    sourceNoteId: id,
    blockId: mention.blockId,
    targetType: mentionType,
    targetId,
    relationType: "mentions",
    isDerived: true,
    createdBy: user.uid,
  });
  await auditNote(c, id, "note.mention_create");
  return c.json({ data: mention }, 201);
});

app.get("/:id/backlinks", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "view");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const relations = await db
    .select({ sourceNoteId: noteRelations.sourceNoteId, relationType: noteRelations.relationType })
    .from(noteRelations)
    .where(withTenant(noteRelations, user.organizationId, and(eq(noteRelations.targetType, "note"), eq(noteRelations.targetId, id))))
    .orderBy(desc(noteRelations.createdAt));
  const sourceIds = [...new Set(relations.map((relation) => relation.sourceNoteId))];
  const visibleNotes = (await Promise.all(sourceIds.map((sourceId) => loadNoteForCapability(c, sourceId, "view")))).filter(
    (source): source is typeof notes.$inferSelect => Boolean(source),
  );
  return c.json({
    data: visibleNotes.map((source) => ({
      id: source.id,
      title: source.title,
      type: source.type,
      updatedAt: source.updatedAt,
      relationTypes: relations.filter((relation) => relation.sourceNoteId === source.id).map((relation) => relation.relationType),
    })),
  });
});

app.get("/:id/tasks", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "view");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");
  const result = await db.query(
    `SELECT t.*, nt.block_id, nt.sync_mode
     FROM note_tasks nt
     INNER JOIN tarefas t ON t.id = nt.task_id
     WHERE nt.note_id = $1 AND nt.organization_id = $2 AND nt.deleted_at IS NULL
       AND t.organization_id = $2
     ORDER BY nt.created_at DESC`,
    [id, user.organizationId],
  );
  return c.json({ data: result.rows ?? [] });
});

app.post("/:id/tasks", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "edit_content");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const body = await c.req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 500) return c.json({ error: "Título da tarefa inválido" }, 400);
  const user = c.get("user");
  const taskDb = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");
  const result = await taskDb.query(
    `INSERT INTO tarefas
       (organization_id, created_by, responsavel_id, titulo, descricao, status, prioridade, tipo, linked_entity_type, linked_entity_id, task_references)
     VALUES ($1, $2, $3, $4, $5, 'A_FAZER', $6, 'TAREFA', 'note', $7, $8::jsonb)
     RETURNING *, task_references AS references`,
    [
      user.organizationId,
      user.uid,
      typeof body.assigneeId === "string" ? body.assigneeId : null,
      title,
      typeof body.description === "string" ? body.description.slice(0, 10000) : null,
      ["BAIXA", "MEDIA", "ALTA", "URGENTE"].includes(body.priority) ? body.priority : "MEDIA",
      id,
      JSON.stringify([{ type: "note", id, title: note.title }]),
    ],
  );
  const task = result.rows?.[0] as { id: string } | undefined;
  if (!task) return c.json({ error: "Não foi possível criar a tarefa" }, 500);
  const db = createDb(c.env);
  const [link] = await db
    .insert(noteTasks)
    .values({ organizationId: user.organizationId, noteId: id, taskId: task.id, syncMode: "two_way", createdBy: user.uid })
    .returning();
  await db.insert(noteRelations).values({
    organizationId: user.organizationId,
    sourceNoteId: id,
    targetType: "task",
    targetId: task.id,
    relationType: "created_from",
    createdBy: user.uid,
  });
  await auditNote(c, id, "note.task_create");
  return c.json({ data: { task: result.rows[0], link } }, 201);
});

app.get("/:id/attachments", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  if (!(await loadNoteForCapability(c, id, "view"))) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const data = await db.select().from(noteAttachments).where(withTenant(noteAttachments, user.organizationId, eq(noteAttachments.noteId, id))).orderBy(noteAttachments.sortOrder);
  return c.json({ data });
});

app.post("/:id/attachments", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  if (!(await loadNoteForCapability(c, id, "edit_content"))) return c.json({ error: "Nota não encontrada" }, 404);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size || file.size > MAX_ATTACHMENT_BYTES) return c.json({ error: "Arquivo inválido ou maior que 25 MB" }, 400);
  const mimeType = file.type || "application/octet-stream";
  if (!ATTACHMENT_CONTENT_TYPES.has(mimeType)) return c.json({ error: "Tipo de arquivo não permitido" }, 415);
  const user = c.get("user"); const originalName = safeAttachmentName(file.name);
  const storageKey = `orgs/${user.organizationId}/notes/${id}/${crypto.randomUUID()}/${originalName}`;
  await c.env.MEDIA_BUCKET.put(storageKey, file.stream(), { httpMetadata: { contentType: mimeType }, customMetadata: { organizationId: user.organizationId, noteId: id, uploadedBy: user.uid } });
  const db = createDb(c.env);
  const [attachment] = await db.insert(noteAttachments).values({ organizationId: user.organizationId, noteId: id, storageKey, originalName, mimeType, sizeBytes: file.size, uploadedBy: user.uid }).returning();
  await auditNote(c, id, "note.attachment_upload");
  return c.json({ data: attachment }, 201);
});

app.get("/:id/attachments/:attachmentId/download", requireAuth, async (c) => {
  const id = c.req.param("id"), attachmentId = c.req.param("attachmentId");
  if (!isUuid(id) || !isUuid(attachmentId)) return c.json({ error: "Anexo não encontrado" }, 404);
  if (!(await loadNoteForCapability(c, id, "view"))) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user"), db = createDb(c.env, "read");
  const [attachment] = await db.select().from(noteAttachments).where(withTenant(noteAttachments, user.organizationId, and(eq(noteAttachments.id, attachmentId), eq(noteAttachments.noteId, id)))).limit(1);
  if (!attachment) return c.json({ error: "Anexo não encontrado" }, 404);
  const object = await c.env.MEDIA_BUCKET.get(attachment.storageKey);
  if (!object) return c.json({ error: "Anexo não encontrado" }, 404);
  await auditNote(c, id, "note.attachment_download");
  return new Response(object.body, { headers: { "Content-Type": attachment.mimeType, "Content-Disposition": `attachment; filename=\"${attachment.originalName}\"`, "Cache-Control": "private, no-store" } });
});

app.delete("/:id/attachments/:attachmentId", requireAuth, async (c) => {
  const id = c.req.param("id"), attachmentId = c.req.param("attachmentId");
  if (!isUuid(id) || !isUuid(attachmentId)) return c.json({ error: "Anexo não encontrado" }, 404);
  if (!(await loadNoteForCapability(c, id, "edit_content"))) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user"), db = createDb(c.env);
  const [attachment] = await db.update(noteAttachments).set({ deletedAt: new Date() }).where(withTenant(noteAttachments, user.organizationId, and(eq(noteAttachments.id, attachmentId), eq(noteAttachments.noteId, id)))).returning();
  if (!attachment) return c.json({ error: "Anexo não encontrado" }, 404);
  await c.env.MEDIA_BUCKET.delete(attachment.storageKey);
  await auditNote(c, id, "note.attachment_delete");
  return c.json({ ok: true });
});

app.post("/:id/tasks/:taskId/link", requireAuth, async (c) => {
  const id = c.req.param("id");
  const taskId = c.req.param("taskId");
  if (!isUuid(id) || !isUuid(taskId)) return c.json({ error: "Vínculo inválido" }, 400);
  const note = await loadNoteForCapability(c, id, "edit_content");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const taskDb = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");
  const task = await taskDb.query(
    "SELECT id FROM tarefas WHERE id = $1 AND organization_id = $2 LIMIT 1",
    [taskId, user.organizationId],
  );
  if (!task.rows?.[0]) return c.json({ error: "Tarefa não encontrada" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const db = createDb(c.env);
  const [link] = await db
    .insert(noteTasks)
    .values({
      organizationId: user.organizationId,
      noteId: id,
      taskId,
      blockId: typeof body.blockId === "string" ? body.blockId.slice(0, 255) : null,
      syncMode: body.syncMode === "one_way" ? "one_way" : "two_way",
      createdBy: user.uid,
    })
    .onConflictDoNothing()
    .returning();
  if (link) {
    await db.insert(noteRelations).values({
      organizationId: user.organizationId,
      sourceNoteId: id,
      blockId: link.blockId,
      targetType: "task",
      targetId: taskId,
      relationType: "relates_to",
      createdBy: user.uid,
    });
    await auditNote(c, id, "note.task_link");
  }
  return c.json({ data: link ?? { noteId: id, taskId, alreadyLinked: true } }, link ? 201 : 200);
});

app.get("/:id/comments", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "view");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const rows = await db
    .select()
    .from(noteComments)
    .where(withTenant(noteComments, user.organizationId, eq(noteComments.noteId, id)))
    .orderBy(desc(noteComments.createdAt));
  return c.json({ data: rows });
});

app.post("/:id/comments", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "comment");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const body = await c.req.json();
  const bodyText = typeof body.body === "string" ? body.body.trim() : "";
  if (!bodyText || bodyText.length > 5000) return c.json({ error: "Comentário inválido" }, 400);
  if (body.parentCommentId && !isUuid(body.parentCommentId)) {
    return c.json({ error: "Comentário pai inválido" }, 400);
  }
  const user = c.get("user");
  const db = createDb(c.env);
  if (body.parentCommentId) {
    const [parent] = await db
      .select({ id: noteComments.id })
      .from(noteComments)
      .where(withTenant(noteComments, user.organizationId, and(eq(noteComments.id, body.parentCommentId), eq(noteComments.noteId, id))))
      .limit(1);
    if (!parent) return c.json({ error: "Comentário pai não encontrado" }, 404);
  }
  const [comment] = await db
    .insert(noteComments)
    .values({
      organizationId: user.organizationId,
      noteId: id,
      blockId: typeof body.blockId === "string" ? body.blockId.slice(0, 255) : null,
      parentCommentId: body.parentCommentId ?? null,
      selection: body.selection && typeof body.selection === "object" ? body.selection : null,
      body: bodyText,
      authorId: user.uid,
    })
    .returning();
  await auditNote(c, id, "note.comment_create");
  return c.json({ data: comment }, 201);
});

/** Resolve ou reabre uma discussão sem apagar seu histórico. */
app.patch("/:id/comments/:commentId", requireAuth, async (c) => {
  const id = c.req.param("id");
  const commentId = c.req.param("commentId");
  if (!isUuid(id) || !isUuid(commentId)) return c.json({ error: "Comentário não encontrado" }, 404);
  const note = await loadNoteForCapability(c, id, "comment");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const body = await c.req.json().catch(() => ({}));
  if (body.status !== "open" && body.status !== "resolved") {
    return c.json({ error: "Status do comentário inválido" }, 400);
  }
  const user = c.get("user");
  const db = createDb(c.env);
  const [comment] = await db
    .update(noteComments)
    .set({
      status: body.status,
      resolvedBy: body.status === "resolved" ? user.uid : null,
      resolvedAt: body.status === "resolved" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(withTenant(noteComments, user.organizationId, and(eq(noteComments.id, commentId), eq(noteComments.noteId, id))))
    .returning();
  if (!comment) return c.json({ error: "Comentário não encontrado" }, 404);
  await auditNote(c, id, "note.comment_status_change");
  return c.json({ data: comment });
});

app.get("/:id/permissions", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "manage_permissions");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const rows = await db
    .select()
    .from(notePermissions)
    .where(withTenant(notePermissions, user.organizationId, eq(notePermissions.noteId, id)));
  return c.json({ data: rows });
});

app.put("/:id/permissions", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "Nota não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "manage_permissions");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const body = await c.req.json();
  const capabilities = Array.isArray(body.capabilities)
    ? body.capabilities.filter(isCapability)
    : [];
  if (
    !SUPPORTED_PERMISSION_SUBJECTS.has(body.subjectType) ||
    !ACCESS_ROLES.has(body.accessRole) ||
    capabilities.length === 0
  ) {
    return c.json({ error: "Permissão inválida" }, 400);
  }
  if (body.subjectType !== "organization" && (typeof body.subjectId !== "string" || !body.subjectId.trim())) {
    return c.json({ error: "Destinatário da permissão inválido" }, 400);
  }
  if (note.classification === "clinical" && body.subjectType === "organization") {
    return c.json({ error: "Notas clínicas não podem ser compartilhadas com toda a organização" }, 400);
  }
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.valueOf())) {
    return c.json({ error: "Data de expiração inválida" }, 400);
  }
  const user = c.get("user");
  const db = createDb(c.env);
  // O identificador da organização é derivado da sessão. Isso impede que um
  // cliente tente criar uma concessão ampla para outro tenant.
  const subjectId = body.subjectType === "organization" ? user.organizationId : body.subjectId.trim();
  if (body.subjectType === "role" && !SHAREABLE_ROLES.has(subjectId)) {
    return c.json({ error: "Cargo destinatário inválido" }, 400);
  }
  if (body.subjectType === "user") {
    // IDs no seletor são `organization_members.user_id` (não profile.id).
    // Validar a associação evita conceder uma nota a uma conta externa por ID.
    const members = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");
    const membership = await members.query(
      `SELECT 1 FROM organization_members
       WHERE organization_id = $1 AND user_id = $2 AND active = true
       LIMIT 1`,
      [user.organizationId, subjectId],
    );
    if (!membership.rows?.[0]) return c.json({ error: "Membro da equipe não encontrado" }, 404);
  }
  const [existing] = await db
    .select({ id: notePermissions.id })
    .from(notePermissions)
    .where(withTenant(notePermissions, user.organizationId, and(
      eq(notePermissions.noteId, id),
      eq(notePermissions.subjectType, body.subjectType),
      eq(notePermissions.subjectId, subjectId),
      isNull(notePermissions.revokedAt),
    )))
    .limit(1);
  const [permission] = existing
    ? await db.update(notePermissions).set({ accessRole: body.accessRole, capabilities, grantedBy: user.uid, expiresAt }).where(withTenant(notePermissions, user.organizationId, eq(notePermissions.id, existing.id))).returning()
    : await db.insert(notePermissions).values({ organizationId: user.organizationId, noteId: id, subjectType: body.subjectType, subjectId, accessRole: body.accessRole, capabilities, grantedBy: user.uid, expiresAt }).returning();
  await db
    .update(notes)
    .set({ aclVersion: note.aclVersion + 1, updatedAt: new Date(), updatedBy: user.uid })
    .where(withTenant(notes, user.organizationId, eq(notes.id, id)));
  await auditNote(c, id, "note.permission_change");
  return c.json({ data: permission }, 201);
});

app.delete("/:id/permissions/:permissionId", requireAuth, async (c) => {
  const id = c.req.param("id");
  const permissionId = c.req.param("permissionId");
  if (!isUuid(id) || !isUuid(permissionId)) return c.json({ error: "Permissão não encontrada" }, 404);
  const note = await loadNoteForCapability(c, id, "manage_permissions");
  if (!note) return c.json({ error: "Nota não encontrada" }, 404);
  const user = c.get("user");
  const db = createDb(c.env);
  const [revoked] = await db
    .update(notePermissions)
    .set({ revokedAt: new Date() })
    .where(withTenant(notePermissions, user.organizationId, and(eq(notePermissions.id, permissionId), eq(notePermissions.noteId, id), isNull(notePermissions.revokedAt))))
    .returning();
  if (!revoked) return c.json({ error: "Permissão não encontrada" }, 404);
  await db
    .update(notes)
    .set({ aclVersion: note.aclVersion + 1, updatedAt: new Date(), updatedBy: user.uid })
    .where(withTenant(notes, user.organizationId, eq(notes.id, id)));
  await auditNote(c, id, "note.permission_revoke");
  return c.json({ ok: true });
});

export { app as notesRoutes };
