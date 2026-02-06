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
import type { WikiPage, WikiCategory } from '@/types/wiki';

const WIKI_PAGES = 'wiki_pages';
const WIKI_CATEGORIES = 'wiki_categories';

function mapDocToWikiPage(docSnap: { id: string; data: () => Record<string, unknown> }): WikiPage {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    slug: (data.slug as string) ?? '',
    title: (data.title as string) ?? '',
    content: (data.content as string) ?? '',
    html_content: data.html_content as string | undefined,
    parent_id: data.parent_id as string | undefined,
    organization_id: (data.organization_id as string) ?? '',
    created_by: (data.created_by as string) ?? '',
    updated_by: (data.updated_by as string) ?? '',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    category: data.category as string | undefined,
    is_published: (data.is_published as boolean) ?? true,
    view_count: (data.view_count as number) ?? 0,
    attachments: Array.isArray(data.attachments) ? (data.attachments as WikiPage['attachments']) : [],
    icon: data.icon as string | undefined,
    cover_image: data.cover_image as string | undefined,
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
      return existingPage.id;
    }

    const ref = await addDoc(collection(db, WIKI_PAGES), {
      ...base,
      created_by: userId,
      created_at: now,
      version: 1,
    });
    return ref.id;
  },
};
