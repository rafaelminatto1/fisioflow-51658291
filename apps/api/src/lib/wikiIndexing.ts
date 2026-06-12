import type { Env } from "../types/env";

const MAX_MARKDOWN_CHARS = 24000;

export type WikiIndexablePage = {
  id: string;
  slug?: string | null;
  title: string;
  content?: string | null;
  htmlContent?: string | null;
  category?: string | null;
  tags?: string[] | null;
};

export type WikiIndexDocument = {
  filename: string;
  markdown: string;
  metadata: Record<string, unknown>;
};

// Nome canônico estável: só o id — slug pode mudar e órfãos ficariam no índice.
export function buildWikiIndexFilename(pageId: string): string {
  return `wiki/${pageId}.md`;
}

// Convenções antigas espalhadas por wikiSync/surgicalSyncWiki/syncAutoRAGContent.
export function legacyWikiIndexFilenames(pageId: string, slug?: string | null): string[] {
  const names: string[] = [];
  if (slug) names.push(`wiki/${pageId}_${slug}.md`);
  names.push(`wiki_${pageId}.md`, `wiki-${pageId}.md`);
  return names;
}

export function serializeWikiPageForIndex(page: WikiIndexablePage): WikiIndexDocument {
  const body = (page.content?.trim() || page.htmlContent || "").trim();
  const parts: string[] = [`# ${page.title}`];
  if (page.category) parts.push(`**Categoria:** ${page.category}`);
  if (page.tags?.length) parts.push(`**Tags:** ${page.tags.join(", ")}`);
  if (body) parts.push("", body);

  let markdown = parts.join("\n");
  if (markdown.length > MAX_MARKDOWN_CHARS) {
    markdown = markdown.slice(0, MAX_MARKDOWN_CHARS);
  }

  return {
    filename: buildWikiIndexFilename(page.id),
    markdown,
    metadata: {
      source: "wiki",
      type: "wiki",
      wiki_id: page.id,
      slug: page.slug ?? "",
      title: page.title,
      category: page.category ?? "geral",
    },
  };
}

export async function upsertWikiPageInIndex(
  env: Env,
  page: WikiIndexablePage,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  if (!env.AI_SEARCH?.items) return { ok: false, error: "AI_SEARCH não configurado" };

  const doc = serializeWikiPageForIndex(page);
  try {
    const items = env.AI_SEARCH.items;
    const result =
      typeof items.uploadAndPoll === "function"
        ? await items.uploadAndPoll(doc.filename, doc.markdown, {
            metadata: doc.metadata,
            timeoutMs: 60_000,
          })
        : await items.upload(doc.filename, doc.markdown, { metadata: doc.metadata });
    return { ok: true, status: result?.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[wikiIndexing] upsert failed for ${page.id}:`, message);
    return { ok: false, error: message };
  }
}

export async function removeWikiPageFromIndex(
  env: Env,
  pageId: string,
  slug?: string | null,
): Promise<{ deleted: number }> {
  if (!env.AI_SEARCH?.items) return { deleted: 0 };

  const candidates = new Set([buildWikiIndexFilename(pageId), ...legacyWikiIndexFilenames(pageId, slug)]);
  let deleted = 0;

  for (const filename of candidates) {
    try {
      const listing = await env.AI_SEARCH.items.list({ search: filename, per_page: 10 });
      const items: Array<{ id: string; key?: string; filename?: string }> =
        listing?.result ?? listing?.items ?? [];
      for (const item of items) {
        const key = item.key ?? item.filename ?? "";
        if (key !== filename) continue;
        await env.AI_SEARCH.items.delete(item.id);
        deleted++;
      }
    } catch (error) {
      console.warn(`[wikiIndexing] remove lookup failed for ${filename}:`, error);
    }
  }

  return { deleted };
}
