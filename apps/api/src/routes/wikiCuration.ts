import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";
import { resolveKnowledgeCapabilities } from "../lib/knowledgeCapabilities";
import {
  allowedKnowledgeActions,
  EDITORIAL_STATUSES,
  validateKnowledgeTransition,
} from "../lib/knowledgeTransitions";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
app.use("*", requireAuth);

const uuid = z.string().uuid();
const transitionBody = z.object({
  action: z.enum([
    "submit",
    "start_review",
    "request_changes",
    "reject",
    "approve",
    "publish",
    "unpublish",
    "mark_review_due",
    "reopen",
    "archive",
  ]),
  versionId: uuid,
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().max(4000).optional(),
  validUntil: z.iso.date().optional(),
});
const assignmentBody = z.object({
  versionId: uuid,
  assigneeId: z.string().trim().min(1).max(255),
  assignmentType: z.enum(["owner", "reviewer"]).default("owner"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  expectedVersion: z.number().int().positive(),
});
const queueQuery = z.object({
  status: z.enum(EDITORIAL_STATUSES).optional(),
  assignee: z.string().max(255).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  validity: z.enum(["valid", "due", "missing"]).optional(),
  kind: z.string().max(50).optional(),
  technicalStatus: z
    .enum(["not_started", "queued", "processing", "indexed", "failed"])
    .optional(),
  q: z.string().trim().max(160).optional(),
  cursor: z.string().max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function requestId(c: { get(key: "requestId"): string | undefined }): string {
  return c.get("requestId") ?? "unknown";
}

function errorResponse(
  c: any,
  status: 400 | 403 | 404 | 409 | 422 | 500,
  code: string,
  message: string,
) {
  return c.json(
    { data: null, error: { code, message, requestId: requestId(c) } },
    status,
  );
}

function decodeCursor(
  value?: string,
): { updatedAt: string; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(atob(value));
    return z.object({ updatedAt: z.string(), id: uuid }).parse(parsed);
  } catch {
    return null;
  }
}

function encodeCursor(value: { updatedAt: string; id: string }): string {
  return btoa(JSON.stringify(value));
}

async function payloadHash(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

app.onError((error, c) => {
  if (error instanceof z.ZodError) {
    return errorResponse(
      c,
      422,
      "VALIDATION_ERROR",
      error.issues[0]?.message ?? "Entrada inválida",
    );
  }
  console.error("[wiki-curation] request failed", {
    requestId: requestId(c),
    error: error instanceof Error ? error.message : String(error),
  });
  return errorResponse(
    c,
    500,
    "INTERNAL_ERROR",
    "Não foi possível concluir a operação",
  );
});

app.get("/capabilities", async (c) => {
  const user = c.get("user");
  const capabilities = await resolveKnowledgeCapabilities(
    c.env,
    user.organizationId,
    user.uid,
  );
  return c.json({ data: { capabilities } });
});

app.get("/queue", async (c) => {
  const input = queueQuery.parse(c.req.query());
  const cursor = decodeCursor(input.cursor);
  if (input.cursor && !cursor)
    return errorResponse(c, 422, "INVALID_CURSOR", "Cursor inválido");
  const user = c.get("user");
  const capabilities = await resolveKnowledgeCapabilities(
    c.env,
    user.organizationId,
    user.uid,
  );
  if (capabilities.length === 0) {
    return errorResponse(
      c,
      403,
      "FORBIDDEN",
      "Capability editorial necessária",
    );
  }
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT i.id, v.id AS version_id, i.row_version, v.title, i.kind,
            v.editorial_status, v.technical_status, v.submitted_by,
            a.assignee_id, a.priority, a.due_at,
            r.valid_until,
            COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
              'type', s.source_type, 'title', s.title, 'url', s.url,
              'doi', s.doi, 'pmid', s.pmid, 'license', s.license
            )) FILTER (WHERE s.id IS NOT NULL), '[]'::jsonb) AS provenance,
            i.updated_at
       FROM knowledge_items i
       JOIN LATERAL (
         SELECT * FROM knowledge_item_versions candidate
          WHERE candidate.organization_id = i.organization_id AND candidate.item_id = i.id
          ORDER BY candidate.version_number DESC LIMIT 1
       ) v ON true
       LEFT JOIN knowledge_assignments a ON a.organization_id = i.organization_id
         AND a.version_id = v.id AND a.completed_at IS NULL AND a.assignment_type = 'owner'
       LEFT JOIN LATERAL (
         SELECT valid_until FROM knowledge_reviews review
          WHERE review.organization_id = i.organization_id AND review.version_id = v.id
          ORDER BY review.created_at DESC LIMIT 1
       ) r ON true
       LEFT JOIN knowledge_sources s ON s.organization_id = i.organization_id
         AND s.item_id = i.id AND (s.version_id IS NULL OR s.version_id = v.id)
      WHERE i.organization_id = $1 AND i.deleted_at IS NULL
        AND ($2::text IS NULL OR v.editorial_status = $2)
        AND ($3::text IS NULL OR a.assignee_id = $3)
        AND ($4::text IS NULL OR a.priority = $4)
        AND ($5::text IS NULL OR i.kind = $5)
        AND ($6::text IS NULL OR v.technical_status = $6)
        AND ($7::text IS NULL OR v.title ILIKE '%' || $7 || '%')
        AND ($8::text IS NULL OR
          ($8 = 'valid' AND r.valid_until >= CURRENT_DATE) OR
          ($8 = 'due' AND r.valid_until < CURRENT_DATE) OR
          ($8 = 'missing' AND r.valid_until IS NULL))
        AND ($9::timestamptz IS NULL OR (i.updated_at, i.id) < ($9::timestamptz, $10::uuid))
      GROUP BY i.id, v.id, a.assignee_id, a.priority, a.due_at, r.valid_until
      ORDER BY i.updated_at DESC, i.id DESC LIMIT $11`,
    [
      user.organizationId,
      input.status ?? null,
      input.assignee ?? null,
      input.priority ?? null,
      input.kind ?? null,
      input.technicalStatus ?? null,
      input.q || null,
      input.validity ?? null,
      cursor?.updatedAt ?? null,
      cursor?.id ?? null,
      input.limit + 1,
    ],
  );
  const countResult = await pool.query(
    `SELECT v.editorial_status, count(*)::int AS count
       FROM knowledge_items i
       JOIN LATERAL (SELECT editorial_status FROM knowledge_item_versions candidate
         WHERE candidate.organization_id = i.organization_id AND candidate.item_id = i.id
         ORDER BY version_number DESC LIMIT 1) v ON true
      WHERE i.organization_id = $1 AND i.deleted_at IS NULL GROUP BY v.editorial_status`,
    [user.organizationId],
  );
  const hasMore = result.rows.length > input.limit;
  const rows = result.rows.slice(0, input.limit);
  const data = rows.map((row: any) => ({
    id: row.id,
    versionId: row.version_id,
    rowVersion: row.row_version,
    title: row.title,
    kind: row.kind,
    editorialStatus: row.editorial_status,
    technicalStatus: row.technical_status,
    assignee: row.assignee_id ?? null,
    priority: row.priority ?? "normal",
    dueAt: row.due_at ?? null,
    validUntil: row.valid_until ?? null,
    provenance: row.provenance ?? [],
    allowedActions: allowedKnowledgeActions({
      status: row.editorial_status,
      actorId: user.uid,
      submittedBy: row.submitted_by,
      capabilities,
    }),
  }));
  const last = rows.at(-1);
  return c.json({
    data,
    meta: {
      nextCursor:
        hasMore && last
          ? encodeCursor({ updatedAt: String(last.updated_at), id: last.id })
          : null,
      counts: Object.fromEntries(
        countResult.rows.map((row: any) => [row.editorial_status, row.count]),
      ),
      requestId: requestId(c),
    },
  });
});

app.get("/items/:id", async (c) => {
  const id = uuid.parse(c.req.param("id"));
  const user = c.get("user");
  const capabilities = await resolveKnowledgeCapabilities(
    c.env,
    user.organizationId,
    user.uid,
  );
  if (capabilities.length === 0)
    return errorResponse(
      c,
      403,
      "FORBIDDEN",
      "Capability editorial necessária",
    );
  const pool = createPool(c.env);
  const item = await pool.query(
    `SELECT i.*, v.id AS version_id, v.version_number, v.title AS version_title,
            v.content, v.metadata, v.editorial_status, v.technical_status, v.submitted_by
       FROM knowledge_items i JOIN LATERAL (
         SELECT * FROM knowledge_item_versions candidate
          WHERE candidate.organization_id = i.organization_id AND candidate.item_id = i.id
          ORDER BY candidate.version_number DESC LIMIT 1
       ) v ON true WHERE i.organization_id = $1 AND i.id = $2 AND i.deleted_at IS NULL`,
    [user.organizationId, id],
  );
  if (!item.rows[0])
    return errorResponse(c, 404, "ITEM_NOT_FOUND", "Item não encontrado");
  const [sources, reviews, assignments] = await Promise.all([
    pool.query(
      `SELECT * FROM knowledge_sources WHERE organization_id = $1 AND item_id = $2 ORDER BY created_at`,
      [user.organizationId, id],
    ),
    pool.query(
      `SELECT * FROM knowledge_reviews WHERE organization_id = $1 AND item_id = $2 ORDER BY created_at DESC`,
      [user.organizationId, id],
    ),
    pool.query(
      `SELECT * FROM knowledge_assignments WHERE organization_id = $1 AND item_id = $2 AND completed_at IS NULL ORDER BY created_at DESC`,
      [user.organizationId, id],
    ),
  ]);
  const row: any = item.rows[0];
  return c.json({
    data: {
      ...row,
      sources: sources.rows,
      reviews: reviews.rows,
      assignments: assignments.rows,
      allowedActions: allowedKnowledgeActions({
        status: row.editorial_status,
        actorId: user.uid,
        submittedBy: row.submitted_by,
        capabilities,
      }),
    },
  });
});

app.post("/items/:id/transitions", async (c) => {
  const id = uuid.parse(c.req.param("id"));
  const key = c.req.header("Idempotency-Key")?.trim();
  if (!key)
    return errorResponse(
      c,
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Idempotency-Key é obrigatório",
    );
  const body = transitionBody.parse(await c.req.json());
  const user = c.get("user");
  const capabilities = await resolveKnowledgeCapabilities(
    c.env,
    user.organizationId,
    user.uid,
  );
  const pool = createPool(c.env);
  const hash = await payloadHash(body);
  const prior = await pool.query(
    `SELECT payload_hash, response_status, response_body FROM knowledge_idempotency_keys
      WHERE organization_id = $1 AND actor_id = $2 AND operation = $3 AND idempotency_key = $4 AND expires_at > now()`,
    [user.organizationId, user.uid, `transition:${id}`, key],
  );
  if (prior.rows[0]) {
    if (prior.rows[0].payload_hash !== hash)
      return errorResponse(
        c,
        409,
        "IDEMPOTENCY_CONFLICT",
        "Chave reutilizada com outro payload",
      );
    return c.json(
      prior.rows[0].response_body,
      prior.rows[0].response_status ?? 200,
    );
  }
  const current = await pool.query(
    `SELECT i.row_version, i.approved_version_id, i.published_version_id,
            v.editorial_status, v.submitted_by
       FROM knowledge_items i JOIN knowledge_item_versions v
         ON v.organization_id = i.organization_id AND v.item_id = i.id
      WHERE i.organization_id = $1 AND i.id = $2 AND v.id = $3 AND i.deleted_at IS NULL`,
    [user.organizationId, id, body.versionId],
  );
  const row: any = current.rows[0];
  if (!row)
    return errorResponse(c, 404, "ITEM_NOT_FOUND", "Item não encontrado");
  if (row.row_version !== body.expectedVersion)
    return errorResponse(c, 409, "VERSION_CONFLICT", "Item foi alterado");
  const validation = validateKnowledgeTransition({
    action: body.action,
    status: row.editorial_status,
    actorId: user.uid,
    submittedBy: row.submitted_by,
    reason: body.reason,
    capabilities,
  });
  if (!validation.ok) {
    const status = validation.code === "FORBIDDEN" ? 403 : 409;
    return errorResponse(
      c,
      status,
      validation.code,
      "Transição editorial não permitida",
    );
  }
  if (body.action === "publish" && row.approved_version_id !== body.versionId) {
    return errorResponse(
      c,
      409,
      "INVALID_TRANSITION",
      "A versão não é a versão aprovada",
    );
  }
  const nextVersion = body.expectedVersion + 1;
  if (body.action === "reopen") {
    const reopenedVersionId = crypto.randomUUID();
    const reopenedResponse = {
      data: {
        id,
        versionId: reopenedVersionId,
        rowVersion: nextVersion,
        editorialStatus: "triage",
      },
      meta: { requestId: requestId(c) },
    };
    const reopened = await pool.query(
      `WITH changed_item AS (
         UPDATE knowledge_items SET row_version = $3, updated_at = now()
          WHERE organization_id = $1 AND id = $2 AND row_version = $4
            AND EXISTS (SELECT 1 FROM knowledge_item_versions guard
              WHERE guard.organization_id = $1 AND guard.item_id = $2
                AND guard.id = $5 AND guard.editorial_status = $6)
          RETURNING id
       ), new_version AS (
         INSERT INTO knowledge_item_versions
           (id,organization_id,item_id,version_number,title,content,metadata,
            editorial_status,technical_status,authored_by,submitted_by,submitted_at)
         SELECT $7,$1,$2,old.version_number + 1,old.title,old.content,old.metadata,
                'triage','not_started',$8,$8,now()
           FROM knowledge_item_versions old
          WHERE old.organization_id = $1 AND old.item_id = $2 AND old.id = $5
            AND EXISTS (SELECT 1 FROM changed_item)
         RETURNING id
       ), review AS (
         INSERT INTO knowledge_reviews
           (organization_id,item_id,version_id,action,from_status,to_status,reviewer_id,reason,request_id)
         SELECT $1,$2,id,'reopen',$6,'triage',$8,$9,$10 FROM new_version RETURNING id
       ), audit AS (
         INSERT INTO knowledge_audit_events
           (organization_id,actor_id,entity_type,entity_id,action,request_id,metadata)
         SELECT $1,$8,'knowledge_item',$2,'reopen',$10,$11::jsonb FROM new_version RETURNING id
       ), idempotency AS (
         INSERT INTO knowledge_idempotency_keys
           (organization_id,actor_id,operation,idempotency_key,payload_hash,response_status,response_body)
         SELECT $1,$8,$12,$13,$14,200,$15::jsonb FROM new_version RETURNING idempotency_key
       ) SELECT id FROM new_version`,
      [
        user.organizationId,
        id,
        nextVersion,
        body.expectedVersion,
        body.versionId,
        row.editorial_status,
        reopenedVersionId,
        user.uid,
        body.reason ?? null,
        requestId(c),
        JSON.stringify({
          sourceVersionId: body.versionId,
          newVersionId: reopenedVersionId,
          from: row.editorial_status,
          to: "triage",
        }),
        `transition:${id}`,
        key,
        hash,
        JSON.stringify(reopenedResponse),
      ],
    );
    if (!reopened.rows[0]) {
      return errorResponse(c, 409, "VERSION_CONFLICT", "Item foi alterado");
    }
    return c.json(reopenedResponse);
  }
  const responseBody = {
    data: {
      id,
      versionId: body.versionId,
      rowVersion: nextVersion,
      editorialStatus: validation.rule.to,
    },
    meta: { requestId: requestId(c) },
  };
  const itemPointerSet =
    body.action === "approve"
      ? "approved_version_id = $5,"
      : body.action === "publish"
        ? "published_version_id = $5,"
        : body.action === "unpublish"
          ? "published_version_id = NULL,"
          : "";
  const changed = await pool.query(
    `WITH changed_item AS (
       UPDATE knowledge_items SET ${itemPointerSet} row_version = $3, updated_at = now()
        WHERE organization_id = $1 AND id = $2 AND row_version = $4
          AND EXISTS (SELECT 1 FROM knowledge_item_versions guard
            WHERE guard.organization_id = $1 AND guard.item_id = $2
              AND guard.id = $5 AND guard.editorial_status = $9)
        RETURNING id
     ), changed_version AS (
       UPDATE knowledge_item_versions SET editorial_status = $7,
              submitted_by = CASE WHEN $8 = 'submit' THEN $6 ELSE submitted_by END,
              submitted_at = CASE WHEN $8 = 'submit' THEN now() ELSE submitted_at END
        WHERE organization_id = $1 AND id = $5 AND editorial_status = $9
          AND EXISTS (SELECT 1 FROM changed_item) RETURNING id
     ), superseded AS (
       UPDATE knowledge_item_versions SET editorial_status = 'superseded'
        WHERE organization_id = $1 AND id = $20 AND id <> $5
          AND $8 = 'publish' AND editorial_status IN ('published','review_due')
          AND EXISTS (SELECT 1 FROM changed_version) RETURNING id
     ), review AS (
       INSERT INTO knowledge_reviews
         (organization_id,item_id,version_id,action,from_status,to_status,reviewer_id,approved_by,reason,valid_until,request_id)
       SELECT $1,$2,$5,$8,$9,$7,$10,$11,$12,$13,$14 FROM changed_version RETURNING id
     ), audit AS (
       INSERT INTO knowledge_audit_events
         (organization_id,actor_id,entity_type,entity_id,action,request_id,metadata)
       SELECT $1,$6,'knowledge_item',$2,$8,$14,$15::jsonb FROM changed_version RETURNING id
     ), idempotency AS (
       INSERT INTO knowledge_idempotency_keys
         (organization_id,actor_id,operation,idempotency_key,payload_hash,response_status,response_body)
       SELECT $1,$6,$16,$17,$18,200,$19::jsonb FROM changed_version RETURNING idempotency_key
     ) SELECT id FROM changed_version`,
    [
      user.organizationId,
      id,
      nextVersion,
      body.expectedVersion,
      body.versionId,
      user.uid,
      validation.rule.to,
      body.action,
      row.editorial_status,
      validation.rule.capability === "clinical_review" ? user.uid : null,
      body.action === "approve" ? user.uid : null,
      body.reason ?? null,
      body.validUntil ?? null,
      requestId(c),
      JSON.stringify({
        versionId: body.versionId,
        from: row.editorial_status,
        to: validation.rule.to,
      }),
      `transition:${id}`,
      key,
      hash,
      JSON.stringify(responseBody),
      row.published_version_id ?? null,
    ],
  );
  if (!changed.rows[0])
    return errorResponse(c, 409, "VERSION_CONFLICT", "Item foi alterado");
  return c.json(responseBody);
});

app.post("/items/:id/assignments", async (c) => {
  const id = uuid.parse(c.req.param("id"));
  const body = assignmentBody.parse(await c.req.json());
  const user = c.get("user");
  const capabilities = await resolveKnowledgeCapabilities(
    c.env,
    user.organizationId,
    user.uid,
  );
  if (!capabilities.includes("manage_library"))
    return errorResponse(
      c,
      403,
      "FORBIDDEN",
      "Capability manage_library necessária",
    );
  const pool = createPool(c.env);
  const result = await pool.query(
    `WITH changed_item AS (
       UPDATE knowledge_items SET row_version = row_version + 1, updated_at = now()
        WHERE organization_id = $1 AND id = $2 AND row_version = $3 AND deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM knowledge_item_versions guard
            WHERE guard.organization_id = $1 AND guard.item_id = $2 AND guard.id = $4)
        RETURNING row_version
     ), completed AS (
       UPDATE knowledge_assignments SET completed_at = now(), updated_at = now()
        WHERE organization_id = $1 AND version_id = $4 AND assignment_type = $5
          AND completed_at IS NULL AND EXISTS (SELECT 1 FROM changed_item)
     )
     INSERT INTO knowledge_assignments
       (organization_id,item_id,version_id,assignment_type,assignee_id,priority,due_at,assigned_by)
     SELECT $1,$2,v.id,$5,$6,$7,$8,$9 FROM knowledge_item_versions v
      WHERE v.organization_id = $1 AND v.item_id = $2 AND v.id = $4
        AND EXISTS (SELECT 1 FROM changed_item) RETURNING *`,
    [
      user.organizationId,
      id,
      body.expectedVersion,
      body.versionId,
      body.assignmentType,
      body.assigneeId,
      body.priority,
      body.dueAt ?? null,
      user.uid,
    ],
  );
  if (!result.rows[0])
    return errorResponse(
      c,
      409,
      "VERSION_CONFLICT",
      "Item ou versão foi alterado",
    );
  return c.json(
    { data: result.rows[0], meta: { requestId: requestId(c) } },
    201,
  );
});

export { app as wikiCurationRoutes };
