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

// PostgreSQL accepts UUID-shaped hexadecimal values whose version/variant bits do
// not satisfy RFC 4122. Legacy deterministic IDs in this domain use that form.
export const postgresUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const uuid = postgresUuid;
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
  status: z.enum([...EDITORIAL_STATUSES, "inbox", "technical_failures"]).optional(),
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

function person(id: unknown, name?: unknown) {
  return typeof id === "string" && id
    ? { id, name: typeof name === "string" && name ? name : id }
    : null;
}

function provenance(row: any) {
  return {
    sourceType: row.source_type ?? row.type ?? undefined,
    sourceId: row.source_id ?? undefined,
    sourceTitle: row.source_title ?? row.title ?? undefined,
    sourceUrl: row.source_url ?? row.url ?? undefined,
    doi: row.doi ?? undefined,
    pmid: row.pmid ?? undefined,
    license: row.license ?? undefined,
  };
}

export function normalizeQueueRow(row: any, allowedActions: string[]) {
  const rawProvenance = Array.isArray(row.provenance) ? row.provenance : [];
  return {
    id: row.id,
    versionId: row.version_id,
    rowVersion: Number(row.row_version),
    title: row.title,
    kind: row.kind,
    editorialStatus: row.editorial_status,
    technicalStatus: row.technical_status,
    assignee: person(row.assignee_id, row.assignee_name),
    priority: row.priority ?? "normal",
    dueAt: row.due_at ?? null,
    validUntil: row.valid_until ?? null,
    provenance: rawProvenance.map(provenance),
    allowedActions,
  };
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
            v.editorial_status, v.technical_status, v.authored_by, v.submitted_by,
            a.assignee_id, ap.full_name AS assignee_name,
            a.priority, a.due_at,
            r.valid_until,
            source_agg.provenance,
            i.updated_at
       FROM knowledge_items i
       JOIN LATERAL (
         SELECT * FROM knowledge_item_versions candidate
          WHERE candidate.organization_id = i.organization_id AND candidate.item_id = i.id
          ORDER BY candidate.version_number DESC LIMIT 1
       ) v ON true
       LEFT JOIN knowledge_assignments a ON a.organization_id = i.organization_id
         AND a.version_id = v.id AND a.completed_at IS NULL AND a.assignment_type = 'owner'
       LEFT JOIN profiles ap ON ap.organization_id = i.organization_id
         AND ap.user_id = a.assignee_id
       LEFT JOIN LATERAL (
         SELECT valid_until FROM knowledge_reviews review
          WHERE review.organization_id = i.organization_id AND review.version_id = v.id
            AND review.action = 'approve'
          ORDER BY review.created_at DESC LIMIT 1
       ) r ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
           'type', source.source_type, 'title', source.title, 'url', source.url,
           'doi', source.doi, 'pmid', source.pmid, 'license', source.license
         )), '[]'::jsonb) AS provenance
           FROM knowledge_sources source
          WHERE source.organization_id = i.organization_id
            AND source.item_id = i.id
            AND (source.version_id IS NULL OR source.version_id = v.id)
       ) source_agg ON true
      WHERE i.organization_id = $1 AND i.deleted_at IS NULL
        AND ($2::text IS NULL
          OR ($2 = 'inbox' AND v.editorial_status IN ('draft', 'triage'))
          OR ($2 = 'technical_failures' AND v.technical_status = 'failed')
          OR v.editorial_status = $2)
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
    `SELECT v.editorial_status, v.technical_status, count(*)::int AS count
       FROM knowledge_items i
       JOIN LATERAL (SELECT editorial_status, technical_status FROM knowledge_item_versions candidate
         WHERE candidate.organization_id = i.organization_id AND candidate.item_id = i.id
         ORDER BY version_number DESC LIMIT 1) v ON true
      WHERE i.organization_id = $1 AND i.deleted_at IS NULL
      GROUP BY v.editorial_status, v.technical_status`,
    [user.organizationId],
  );
  const hasMore = result.rows.length > input.limit;
  const rows = result.rows.slice(0, input.limit);
  const data = rows.map((row: any) => normalizeQueueRow(row, allowedKnowledgeActions({
      status: row.editorial_status,
      actorId: user.uid,
      submittedBy: row.submitted_by,
      authoredBy: row.authored_by,
      capabilities,
    })));
  const last = rows.at(-1);
  return c.json({
    data,
    meta: {
      nextCursor:
        hasMore && last
          ? encodeCursor({ updatedAt: String(last.updated_at), id: last.id })
          : null,
      counts: countResult.rows.reduce(
        (counts: Record<string, number>, row: any) => {
          const count = Number(row.count);
          counts[row.editorial_status] =
            (counts[row.editorial_status] ?? 0) + count;
          if (["draft", "triage"].includes(row.editorial_status))
            counts.inbox = (counts.inbox ?? 0) + count;
          if (row.technical_status === "failed")
            counts.technical_failures =
              (counts.technical_failures ?? 0) + count;
          return counts;
        },
        {},
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
            v.content, v.metadata, v.editorial_status, v.technical_status,
            v.authored_by, v.submitted_by
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
      `SELECT source_type, source_id, title, url, doi, pmid, license
         FROM knowledge_sources WHERE organization_id = $1 AND item_id = $2 ORDER BY created_at`,
      [user.organizationId, id],
    ),
    pool.query(
      `SELECT r.action, r.reason, r.valid_until, r.created_at,
              r.reviewer_id, rp.full_name reviewer_name,
              r.approved_by, ap.full_name approved_name
         FROM knowledge_reviews r
         LEFT JOIN profiles rp ON rp.organization_id = r.organization_id AND rp.user_id = r.reviewer_id
         LEFT JOIN profiles ap ON ap.organization_id = r.organization_id AND ap.user_id = r.approved_by
        WHERE r.organization_id = $1 AND r.item_id = $2 ORDER BY r.created_at DESC`,
      [user.organizationId, id],
    ),
    pool.query(
      `SELECT a.assignment_type, a.assignee_id, p.full_name assignee_name,
              a.priority, a.due_at, a.created_at
         FROM knowledge_assignments a LEFT JOIN profiles p
           ON p.organization_id = a.organization_id AND p.user_id = a.assignee_id
        WHERE a.organization_id = $1 AND a.item_id = $2 AND a.completed_at IS NULL
        ORDER BY a.created_at DESC`,
      [user.organizationId, id],
    ),
  ]);
  const row: any = item.rows[0];
  return c.json({
    data: {
      id: row.id,
      versionId: row.version_id,
      rowVersion: Number(row.row_version),
      title: row.version_title,
      kind: row.kind,
      editorialStatus: row.editorial_status,
      technicalStatus: row.technical_status,
      summary: row.metadata?.summary ?? null,
      limitations: row.metadata?.limitations ?? null,
      sources: sources.rows.map(provenance),
      reviews: reviews.rows.map((review: any) => ({
        decision: review.action,
        reason: review.reason ?? null,
        reviewedAt: review.created_at,
        validUntil: review.valid_until ?? null,
        reviewer: person(review.reviewer_id, review.reviewer_name),
        approvedBy: person(review.approved_by, review.approved_name),
      })),
      assignments: assignments.rows.map((assignment: any) => ({
        assignmentType: assignment.assignment_type,
        assignee: person(assignment.assignee_id, assignment.assignee_name),
        priority: assignment.priority,
        dueAt: assignment.due_at ?? null,
      })),
      allowedActions: allowedKnowledgeActions({
        status: row.editorial_status,
        actorId: user.uid,
        submittedBy: row.submitted_by,
        authoredBy: row.authored_by,
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
  await pool.query(
    `DELETE FROM knowledge_idempotency_keys
      WHERE organization_id = $1 AND actor_id = $2 AND operation = $3
        AND idempotency_key = $4 AND expires_at <= now()`,
    [user.organizationId, user.uid, `transition:${id}`, key],
  );
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
            v.editorial_status, v.authored_by, v.submitted_by,
            EXISTS (
              SELECT 1 FROM knowledge_assignments assignment
               WHERE assignment.organization_id = i.organization_id
                 AND assignment.version_id = v.id
                 AND assignment.assignee_id = $4 AND assignment.completed_at IS NULL
            ) AS actor_is_assigned,
            EXISTS (
              SELECT 1 FROM knowledge_reviews approval
              JOIN knowledge_capability_grants grant_row
                ON grant_row.organization_id = approval.organization_id
               AND grant_row.user_id = approval.approved_by
               AND grant_row.capability = 'clinical_review'
               AND grant_row.revoked_at IS NULL
               WHERE approval.organization_id = i.organization_id
                 AND approval.version_id = v.id AND approval.action = 'approve'
                 AND approval.valid_until IS NOT NULL
                 AND approval.valid_until >= CURRENT_DATE
            ) AS has_current_approval
       FROM knowledge_items i JOIN knowledge_item_versions v
         ON v.organization_id = i.organization_id AND v.item_id = i.id
      WHERE i.organization_id = $1 AND i.id = $2 AND v.id = $3 AND i.deleted_at IS NULL`,
    [user.organizationId, id, body.versionId, user.uid],
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
    authoredBy: row.authored_by,
    isAssigned: row.actor_is_assigned === true,
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
  if (body.action === "publish" && row.has_current_approval !== true) {
    return errorResponse(
      c,
      409,
      "APPROVAL_NOT_CURRENT",
      "A versão não possui aprovação clínica vigente",
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
          AND ($8 <> 'publish' OR EXISTS (
            SELECT 1 FROM knowledge_reviews approval
            JOIN knowledge_capability_grants grant_row
              ON grant_row.organization_id = approval.organization_id
             AND grant_row.user_id = approval.approved_by
             AND grant_row.capability = 'clinical_review'
             AND grant_row.revoked_at IS NULL
             WHERE approval.organization_id = $1 AND approval.version_id = $5
               AND approval.action = 'approve' AND approval.valid_until IS NOT NULL
               AND approval.valid_until >= CURRENT_DATE))
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
  const key = c.req.header("Idempotency-Key")?.trim();
  if (!key)
    return errorResponse(
      c,
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Idempotency-Key é obrigatório",
    );
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
  const operation = `assignment:${id}:${body.assignmentType}`;
  const hash = await payloadHash(body);
  await pool.query(
    `DELETE FROM knowledge_idempotency_keys
      WHERE organization_id = $1 AND actor_id = $2 AND operation = $3
        AND idempotency_key = $4 AND expires_at <= now()`,
    [user.organizationId, user.uid, operation, key],
  );
  const prior = await pool.query(
    `SELECT payload_hash, response_status, response_body FROM knowledge_idempotency_keys
      WHERE organization_id = $1 AND actor_id = $2 AND operation = $3
        AND idempotency_key = $4 AND expires_at > now()`,
    [user.organizationId, user.uid, operation, key],
  );
  if (prior.rows[0]) {
    if (prior.rows[0].payload_hash !== hash)
      return errorResponse(c, 409, "IDEMPOTENCY_CONFLICT", "Chave reutilizada com outro payload");
    return c.json(prior.rows[0].response_body, prior.rows[0].response_status ?? 201);
  }
  const result = await pool.query(
    `WITH valid_assignee AS (
       SELECT p.user_id FROM profiles p
        WHERE p.organization_id = $1 AND p.user_id = $6 AND p.is_active IS NOT FALSE
     ), changed_item AS (
       UPDATE knowledge_items SET row_version = row_version + 1, updated_at = now()
        WHERE organization_id = $1 AND id = $2 AND row_version = $3 AND deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM knowledge_item_versions guard
            WHERE guard.organization_id = $1 AND guard.item_id = $2 AND guard.id = $4)
          AND EXISTS (SELECT 1 FROM valid_assignee)
        RETURNING row_version
     ), completed AS (
       UPDATE knowledge_assignments SET completed_at = now(), updated_at = now()
        WHERE organization_id = $1 AND version_id = $4 AND assignment_type = $5
          AND completed_at IS NULL AND EXISTS (SELECT 1 FROM changed_item)
     ), inserted AS (
     INSERT INTO knowledge_assignments
       (organization_id,item_id,version_id,assignment_type,assignee_id,priority,due_at,assigned_by)
     SELECT $1,$2,v.id,$5,$6,$7,$8,$9 FROM knowledge_item_versions v
      WHERE v.organization_id = $1 AND v.item_id = $2 AND v.id = $4
        AND EXISTS (SELECT 1 FROM changed_item) RETURNING *
     ), audit AS (
       INSERT INTO knowledge_audit_events
         (organization_id,actor_id,entity_type,entity_id,action,request_id,metadata)
       SELECT $1,$9,'knowledge_item',$2,'assignment',$10,
              jsonb_build_object('versionId',$4,'assignmentType',$5,'assigneeId',$6,
                                 'priority',$7,'dueAt',$8)
         FROM inserted RETURNING id
     ), idempotency AS (
       INSERT INTO knowledge_idempotency_keys
         (organization_id,actor_id,operation,idempotency_key,payload_hash,response_status,response_body)
       SELECT $1,$9,$11,$12,$13,201,
              jsonb_build_object('data',to_jsonb(inserted.*),
                                 'meta',jsonb_build_object('requestId',$10))
         FROM inserted RETURNING idempotency_key
     ) SELECT * FROM inserted`,
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
      requestId(c),
      operation,
      key,
      hash,
    ],
  );
  if (!result.rows[0])
    return errorResponse(c, 404, "ASSIGNEE_OR_ITEM_NOT_FOUND", "Responsável, item ou versão não encontrado");
  return c.json(
    { data: result.rows[0], meta: { requestId: requestId(c) } },
    201,
  );
});

export { app as wikiCurationRoutes };
