/**
 * Wiki / Knowledge Base - Migrated to Neon/Workers
 */
import { wikiApi } from '@/lib/api/workers-client';
import type { WikiPage, WikiCategory, WikiComment, WikiPageVersion, WikiTriageEvent } from '@/types/wiki';

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
      return result.data as unknown as WikiPage ?? null;
    } catch {
      return null;
    }
  },

  async getPageBySlug(_organizationId: string, slug: string): Promise<WikiPage | null> {
    try {
      const result = await wikiApi.get(slug);
      return result.data as unknown as WikiPage ?? null;
    } catch {
      return null;
    }
  },

  async getTemplateUsageStats(organizationId: string): Promise<Record<string, number>> {
    const pages = await this.listPages(organizationId);
    return pages.reduce<Record<string, number>>((acc, page) => {
      const templateId = (page as { template_id?: string }).template_id || 'manual';
      acc[templateId] = (acc[templateId] || 0) + 1;
      return acc;
    }, {});
  },

  async updateTriageOrdering(
    _organizationId: string,
    _userId: string,
    updates: Array<{ id: string; triage_order: number; tags: string[]; category?: string }>
  ): Promise<void> {
    if (updates.length === 0) return;
    await wikiApi.updateTriage(updates);
  },

  async recordTriageEvents(
    _organizationId: string,
    _userId: string,
    _events: Array<Omit<WikiTriageEvent, 'id' | 'organization_id' | 'changed_by' | 'created_at'>>
  ): Promise<void> {
    // Triage events table not yet in Neon — no-op for now
  },

  async listTriageEvents(_organizationId: string, _max = 50): Promise<WikiTriageEvent[]> {
    // Triage events table not yet in Neon — return empty
    return [];
  },

  async listCategories(_organizationId: string): Promise<WikiCategory[]> {
    // Wiki categories table not yet in Neon — return empty
    return [];
  },

  async savePage(
    _organizationId: string,
    _userId: string,
    data: Omit<WikiPage, 'id' | 'created_at' | 'updated_at' | 'version'>,
    existingPage?: { id: string; version?: number }
  ): Promise<string> {
    const slug = (data as { slug?: string }).slug ?? '';

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

  async listComments(_organizationId: string, _pageId: string): Promise<WikiComment[]> {
    // Wiki comments table not yet in Neon — return empty
    return [];
  },

  async addComment(
    _organizationId: string,
    _comment: Omit<WikiComment, 'id' | 'created_at'>
  ): Promise<string> {
    // Wiki comments table not yet in Neon — no-op
    return '';
  },
};
