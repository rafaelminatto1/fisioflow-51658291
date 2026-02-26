/**
 * Wiki / Knowledge Base - Firestore
 * Collection: wiki_pages
 */
import {

  db,
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  addDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from '@/integrations/firebase/app';
import type { WikiPage, WikiCategory, WikiComment, WikiPageVersion, WikiTriageEvent } from '@/types/wiki';

const WIKI_PAGES = 'wiki_pages';
const WIKI_CATEGORIES = 'wiki_categories';
const WIKI_VERSIONS = 'wiki_versions';
const WIKI_COMMENTS = 'wiki_comments';
const WIKI_TRIAGE_EVENTS = 'wiki_triage_events';

function isE2ERuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.search.includes('e2e=true') ||
      (typeof navigator !== 'undefined' && navigator.webdriver === true))
  );
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object' && error !== null) {
    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === 'string' && maybeCode.toLowerCase().includes('already-exists')) return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ALREADY_EXISTS') || message.toLowerCase().includes('already exists');
}

function mapDocToWikiPage(docSnap: { id: string; data: () => Record<string, unknown> }): WikiPage {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    slug: (data.slug as string) ?? '',
    title: (data.title as string) ?? '',
    template_id: typeof data.template_id === 'string' ? data.template_id : undefined,
    triage_order: typeof data.triage_order === 'number' ? data.triage_order : undefined,
    content: (data.content as string) ?? '',
    html_content: typeof data.html_content === 'string' ? data.html_content : undefined,
    parent_id: typeof data.parent_id === 'string' ? data.parent_id : undefined,
    organization_id: (data.organization_id as string) ?? '',
    created_by: (data.created_by as string) ?? '',
    updated_by: (data.updated_by as string) ?? '',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    category: typeof data.category === 'string' ? data.category : undefined,
    is_published: (data.is_published as boolean) ?? true,
    view_count: (data.view_count as number) ?? 0,
    attachments: Array.isArray(data.attachments) ? (data.attachments as WikiPage['attachments']) : [],
    icon: typeof data.icon === 'string' ? data.icon : undefined,
    cover_image: typeof data.cover_image === 'string' ? data.cover_image : undefined,
    created_at: data.created_at as WikiPage['created_at'],
    updated_at: data.updated_at as WikiPage['updated_at'],
    version: (data.version as number) ?? 1,
    deleted_at: data.deleted_at as WikiPage['deleted_at'],
  };
}

