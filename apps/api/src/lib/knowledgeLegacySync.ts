import type { Env } from "../types/env";
import { getRawSql } from "./db";

type LegacySourceType = "wiki_pages" | "knowledge_articles" | "organization_evidence";

interface LegacyKnowledgeInput {
  organizationId: string;
  actorId: string;
  sourceType: LegacySourceType;
  sourceId: string;
  kind: "page" | "source";
  title: string;
  content?: string | null;
  source?: {
    type: "knowledge_articles" | "evidence_resources";
    title: string;
    url?: string | null;
    doi?: string | null;
    pmid?: string | null;
  };
}

interface LegacyKnowledgeUpdateInput extends LegacyKnowledgeInput {
  source?: LegacyKnowledgeInput["source"];
}

/**
 * Materializa uma criação legada na fila canônica. IDs determinísticos tornam a
 * operação segura para retry e para o backfill de reconciliação.
 */
export async function syncLegacyKnowledgeItem(
  env: Env,
  input: LegacyKnowledgeInput,
): Promise<void> {
  const sql = getRawSql(env, "write");
  await sql(
    `WITH identity AS (
       SELECT md5($1::text || ':' || $2 || ':' || $3)::uuid AS item_id,
              md5($1::text || ':' || $2 || ':' || $3 || ':v1')::uuid AS version_id
     ), item AS (
       INSERT INTO knowledge_items
         (id, organization_id, kind, title, created_by)
       SELECT item_id, $1, $4, left(COALESCE(NULLIF(btrim($5), ''), 'Conteúdo sem título'), 500), $6
         FROM identity
       ON CONFLICT (id) DO NOTHING
       RETURNING id
     ), source_map AS (
       INSERT INTO knowledge_source_map
         (organization_id, source_type, source_id, knowledge_item_id)
       SELECT $1, $2, $3, item_id FROM identity
       ON CONFLICT (organization_id, source_type, source_id) DO NOTHING
       RETURNING id
     ), version AS (
       INSERT INTO knowledge_item_versions
         (id, organization_id, item_id, version_number, title, content,
          editorial_status, authored_by)
       SELECT version_id, $1, item_id, 1,
              left(COALESCE(NULLIF(btrim($5), ''), 'Conteúdo sem título'), 500),
              COALESCE($7, ''), 'triage', $6
         FROM identity
       ON CONFLICT (organization_id, item_id, version_number) DO NOTHING
       RETURNING id
     )
     INSERT INTO knowledge_sources
       (organization_id, item_id, version_id, source_type, source_id, title, url, doi, pmid)
     SELECT $1, item_id, version_id, $8, $3,
            left(COALESCE(NULLIF(btrim($9), ''), 'Fonte sem título'), 500),
            $10, $11, $12
       FROM identity
      WHERE $8::text IS NOT NULL
     ON CONFLICT (organization_id, version_id, source_type, source_id)
       WHERE version_id IS NOT NULL AND source_id IS NOT NULL
     DO NOTHING`,
    [
      input.organizationId,
      input.sourceType,
      input.sourceId,
      input.kind,
      input.title,
      input.actorId,
      input.content ?? "",
      input.source?.type ?? null,
      input.source?.title ?? input.title,
      input.source?.url ?? null,
      input.source?.doi ?? null,
      input.source?.pmid ?? null,
    ],
  );
}

/** Cria uma nova versão canônica quando o registro legado é editado. */
export async function syncLegacyKnowledgeUpdate(
  env: Env,
  input: LegacyKnowledgeUpdateInput,
): Promise<void> {
  const sql = getRawSql(env, "write");
  await sql(
    `WITH mapped AS (
       SELECT knowledge_item_id AS item_id
         FROM knowledge_source_map
        WHERE organization_id = $1 AND source_type = $2 AND source_id = $3
        LIMIT 1
     ), next_version AS (
       SELECT mapped.item_id, COALESCE(MAX(v.version_number), 0) + 1 AS version_number
         FROM mapped
         LEFT JOIN knowledge_item_versions v
           ON v.organization_id = $1 AND v.item_id = mapped.item_id
        GROUP BY mapped.item_id
     ), updated_item AS (
       UPDATE knowledge_items i
          SET title = left(COALESCE(NULLIF(btrim($4), ''), 'Conteúdo sem título'), 500),
              kind = $5,
              updated_at = now()
         FROM next_version n
        WHERE i.organization_id = $1 AND i.id = n.item_id
        RETURNING i.id
     ), inserted_version AS (
       INSERT INTO knowledge_item_versions
         (organization_id, item_id, version_number, title, content, metadata,
          editorial_status, technical_status, authored_by)
       SELECT $1, n.item_id, n.version_number,
              left(COALESCE(NULLIF(btrim($4), ''), 'Conteúdo sem título'), 500),
              COALESCE($6, ''), '{}'::jsonb, 'draft', 'not_started', $7
         FROM next_version n
        WHERE EXISTS (SELECT 1 FROM updated_item)
       RETURNING item_id, id
     )
     INSERT INTO knowledge_sources
       (organization_id, item_id, version_id, source_type, source_id, title, url, doi, pmid)
     SELECT $1, v.item_id, v.id, COALESCE($8, $2), $3,
            left(COALESCE(NULLIF(btrim($9), ''), $4), 500), $10, $11, $12
       FROM inserted_version v
      WHERE $8::text IS NOT NULL
     ON CONFLICT (organization_id, version_id, source_type, source_id)
       WHERE version_id IS NOT NULL AND source_id IS NOT NULL DO NOTHING`,
    [
      input.organizationId,
      input.sourceType,
      input.sourceId,
      input.title,
      input.kind,
      input.content ?? "",
      input.actorId,
      input.source?.type ?? null,
      input.source?.title ?? input.title,
      input.source?.url ?? null,
      input.source?.doi ?? null,
      input.source?.pmid ?? null,
    ],
  );
}

/** Arquiva a materialização quando a origem legada foi removida. */
export async function archiveLegacyKnowledgeSource(
  env: Env,
  input: Pick<LegacyKnowledgeInput, "organizationId" | "sourceType" | "sourceId" | "actorId">,
): Promise<void> {
  const sql = getRawSql(env, "write");
  await sql(
    `WITH mapped AS (
       SELECT knowledge_item_id AS item_id
         FROM knowledge_source_map
        WHERE organization_id = $1 AND source_type = $2 AND source_id = $3
        LIMIT 1
     ), unpublished AS (
       UPDATE knowledge_items i
          SET published_version_id = NULL, updated_at = now()
         FROM mapped m
        WHERE i.organization_id = $1 AND i.id = m.item_id
          AND i.published_version_id IS NOT NULL
        RETURNING i.id
     )
     UPDATE knowledge_items i
        SET deleted_at = now(), updated_at = now()
       FROM mapped m
      WHERE i.organization_id = $1 AND i.id = m.item_id`,
    [input.organizationId, input.sourceType, input.sourceId],
  );
}
