/**
 * Wiki / Knowledge Base - Firestore
 * Collection: wiki_pages
 */
import {

  db,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from '@/integrations/firebase/app';
import type { WikiPage, WikiCategory, WikiComment, WikiPageVersion } from '@/types/wiki';

const WIKI_PAGES = 'wiki_pages';
const WIKI_CATEGORIES = 'wiki_categories';
const WIKI_VERSIONS = 'wiki_versions';
const WIKI_COMMENTS = 'wiki_comments';

function mapDocToWikiPage(docSnap: { id: string; data: () => Record<string, unknown> }): WikiPage {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    slug: (data.slug as string) ?? '',
    title: (data.title as string) ?? '',
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
    try {
      const q = query(
        collection(db, WIKI_PAGES),
        where('organization_id', '==', organizationId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => mapDocToWikiPage({ id: d.id, data: () => d.data() }));
      const getTime = (p: WikiPage) => (p.updated_at && typeof (p.updated_at as { toDate?: () => Date }).toDate === 'function'
        ? (p.updated_at as { toDate: () => Date }).toDate().getTime()
        : 0);
      list.sort((a, b) => getTime(b) - getTime(a));
      return list;
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
    const now = serverTimestamp();
    const base = {
      organization_id: organizationId,
      slug: data.slug,
      title: data.title,
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
      await addDoc(collection(db, WIKI_VERSIONS), {
        organization_id: organizationId,
        page_id: existingPage.id,
        title: data.title,
        content: data.content,
        html_content: data.html_content ?? null,
        created_by: userId,
        created_at: now,
        version: nextVersion,
        comment: 'Atualização da página',
      });
      return existingPage.id;
    }

    const ref = await addDoc(collection(db, WIKI_PAGES), {
      ...base,
      created_by: userId,
      created_at: now,
      version: 1,
    });
    await addDoc(collection(db, WIKI_VERSIONS), {
      organization_id: organizationId,
      page_id: ref.id,
      title: data.title,
      content: data.content,
      html_content: data.html_content ?? null,
      created_by: userId,
      created_at: now,
      version: 1,
      comment: 'Versão inicial',
    });
    return ref.id;
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
