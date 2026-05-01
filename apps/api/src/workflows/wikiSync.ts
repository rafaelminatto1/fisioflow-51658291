/**
 * WikiSyncWorkflow — Sincroniza páginas Wiki do Neon → AI Search
 *
 * Cron: 02h BRT (05h UTC) diariamente
 * Lógica: busca páginas modificadas nas últimas 25h e indexa no AI Search
 * Imediato: hook em routes/wiki.ts PUT dispara re-sync ao publicar
 */
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { neon } from "@neondatabase/serverless";

export type WikiSyncParams = {
  triggerType: "cron" | "manual" | "publish";
  wikiPageId?: string; // Se "publish", sincronizar apenas essa página
};

export class WikiSyncWorkflow extends WorkflowEntrypoint<Env, WikiSyncParams> {
  async run(event: WorkflowEvent<WikiSyncParams>, step: WorkflowStep) {
    const { triggerType, wikiPageId } = event.payload;

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
      if (triggerType === "publish" && wikiPageId) {
        const rows = await sql`
          SELECT id, slug, title, content, html_content, category, tags, is_published
          FROM wiki_pages
          WHERE id = ${wikiPageId}
            AND is_published = true
        `;
        return rows as any[];
      }

      const rows = await sql`
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

    // 2. Indexar cada página
    let synced = 0;
    let failed = 0;

    for (const page of pages) {
      const pageId = String(page.id);
      const title = String(page.title ?? "");
      const category = String(page.category ?? "geral");
      const content = String(page.html_content ?? page.content ?? "");
      const filename = `wiki/${pageId}_${String(page.slug ?? pageId)}.md`;

      const markdown = `# ${title}\n\n${content}`;

      await step.do(`index-wiki-${pageId}`, async () => {
        try {
          await this.env.AI_SEARCH!.items.upload(filename, markdown, {
            metadata: {
              source: "wiki",
              wiki_id: pageId,
              title,
              category,
              slug: String(page.slug ?? ""),
            },
          });
          synced++;
        } catch (err) {
          console.error(`[WikiSyncWorkflow] Failed to index page ${pageId}:`, err);
          failed++;
        }
      });
    }

    console.log(`[WikiSyncWorkflow] Done. synced=${synced} failed=${failed}`);
    return { synced, failed, total: pages.length };
  }
}
