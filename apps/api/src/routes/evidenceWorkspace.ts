import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables, userHasRole } from "../lib/auth";
import { getRawSql } from "../lib/db";
import { searchPubmed } from "../lib/evidence/sources/pubmed";
import { upsertArticles } from "../lib/evidence/cache";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const uuid = z.string().uuid();
const workspaceQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(15),
    cursorUpdatedAt: z.string().datetime({ offset: true }).optional(),
    cursorId: uuid.optional(),
    importStatus: z
      .enum([
        "pending",
        "fetching",
        "imported",
        "failed",
        "cancelled",
        "identifier_conflict",
      ])
      .optional(),
    indexStatus: z
      .enum(["not_started", "queued", "processing", "indexed", "failed"])
      .optional(),
    reviewStatus: z
      .enum(["pending", "in_review", "verified", "rejected", "archived"])
      .optional(),
    q: z.string().trim().max(160).optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.cursorUpdatedAt) !== Boolean(value.cursorId)) {
      ctx.addIssue({
        code: "custom",
        message: "cursorUpdatedAt e cursorId devem ser enviados juntos",
      });
    }
  });

const importBody = z.object({
  type: z.enum(["doi", "pmid"]),
  identifier: z.string().trim().min(1).max(255),
});
const collectionCreate = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  scope: z.enum(["personal", "organization"]).default("personal"),
});
const collectionUpdate = collectionCreate
  .partial()
  .refine((value) => Object.keys(value).length > 0);
