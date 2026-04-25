/**
 * Wiki / Knowledge Base - Migrated to Neon/Workers
 */
import { wikiApi } from "@/api/v2/knowledge";
import type {
  WikiPage,
  WikiCategory,
  WikiComment,
  WikiPageVersion,
  WikiTriageEvent,
} from "@/types/wiki";

export const wikiService = {
  async listPages(_organizationId: string): Promise<WikiPage[]> {
    try {
      const result = await wikiApi.listOrg();
      return (result.data ?? []) as unknown as WikiPage[];
    } catch {
      return [];
    }
  },

  async getPageById(_organizationId: string, pageId: string): Promise<WikiPage | null> {
    try {
      const result = await wikiApi.getById(pageId);
      return (result.data as unknown as WikiPage) ?? null;
    } catch {
      return null;
    }
  },

  async getPageBySlug(_organizationId: string, slug: string): Promise<WikiPage | null> {
    try {
      const result = await wikiApi.get(slug);
      return (result.data as unknown as WikiPage) ?? null;
    } catch {
      return null;
    }
  },

  async getTemplateUsageStats(organizationId: string): Promise<Record<string, number>> {
    const pages = await this.listPages(organizationId);
    return pages.reduce<Record<string, number>>((acc, page) => {
      const templateId = (page as { template_id?: string }).template_id || "manual";
      acc[templateId] = (acc[templateId] || 0) + 1;
      return acc;
    }, {});
  },

  async updateTriageOrdering(
    _organizationId: string,
    _userId: string,
    updates: Array<{
      id: string;
      triage_order: number;
      tags: string[];
      category?: string;
    }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    await wikiApi.updateTriage(updates);
  },

  async recordTriageEvents(
    _organizationId: string,
    _userId: string,
    _events: Array<Omit<WikiTriageEvent, "id" | "organization_id" | "changed_by" | "created_at">>,
  ): Promise<void> {
    // Triage events table not yet in Neon — no-op for now
  },

  async listTriageEvents(_organizationId: string, _max = 50): Promise<WikiTriageEvent[]> {
    // Triage events table not yet in Neon — return empty
    return [];
  },

  async listCategories(_organizationId: string): Promise<WikiCategory[]> {
    try {
      const result = await wikiApi.listCategories();
      return (result.data ?? []) as unknown as WikiCategory[];
    } catch {
      return [];
    }
  },

  async savePage(
    _organizationId: string,
    _userId: string,
    data: Omit<WikiPage, "id" | "created_at" | "updated_at" | "version">,
    existingPage?: { id: string; version?: number },
  ): Promise<string> {
    const slug = (data as { slug?: string }).slug ?? "";

    if (existingPage?.id) {
      const result = await wikiApi.update(slug, data as Parameters<typeof wikiApi.update>[1]);
      return (result.data as { id: string }).id ?? existingPage.id;
    }

    const result = await wikiApi.create(data as Parameters<typeof wikiApi.create>[0]);
    return (result.data as { id: string }).id;
  },

  async listPageVersions(_organizationId: string, _pageId: string): Promise<WikiPageVersion[]> {
    // Versions accessible via slug; without slug here, return empty for now
    return [];
  },

  async listComments(_organizationId: string, pageId: string): Promise<WikiComment[]> {
    try {
      const result = await wikiApi.listComments(pageId);
      return (result.data ?? []) as unknown as WikiComment[];
    } catch {
      return [];
    }
  },

  async addComment(
    _organizationId: string,
    comment: Omit<WikiComment, "id" | "created_at">,
  ): Promise<string> {
    try {
      const result = await wikiApi.addComment(String(comment.page_id), {
        content: comment.content,
        parent_comment_id: comment.parent_comment_id,
        block_id: comment.block_id,
        selection_text: comment.selection_text,
        selection_start: comment.selection_start,
        selection_end: comment.selection_end,
      });
      return (result.data as { id: string })?.id ?? "";
    } catch {
      return "";
    }
  },

  async syncClinicalTestsToWiki(
    organizationId: string,
    userId: string,
  ): Promise<{ created: number; updated: number }> {
    try {
      // This would ideally be a call to a backend endpoint
      // For now, we simulate the ingestion logic if we had access to the templates here
      // In a real scenario, the backend would handle the mapping
      const result = await wikiApi.syncClinicalTests();
      return result.data as { created: number; updated: number };
    } catch (error) {
      console.error("Sync clinical tests failed:", error);
      throw error;
    }
  },
};
