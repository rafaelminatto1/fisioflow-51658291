/**
 * WikiSyncWorkflow — Sincroniza páginas Wiki do Neon → AI Search
 *
 * Cron: 02h BRT (05h UTC) diariamente
 * Lógica: cron busca páginas modificadas nas últimas 25h; manual faz carga completa
 * Imediato: hook em routes/wiki.ts PUT dispara re-sync ao publicar
 */
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { neon } from "@neondatabase/serverless";
import { serializeWikiPageForIndex } from "../lib/wikiIndexing";

export type WikiSyncParams = {
  triggerType: "cron" | "manual" | "publish";
  wikiPageId?: string; // Se "publish", sincronizar apenas essa página
};

export class WikiSyncWorkflow extends WorkflowEntrypoint<Env, WikiSyncParams> {
  async run(event: WorkflowEvent<WikiSyncParams>, step: WorkflowStep) {
    const { triggerType, wikiPageId } = event.payload;
    // Default to "cron" when triggered via schedule (no payload)
    const syncType = triggerType ?? "cron";

    if (!this.env.AI_SEARCH) {
      console.warn("[WikiSyncWorkflow] AI_SEARCH binding not configured, skipping.");
      return { synced: 0, skipped: 0 };
    }

    const url = this.env.NEON_URL || this.env.HYPERDRIVE?.connectionString;
    if (!url) {
      console.warn("[WikiSyncWorkflow] Database URL not configured, skipping.");
      return { synced: 0, skipped: 0 };
    }

    // 1. Buscar páginas a sincronizar
    const pages = (await step.do("fetch-wiki-pages", async (): Promise<any[]> => {
      const sql = neon(url);
      if (syncType === "publish" && wikiPageId) {
        const rows = await sql`
          SELECT id, slug, title, content, html_content, category, tags, is_published
          FROM wiki_pages
          WHERE id = ${wikiPageId}
            AND is_published = true
        `;
        return rows as any[];
      }

      const rows = syncType === "manual"
        ? await sql`
          SELECT id, slug, title, content, html_content, category, tags, is_published
          FROM wiki_pages
          WHERE is_published = true
          ORDER BY updated_at DESC
          LIMIT 200
        `
        : await sql`
          SELECT id, slug, title, content, html_content, category, tags, is_published
          FROM wiki_pages
          WHERE is_published = true
            AND updated_at >= now() - INTERVAL '25 hours'
          ORDER BY updated_at DESC
          LIMIT 200
        `;
      return rows as any[];
    })) as any[];

    if (!pages || !pages.length) {
      console.log("[WikiSyncWorkflow] No pages to sync.");
      return { synced: 0, skipped: 0 };
    }

    // 2. Indexar em lotes para reduzir passos e controlar concorrencia no AI Search beta.
    const docs = pages.map((page): WikiDocument => {
      const doc = serializeWikiPageForIndex({
        id: String(page.id),
        slug: page.slug ? String(page.slug) : null,
        title: String(page.title ?? ""),
        content: page.content ? String(page.content) : null,
        htmlContent: page.html_content ? String(page.html_content) : null,
        category: page.category ? String(page.category) : null,
        tags: Array.isArray(page.tags) ? page.tags.map(String) : null,
      });

      return {
        id: String(page.id),
        filename: doc.filename,
        markdown: doc.markdown,
        metadata: doc.metadata,
      };
    });

    const result = await indexWikiDocumentsInBatches(step, docs, async (doc) => {
      await withAiSearchUploadTimeout(
        this.env.AI_SEARCH!.items.upload(doc.filename, truncateForAiSearch(doc.markdown), {
          metadata: doc.metadata,
        }),
      );
    });

    console.log(`[WikiSyncWorkflow] Done. synced=${result.synced} failed=${result.failed}`);
    return { ...result, total: pages.length };
  }
}

type WikiDocument = {
  id: string;
  filename: string;
  markdown: string;
  metadata: Record<string, unknown>;
};

type WikiBatchResult = {
  synced: number;
  failed: number;
  failures: Array<{ id: string; error: string }>;
};

async function indexWikiDocumentsInBatches(
  step: WorkflowStep,
  docs: WikiDocument[],
  upload: (doc: WikiDocument) => Promise<void>,
  batchSize = 10,
): Promise<WikiBatchResult> {
  const total: WikiBatchResult = { synced: 0, failed: 0, failures: [] };

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const result = await step.do(`index-wiki-batch-${batchNumber}`, async () => {
      const outcomes = await Promise.all(
        batch.map(async (doc) => {
          try {
            await upload(doc);
            return { id: doc.id, ok: true as const };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[WikiSyncWorkflow] Failed to index page ${doc.id}:`, message);
            return { id: doc.id, ok: false as const, error: message };
          }
        }),
      );

      const failures = outcomes
        .filter((item): item is { id: string; ok: false; error: string } => !item.ok)
        .map(({ id, error }) => ({ id, error }));

      return {
        synced: outcomes.length - failures.length,
        failed: failures.length,
        failures,
      };
    });

    total.synced += result.synced;
    total.failed += result.failed;
    total.failures.push(...result.failures);
  }

  return total;
}

function truncateForAiSearch(markdown: string, maxChars = 24000): string {
  if (markdown.length <= maxChars) return markdown;
  return `${markdown.slice(0, maxChars)}\n\n[Conteudo truncado para indexacao]`;
}

async function withAiSearchUploadTimeout<T>(upload: Promise<T>, timeoutMs = 30_000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      upload,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("ai_search_upload_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