const itemCreate = z.object({
  articleId: uuid,
  position: z.number().int().min(0).default(0),
  note: z.string().trim().max(2000).nullable().optional(),
});
const itemUpdate = z
  .object({
    position: z.number().int().min(0).optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
const compareBody = z
  .object({ articleIds: z.array(uuid).min(2).max(3) })
  .refine(
    (value) => new Set(value.articleIds).size === value.articleIds.length,
    { message: "articleIds não podem se repetir" },
  );
const reviewBody = z.object({
  action: z.enum(["start_review", "verify", "reject", "reopen", "archive"]),
  note: z.string().trim().max(4000).nullable().optional(),
  validUntil: z.iso.date().nullable().optional(),
});

type AppContext = Parameters<Parameters<typeof app.onError>[0]>[1];

function requestId(c: AppContext): string {
  return c.get("requestId") ?? c.req.header("X-Request-ID") ?? "unknown";
}

function errorResponse(
  c: AppContext,
  status: 400 | 403 | 404 | 409 | 422 | 502 | 503,
  code: string,
  message: string,
) {
  return c.json(
    { data: null, error: { code, message, requestId: requestId(c) } },
    status,
  );
}

function isMissingSchema(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  return (
    candidate?.code === "42P01" ||
    /relation .* does not exist/i.test(candidate?.message ?? "")
  );
}

export function normalizeDoi(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^doi:\s*/, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "")
    .replace(/\s+/g, "");
  return /^10\.\d{4,9}\/\S+$/.test(normalized) ? normalized : null;
}

export function normalizePmid(value: string): string | null {
  const normalized = value.trim();
  return /^\d{1,12}$/.test(normalized) ? normalized : null;
}

function canAdminister(roleUser: { role?: string; roles?: string[] }): boolean {
  return userHasRole(roleUser as never, ["owner", "admin"]);
}

app.onError((error, c) => {
  if (error instanceof z.ZodError)
    return errorResponse(
      c,
      422,
      "VALIDATION_ERROR",
      error.issues[0]?.message ?? "Entrada inválida",
    );
  if (isMissingSchema(error))
    return errorResponse(
      c,
      503,
      "SCHEMA_UNAVAILABLE",
      "Workspace de evidências ainda não está disponível",
    );
  console.error("[evidence-workspace] request failed", error);
  return errorResponse(
    c,
    502,
    "WORKSPACE_ERROR",
    "Não foi possível concluir a operação",
  );
});

app.get("/workspace", requireAuth, async (c) => {
  const input = workspaceQuery.parse(c.req.query());
  const user = c.get("user");
  const sql = getRawSql(c.env, "read");
  const result = await sql(
    `SELECT oe.article_id, er.pmid, er.doi, ea.title, ea.abstract, ea.authors,
            ea.journal, ea.pub_date, ea.study_type, ea.pmc_id,
            oe.import_status, oe.index_status, oe.review_status, oe.license_status,
            oe.imported_at, oe.updated_at
       FROM organization_evidence oe
       JOIN evidence_resources er ON er.article_id = oe.article_id
       LEFT JOIN evidence_articles ea ON ea.pmid = er.pmid
      WHERE oe.organization_id = $1
        AND ($2::timestamptz IS NULL OR (oe.updated_at, oe.article_id) < ($2::timestamptz, $3::uuid))
        AND ($4::text IS NULL OR oe.import_status = $4)
        AND ($5::text IS NULL OR oe.index_status = $5)
        AND ($6::text IS NULL OR oe.review_status = $6)
        AND ($7::text IS NULL OR ea.title ILIKE '%' || $7 || '%' OR er.pmid = $7 OR er.doi = lower($7))
      ORDER BY oe.updated_at DESC, oe.article_id DESC
      LIMIT $8`,
    [
      user.organizationId,
      input.cursorUpdatedAt ?? null,
      input.cursorId ?? null,
      input.importStatus ?? null,
      input.indexStatus ?? null,
      input.reviewStatus ?? null,
      input.q || null,
      input.limit + 1,
    ],
  );
  const rows = result.rows ?? [];
  const hasMore = rows.length > input.limit;
  const data = rows.slice(0, input.limit);
  const last = data.at(-1);
  const collections = await sql(
    `SELECT c.id, c.name, count(i.id)::int AS article_count
       FROM evidence_collections c
       LEFT JOIN evidence_collection_items i
         ON i.organization_id = c.organization_id
        AND i.collection_id = c.id
        AND i.deleted_at IS NULL
      WHERE c.organization_id = $1
        AND c.deleted_at IS NULL
        AND (c.scope = 'organization' OR c.owner_id = $2)
      GROUP BY c.id, c.name
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT 50`,
    [user.organizationId, user.uid],
  );
  return c.json({
    data: {
      articles: data,
      collections: collections.rows ?? [],
      capabilities: {
        import: true,
        collections: true,
        patientContext: false,
      },
    },
    meta: {
      limit: input.limit,
      hasMore,
      nextCursor:
        hasMore && last
          ? { updatedAt: last.updated_at, id: last.article_id }
          : null,
    },
  });
});

app.post("/import", requireAuth, async (c) => {
  const body = importBody.parse(await c.req.json());
  const requestedDoi =
    body.type === "doi" ? normalizeDoi(body.identifier) : null;
  const requestedPmid =
    body.type === "pmid" ? normalizePmid(body.identifier) : null;
  if (!requestedDoi && !requestedPmid)
    return errorResponse(c, 422, "INVALID_IDENTIFIER", "DOI ou PMID inválido");

  let articles;
  try {
    articles = await searchPubmed(c.env, {
      q: requestedPmid ? `${requestedPmid}[pmid]` : `${requestedDoi}[doi]`,
      limit: 3,
      sort: "relevance",
    });
  } catch {
    return errorResponse(
      c,
      502,
      "PUBMED_UNAVAILABLE",
      "PubMed indisponível; tente novamente",
    );
  }
  const article = articles.find((candidate) =>
    requestedPmid
      ? candidate.pmid === requestedPmid
      : normalizeDoi(candidate.doi ?? "") === requestedDoi,
  );
  if (!article)
    return errorResponse(
      c,
      422,
      "IDENTIFIER_NOT_FOUND",
      "Identificador não encontrado no PubMed",
    );
  const doi = normalizeDoi(article.doi ?? requestedDoi ?? "");
  const pmid = normalizePmid(article.pmid);
  if (!pmid)
    return errorResponse(
      c,
      422,
      "INVALID_PUBMED_RESPONSE",
      "PubMed retornou metadados inválidos",
    );

  const sql = getRawSql(c.env, "write");
  await upsertArticles((query, params) => sql(query, params), [article]);
  const existing = await sql(
    `SELECT article_id, pmid, doi FROM evidence_resources
      WHERE pmid = $1 OR ($2::text IS NOT NULL AND doi = $2)
      ORDER BY article_id`,
    [pmid, doi],
  );
  const distinctIds = new Set(
    (existing.rows ?? []).map((row) => row.article_id),
  );
  if (
    distinctIds.size > 1 ||
    existing.rows?.some(
      (row) =>
        (row.pmid && row.pmid !== pmid) || (row.doi && doi && row.doi !== doi),
    )
  ) {
    return errorResponse(
      c,
      409,
      "IDENTIFIER_CONFLICT",
      "DOI e PMID pertencem a recursos diferentes",
    );
  }
  if (existing.rows?.length === 1) {
    await sql(
      `UPDATE evidence_resources
          SET pmid = COALESCE(pmid, $2), doi = COALESCE(doi, $3), updated_at = now()
        WHERE article_id = $1`,
      [existing.rows[0].article_id, pmid, doi],
    );
  }
  await sql(
    `INSERT INTO evidence_resources (pmid, doi) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [pmid, doi],
  );
  const resource = await sql(
    `SELECT article_id, pmid, doi FROM evidence_resources WHERE pmid = $1`,
    [pmid],
  );
  const row = resource.rows?.[0];
  if (!row) throw new Error("evidence resource was not created");
  const prior = await sql(
    `SELECT 1 FROM organization_evidence WHERE organization_id = $1 AND article_id = $2`,
    [c.get("user").organizationId, row.article_id],
  );
  const duplicate = Boolean(prior.rows?.length);
  await sql(
    `INSERT INTO organization_evidence (organization_id, article_id, imported_by, import_status, license_status)
     VALUES ($1,$2,$3,'imported',$4)
     ON CONFLICT (organization_id, article_id) DO UPDATE SET updated_at = organization_evidence.updated_at
     RETURNING *`,
    [
      c.get("user").organizationId,
      row.article_id,
      c.get("user").uid,
      article.abstract ? "abstract_only" : "unknown",
    ],
  );
  return c.json(
    { data: { articleId: row.article_id, pmid, doi, duplicate } },
    duplicate ? 200 : 202,
  );
});

app.get("/collections", requireAuth, async (c) => {
  const user = c.get("user");
  const sql = getRawSql(c.env, "read");
  const result = await sql(
    `SELECT c.*, count(i.id)::int AS item_count
       FROM evidence_collections c LEFT JOIN evidence_collection_items i
         ON i.organization_id = c.organization_id AND i.collection_id = c.id AND i.deleted_at IS NULL
      WHERE c.organization_id = $1 AND c.deleted_at IS NULL
        AND (c.scope = 'organization' OR c.owner_id = $2)
      GROUP BY c.id ORDER BY c.updated_at DESC, c.id DESC LIMIT 50`,
    [user.organizationId, user.uid],
  );
  return c.json({ data: result.rows ?? [], meta: { limit: 50 } });
});

app.post("/collections", requireAuth, async (c) => {
  const body = collectionCreate.parse(await c.req.json());
  const user = c.get("user");
  const result = await getRawSql(c.env, "write")(
    `INSERT INTO evidence_collections (organization_id, owner_id, name, description, scope)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [
      user.organizationId,
      user.uid,
      body.name,
      body.description ?? null,
      body.scope,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.patch("/collections/:id", requireAuth, async (c) => {
  const id = uuid.parse(c.req.param("id"));
  const body = collectionUpdate.parse(await c.req.json());
  const user = c.get("user");
  const result = await getRawSql(c.env, "write")(
    `UPDATE evidence_collections SET name = COALESCE($4, name), description = CASE WHEN $5 THEN $6 ELSE description END,
            scope = COALESCE($7, scope), updated_at = now()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        AND (owner_id = $3 OR (scope = 'organization' AND $8::boolean)) RETURNING *`,
    [
      id,
      user.organizationId,
      user.uid,
      body.name ?? null,
      Object.hasOwn(body, "description"),
      body.description ?? null,
      body.scope ?? null,
      canAdminister(user),
    ],
  );
  if (!result.rows?.[0])
    return errorResponse(
      c,
      404,
      "COLLECTION_NOT_FOUND",
      "Coleção não encontrada",
    );
  return c.json({ data: result.rows[0] });
});

app.delete("/collections/:id", requireAuth, async (c) => {
  const id = uuid.parse(c.req.param("id"));
  const user = c.get("user");
  const result = await getRawSql(c.env, "write")(
    `WITH deleted_collection AS (
       UPDATE evidence_collections SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
          AND (owner_id = $3 OR (scope = 'organization' AND $4::boolean)) RETURNING id
     ), deleted_items AS (
       UPDATE evidence_collection_items SET deleted_at = now(), updated_at = now()
        WHERE organization_id = $2 AND collection_id IN (SELECT id FROM deleted_collection)
          AND deleted_at IS NULL RETURNING id
     ) SELECT id FROM deleted_collection`,
    [id, user.organizationId, user.uid, canAdminister(user)],
  );
  if (!result.rows?.[0])
    return errorResponse(
      c,
      404,
      "COLLECTION_NOT_FOUND",
      "Coleção não encontrada",
    );
  return c.json({ data: { id, deleted: true } });
});

app.post("/resources/:articleId/review", requireAuth, async (c) => {
  const articleId = uuid.parse(c.req.param("articleId"));
  const body = reviewBody.parse(await c.req.json());
  const user = c.get("user");
  const clinicalReviewer = userHasRole(user, [
    "owner",
    "admin",
    "fisioterapeuta",
  ]);
  const administrator = canAdminister(user);
  if (
    !clinicalReviewer ||
    ((["reopen", "archive"] as string[]).includes(body.action) &&
      !administrator)
  ) {
    return errorResponse(
      c,
      403,
      "FORBIDDEN",
      "Perfil sem permissão para esta ação",
    );
  }
  const sql = getRawSql(c.env, "write");
  const current = await sql(
    `SELECT review_status FROM organization_evidence WHERE organization_id = $1 AND article_id = $2`,
    [user.organizationId, articleId],
  );
  const currentStatus = current.rows?.[0]?.review_status as string | undefined;
  if (!currentStatus)
    return errorResponse(
      c,
      404,
      "ARTICLE_NOT_FOUND",
      "Evidência não encontrada",
    );
  const transitions: Record<string, { from: string[]; to: string }> = {
    start_review: { from: ["pending"], to: "in_review" },
    verify: { from: ["in_review"], to: "verified" },
    reject: { from: ["in_review"], to: "rejected" },
    reopen: { from: ["verified", "rejected", "archived"], to: "in_review" },
    archive: {
      from: ["pending", "in_review", "verified", "rejected"],
      to: "archived",
    },
  };
  const transition = transitions[body.action];
  if (!transition.from.includes(currentStatus)) {
    return errorResponse(
      c,
      409,
      "INVALID_STATE",
      `Transição inválida a partir de ${currentStatus}`,
    );
  }
  const result = await sql(
    `WITH changed AS (
       UPDATE organization_evidence SET review_status = $3, updated_at = now()
        WHERE organization_id = $1 AND article_id = $2 AND review_status = $4 RETURNING article_id
     )
     INSERT INTO evidence_reviews (organization_id, article_id, reviewer_id, status, valid_until, note)
     SELECT $1, article_id, $5, $3, $6, $7 FROM changed RETURNING *`,
    [
      user.organizationId,
      articleId,
      transition.to,
      currentStatus,
      user.uid,
      body.validUntil ?? null,
      body.note ?? null,
    ],
  );
  if (!result.rows?.[0])
    return errorResponse(
      c,
      409,
      "INVALID_STATE",
      "O estado foi alterado por outra sessão",
    );
  return c.json({ data: result.rows[0] }, 201);
});

app.get("/collections/:id/items", requireAuth, async (c) => {
  const id = uuid.parse(c.req.param("id"));
  const user = c.get("user");
  const result = await getRawSql(c.env, "read")(
    `SELECT i.*, er.pmid, er.doi, ea.title, ea.journal, ea.pub_date
       FROM evidence_collection_items i
       JOIN evidence_collections c ON c.organization_id = i.organization_id AND c.id = i.collection_id
       JOIN evidence_resources er ON er.article_id = i.article_id
       LEFT JOIN evidence_articles ea ON ea.pmid = er.pmid
      WHERE i.organization_id = $1 AND i.collection_id = $2 AND i.deleted_at IS NULL AND c.deleted_at IS NULL
        AND (c.scope = 'organization' OR c.owner_id = $3)
      ORDER BY i.position, i.created_at`,
    [user.organizationId, id, user.uid],
  );
  return c.json({ data: result.rows ?? [] });
});

app.post("/collections/:id/items", requireAuth, async (c) => {
  const collectionId = uuid.parse(c.req.param("id"));
  const body = itemCreate.parse(await c.req.json());
  const user = c.get("user");
  const result = await getRawSql(c.env, "write")(
    `INSERT INTO evidence_collection_items (organization_id, collection_id, article_id, position, note)
     SELECT $1, c.id, $4, $5, $6 FROM evidence_collections c
      WHERE c.organization_id = $1 AND c.id = $2 AND c.deleted_at IS NULL
        AND (c.owner_id = $3 OR (c.scope = 'organization' AND $7::boolean))
        AND EXISTS (SELECT 1 FROM organization_evidence oe WHERE oe.organization_id = $1 AND oe.article_id = $4)
     ON CONFLICT (organization_id, collection_id, article_id) WHERE deleted_at IS NULL
     DO UPDATE SET position = EXCLUDED.position, note = EXCLUDED.note, updated_at = now()
     RETURNING *`,
    [
      user.organizationId,
      collectionId,
      user.uid,
      body.articleId,
      body.position,
      body.note ?? null,
      canAdminister(user),
    ],
  );
  if (!result.rows?.[0])
    return errorResponse(
      c,
      404,
      "COLLECTION_OR_ARTICLE_NOT_FOUND",
      "Coleção ou artigo não encontrado",
    );
  return c.json({ data: result.rows[0] }, 201);
});

app.patch(
  "/collections/:collectionId/items/:itemId",
  requireAuth,
  async (c) => {
    const collectionId = uuid.parse(c.req.param("collectionId"));
    const itemId = uuid.parse(c.req.param("itemId"));
    const body = itemUpdate.parse(await c.req.json());
    const user = c.get("user");
    const result = await getRawSql(c.env, "write")(
      `UPDATE evidence_collection_items i SET position = COALESCE($5, i.position), note = CASE WHEN $6 THEN $7 ELSE i.note END, updated_at = now()
      FROM evidence_collections c WHERE i.id = $1 AND i.collection_id = $2 AND i.organization_id = $3
       AND c.id = i.collection_id AND c.organization_id = i.organization_id AND i.deleted_at IS NULL AND c.deleted_at IS NULL
       AND (c.owner_id = $4 OR (c.scope = 'organization' AND $8::boolean)) RETURNING i.*`,
      [
        itemId,
        collectionId,
        user.organizationId,
        user.uid,
        body.position ?? null,
        Object.hasOwn(body, "note"),
        body.note ?? null,
        canAdminister(user),
      ],
    );
    if (!result.rows?.[0])
      return errorResponse(c, 404, "ITEM_NOT_FOUND", "Item não encontrado");
    return c.json({ data: result.rows[0] });
  },
);

app.delete(
  "/collections/:collectionId/items/:itemId",
  requireAuth,
  async (c) => {
    const collectionId = uuid.parse(c.req.param("collectionId"));
    const itemId = uuid.parse(c.req.param("itemId"));
    const user = c.get("user");
    const result = await getRawSql(c.env, "write")(
      `UPDATE evidence_collection_items i SET deleted_at = now(), updated_at = now()
      FROM evidence_collections c WHERE i.id = $1 AND i.collection_id = $2 AND i.organization_id = $3
       AND c.id = i.collection_id AND c.organization_id = i.organization_id AND i.deleted_at IS NULL
       AND (c.owner_id = $4 OR (c.scope = 'organization' AND $5::boolean)) RETURNING i.id`,
      [
        itemId,
        collectionId,
        user.organizationId,
        user.uid,
        canAdminister(user),
      ],
    );
    if (!result.rows?.[0])
      return errorResponse(c, 404, "ITEM_NOT_FOUND", "Item não encontrado");
    return c.json({ data: { id: itemId, deleted: true } });
  },
);

app.post("/compare", requireAuth, async (c) => {
  const body = compareBody.parse(await c.req.json());
  const user = c.get("user");
  const result = await getRawSql(c.env, "read")(
    `SELECT oe.article_id, er.pmid, er.doi, ea.title, ea.abstract, ea.authors, ea.journal,
            ea.pub_date, ea.study_type, ea.raw
       FROM organization_evidence oe JOIN evidence_resources er ON er.article_id = oe.article_id
       LEFT JOIN evidence_articles ea ON ea.pmid = er.pmid
      WHERE oe.organization_id = $1 AND oe.article_id = ANY($2::uuid[])`,
    [user.organizationId, body.articleIds],
  );
  if ((result.rows ?? []).length !== body.articleIds.length)
    return errorResponse(
      c,
      404,
      "ARTICLE_NOT_FOUND",
      "Uma ou mais evidências não foram encontradas",
    );
  const byId = new Map(result.rows.map((row) => [row.article_id, row]));
  const data = body.articleIds.map((id) => {
    const row = byId.get(id)!;
    const raw = row.raw && typeof row.raw === "object" ? row.raw : {};
    return {
      articleId: id,
      pmid: row.pmid,
      doi: row.doi,
      title: row.title ?? "Não informado",
      authors: row.authors ?? [],
      journal: row.journal ?? "Não informado",
      publicationDate: row.pub_date ?? "Não informado",
      studyDesign: row.study_type ?? raw.study_type ?? "Não informado",
      population: raw.population ?? "Não informado",
      intervention: raw.intervention ?? "Não informado",
      comparator: raw.comparator ?? "Não informado",
      outcomes: raw.outcomes ?? "Não informado",
      sampleSize: raw.sample_size ?? "Não informado",
      limitations: raw.limitations ?? "Não informado",
      evidenceLevel: raw.evidence_level ?? "Não informado",
      conclusion: raw.conclusion ?? "Não informado",
      abstract: row.abstract ?? "Não informado",
    };
  });
  return c.json({
    data,
    meta: {
      generated: false,
      deterministic: true,
      warning: "Campos ausentes não foram inferidos",
    },
  });
});

export { app as evidenceWorkspaceRoutes };
export default app;