export const wikiService = {
  async listPages(organizationId: string): Promise<WikiPage[]> {
    const isE2E = isE2ERuntime();
    try {
      const q = query(
        collection(db, WIKI_PAGES),
        where('organization_id', '==', organizationId)
      );
      let snapshot = await getDocs(q);
      try {
        snapshot = await getDocsFromServer(q);
      } catch {
        // mantém snapshot do cache para resiliência
      }

      let list = snapshot.docs.map((d) => mapDocToWikiPage({ id: d.id, data: () => d.data() }));

      if (list.length === 0) {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
          try {
            const retrySnapshot = await getDocsFromServer(q);
            const retryList = retrySnapshot.docs.map((d) => mapDocToWikiPage({ id: d.id, data: () => d.data() }));
            if (retryList.length > 0) {
              list = retryList;
              break;
            }
          } catch {
            // segue tentativa
          }
        }
      }

      // Fallback defensivo: em alguns cenários de emulador/rede a query filtrada
      // retorna vazia enquanto leituras diretas por ID ainda encontram documentos.
      if (list.length === 0) {
        try {
          const fullSnapshot = await getDocs(collection(db, WIKI_PAGES));
          const scanned = fullSnapshot.docs
            .map((d) => mapDocToWikiPage({ id: d.id, data: () => d.data() }))
            .filter((page) => page.organization_id === organizationId);
          if (scanned.length > 0) {
            list = scanned;
          }
        } catch {
          // keep graceful fallback behavior without additional noise
        }
      }

      const getTime = (p: WikiPage) => (p.updated_at && typeof (p.updated_at as { toDate?: () => Date }).toDate === 'function'
        ? (p.updated_at as { toDate: () => Date }).toDate().getTime()
        : 0);
      list.sort((a, b) => getTime(b) - getTime(a));
      return list;
    } catch (error) {
      if (isE2E) {
        console.error(
          '[E2E][WikiService][listPages:error]',
          JSON.stringify({
            organization_id: organizationId,
            error: error instanceof Error ? error.message : String(error),
          })
        );
      }
      return [];
    }
  },

  async getPageById(organizationId: string, pageId: string): Promise<WikiPage | null> {
    try {
      const snap = await getDoc(doc(db, WIKI_PAGES, pageId));
      if (!snap.exists()) return null;
      const page = mapDocToWikiPage({ id: snap.id, data: () => snap.data() as Record<string, unknown> });
      return page.organization_id === organizationId ? page : null;
    } catch {
      return null;
    }
  },

  async getPageBySlug(organizationId: string, slug: string): Promise<WikiPage | null> {
    try {
      const q = query(
        collection(db, WIKI_PAGES),
        where('organization_id', '==', organizationId),
        where('slug', '==', slug),
        limit(1)
      );
      const snapshot = await getDocs(q);
      const first = snapshot.docs[0];
      if (!first) return null;
      return mapDocToWikiPage({ id: first.id, data: () => first.data() });
    } catch {
      return null;
    }
  },

  async getTemplateUsageStats(organizationId: string): Promise<Record<string, number>> {
    const pages = await this.listPages(organizationId);
    return pages.reduce<Record<string, number>>((acc, page) => {
      const templateId = page.template_id || 'manual';
      acc[templateId] = (acc[templateId] || 0) + 1;
      return acc;
    }, {});
  },

  async updateTriageOrdering(
    organizationId: string,
    userId: string,
    updates: Array<{ id: string; triage_order: number; tags: string[]; category?: string }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const batch = writeBatch(db);
    const now = serverTimestamp();

    updates.forEach((entry) => {
      const ref = doc(db, WIKI_PAGES, entry.id);
      batch.update(ref, {
        organization_id: organizationId,
        triage_order: entry.triage_order,
        tags: entry.tags,
        category: entry.category ?? 'triage',
        updated_by: userId,
        updated_at: now,
      });
    });

    await batch.commit();
  },

  async recordTriageEvents(
    organizationId: string,
    userId: string,
    events: Array<Omit<WikiTriageEvent, 'id' | 'organization_id' | 'changed_by' | 'created_at'>>
  ): Promise<void> {
    if (events.length === 0) return;

    const batch = writeBatch(db);
    const now = serverTimestamp();

    events.forEach((event) => {
      const ref = doc(collection(db, WIKI_TRIAGE_EVENTS));
      batch.set(ref, {
        ...event,
        organization_id: organizationId,
        changed_by: userId,
        created_at: now,
      });
    });

    await batch.commit();
  },

  async listTriageEvents(organizationId: string, max = 50): Promise<WikiTriageEvent[]> {
    try {
      const q = query(
        collection(db, WIKI_TRIAGE_EVENTS),
        where('organization_id', '==', organizationId),
        orderBy('created_at', 'desc'),
        limit(max)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          organization_id: (data.organization_id as string) ?? organizationId,
          page_id: (data.page_id as string) ?? '',
          page_title: typeof data.page_title === 'string' ? data.page_title : undefined,
          template_id: typeof data.template_id === 'string' ? data.template_id : undefined,
          from_status: (data.from_status as WikiTriageEvent['from_status']) ?? 'backlog',
          to_status: (data.to_status as WikiTriageEvent['to_status']) ?? 'backlog',
          previous_order: typeof data.previous_order === 'number' ? data.previous_order : undefined,
          next_order: typeof data.next_order === 'number' ? data.next_order : undefined,
          changed_by: (data.changed_by as string) ?? '',
          source: (data.source as WikiTriageEvent['source']) ?? 'drag',
          reason: typeof data.reason === 'string' ? data.reason : undefined,
          created_at: data.created_at as WikiTriageEvent['created_at'],
        } satisfies WikiTriageEvent;
      });
    } catch {
      return [];
    }
  },

  async listCategories(organizationId: string): Promise<WikiCategory[]> {
    const q = query(
      collection(db, WIKI_CATEGORIES),
      where('organization_id', '==', organizationId)
    );
    try {
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: (data.name as string) ?? '',
          slug: (data.slug as string) ?? '',
          description: data.description as string | undefined,
          icon: data.icon as string | undefined,
          color: data.color as string | undefined,
          organization_id: (data.organization_id as string) ?? '',
          parent_id: data.parent_id as string | undefined,
          order_index: (data.order_index as number) ?? 0,
          created_at: data.created_at as WikiCategory['created_at'],
        };
      });
      list.sort((a, b) => a.order_index - b.order_index);
      return list;
    } catch {
      return [];
    }
  },

  async savePage(
    organizationId: string,
    userId: string,
    data: Omit<WikiPage, 'id' | 'created_at' | 'updated_at' | 'version'>,
    existingPage?: { id: string; version?: number }
  ): Promise<string> {
    const isE2E = isE2ERuntime();
    const traceId = `wiki-service-save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (isE2E) {
      console.info(
        '[E2E][WikiService][savePage:start]',
        JSON.stringify({
          traceId,
          organization_id: organizationId,
          user_id: userId,
          existing_page_id: existingPage?.id ?? null,
          title: data.title,
          slug: data.slug,
          template_id: data.template_id ?? null,
          tags: data.tags ?? [],
          category: data.category ?? null,
          triage_order: data.triage_order ?? null,
        })
      );
    }

    const now = serverTimestamp();
    const base = {
      organization_id: organizationId,
      slug: data.slug,
      title: data.title,
      template_id: data.template_id ?? null,
      triage_order: data.triage_order ?? null,
      content: data.content,
      html_content: data.html_content ?? null,
      parent_id: data.parent_id ?? null,
      category: data.category ?? null,
      icon: data.icon ?? null,
      cover_image: data.cover_image ?? null,
      tags: data.tags ?? [],
      is_published: data.is_published ?? true,
      view_count: data.view_count ?? 0,
      attachments: data.attachments ?? [],
      updated_by: userId,
      updated_at: now,
    };

    if (existingPage?.id) {
      const ref = doc(db, WIKI_PAGES, existingPage.id);
      const nextVersion = (existingPage.version ?? 1) + 1;
      await updateDoc(ref, { ...base, version: nextVersion });
      try {
        await addDoc(collection(db, WIKI_VERSIONS), {
          organization_id: organizationId,
          page_id: existingPage.id,
          title: data.title,
          template_id: data.template_id ?? null,
          content: data.content,
          html_content: data.html_content ?? null,
          created_by: userId,
          created_at: now,
          version: nextVersion,
          comment: 'Atualização da página',
        });
      } catch (error) {
        if (!isAlreadyExistsError(error)) throw error;
        if (isE2E) {
          console.info(
            '[E2E][WikiService][savePage:version-upsert-duplicate]',
            JSON.stringify({ traceId, page_id: existingPage.id, version: nextVersion })
          );
        }
      }
      if (isE2E) {
        console.info(
          '[E2E][WikiService][savePage:updated]',
          JSON.stringify({
            traceId,
            page_id: existingPage.id,
            version: nextVersion,
          })
        );
      }
      return existingPage.id;
    }

    let pageId: string;
    try {
      const ref = await addDoc(collection(db, WIKI_PAGES), {
        ...base,
        created_by: userId,
        created_at: now,
        version: 1,
      });
      pageId = ref.id;
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
      const existingBySlug = await this.getPageBySlug(organizationId, data.slug);
      if (!existingBySlug) throw error;
      pageId = existingBySlug.id;
      if (isE2E) {
        console.info(
          '[E2E][WikiService][savePage:create-duplicate-recovered]',
          JSON.stringify({ traceId, page_id: pageId, slug: data.slug })
        );
      }
    }
    try {
      await addDoc(collection(db, WIKI_VERSIONS), {
        organization_id: organizationId,
        page_id: pageId,
        title: data.title,
        content: data.content,
        html_content: data.html_content ?? null,
        created_by: userId,
        created_at: now,
        version: 1,
        comment: 'Versão inicial',
      });
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
      if (isE2E) {
        console.info(
          '[E2E][WikiService][savePage:version-initial-duplicate]',
          JSON.stringify({ traceId, page_id: pageId, version: 1 })
        );
      }
    }
    if (isE2E) {
      console.info(
        '[E2E][WikiService][savePage:created]',
        JSON.stringify({
          traceId,
          page_id: pageId,
          version: 1,
        })
      );
    }
    return pageId;
  },

  async listPageVersions(organizationId: string, pageId: string): Promise<WikiPageVersion[]> {
    try {
      const q = query(
        collection(db, WIKI_VERSIONS),
        where('organization_id', '==', organizationId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          page_id: (data.page_id as string) ?? pageId,
          title: (data.title as string) ?? '',
          template_id: typeof data.template_id === 'string' ? data.template_id : undefined,
          content: (data.content as string) ?? '',
          html_content: typeof data.html_content === 'string' ? data.html_content : undefined,
          organization_id: typeof data.organization_id === 'string' ? data.organization_id : organizationId,
          created_by: (data.created_by as string) ?? '',
          created_at: data.created_at as WikiPageVersion['created_at'],
          version: (data.version as number) ?? 1,
          comment: typeof data.comment === 'string' ? data.comment : undefined,
        } satisfies WikiPageVersion;
      });
      return list
        .filter((version) => version.page_id === pageId)
        .sort((a, b) => b.version - a.version);
    } catch {
      return [];
    }
  },

  async listComments(organizationId: string, pageId: string): Promise<WikiComment[]> {
    try {
      const q = query(
        collection(db, WIKI_COMMENTS),
        where('organization_id', '==', organizationId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          page_id: (data.page_id as string) ?? pageId,
          content: (data.content as string) ?? '',
          created_by: (data.created_by as string) ?? '',
          organization_id: typeof data.organization_id === 'string' ? data.organization_id : organizationId,
          parent_comment_id: typeof data.parent_comment_id === 'string' ? data.parent_comment_id : undefined,
          block_id: typeof data.block_id === 'string' ? data.block_id : undefined,
          selection_text: typeof data.selection_text === 'string' ? data.selection_text : undefined,
          selection_start: typeof data.selection_start === 'number' ? data.selection_start : undefined,
          selection_end: typeof data.selection_end === 'number' ? data.selection_end : undefined,
          created_at: data.created_at as WikiComment['created_at'],
          updated_at: data.updated_at as WikiComment['updated_at'],
          resolved: typeof data.resolved === 'boolean' ? data.resolved : undefined,
        } satisfies WikiComment;
      });
      const getTime = (comment: WikiComment) => {
        const timestamp = comment.created_at as { toDate?: () => Date } | undefined;
        return timestamp && typeof timestamp.toDate === 'function'
          ? timestamp.toDate().getTime()
          : 0;
      };
      return list
        .filter((comment) => comment.page_id === pageId)
        .sort((a, b) => getTime(a) - getTime(b));
    } catch {
      return [];
    }
  },

  async addComment(
    organizationId: string,
    comment: Omit<WikiComment, 'id' | 'created_at'>
  ): Promise<string> {
    const now = serverTimestamp();
    const ref = await addDoc(collection(db, WIKI_COMMENTS), {
      ...comment,
      organization_id: organizationId,
      created_at: now,
    });
    return ref.id;
  },
};
