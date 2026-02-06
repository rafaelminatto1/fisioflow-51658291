/**
 * Wiki Service - Firebase Firestore Integration
 * Serviço para gerenciamento de páginas wiki
 */
import {

  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/app';

import type {
  WikiPage,
  WikiPageVersion,
  WikiComment,
} from '@/types/wiki';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const COLLECTION_NAME = 'wiki_pages';
const VERSIONS_COLLECTION = 'wiki_versions';
const COMMENTS_COLLECTION = 'wiki_comments';

// ============================================================================
// CRUD Operations - Pages
// ============================================================================

/**
 * Criar nova página wiki
 */
export async function createWikiPage(
  organizationId: string,
  page: Omit<WikiPage, 'id' | 'created_at' | 'updated_at' | 'version'>
): Promise<WikiPage> {
  const pageRef = doc(collection(db, 'organizations', organizationId, COLLECTION_NAME));
  const now = Timestamp.now();

  // Criar slug se não fornecido
  const slug = page.slug || generateSlug(page.title);

  const newPage: WikiPage = {
    ...page,
    id: pageRef.id,
    slug,
    version: 1,
    created_at: now,
    updated_at: now,
  };

  await setDoc(pageRef, newPage);

  // Criar versão inicial
  await createWikiPageVersion(organizationId, pageRef.id, {
    page_id: pageRef.id,
    content: page.content,
    created_by: page.created_by,
    created_at: now,
    version: 1,
    comment: 'Versão inicial',
  });

  return newPage;
}

/**
 * Obter página por ID
 */
export async function getWikiPage(
  organizationId: string,
  pageId: string
): Promise<WikiPage | null> {
  const pageRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, pageId);
  const pageSnap = await getDoc(pageRef);

  if (!pageSnap.exists()) {
    return null;
  }

  return { id: pageSnap.id, ...pageSnap.data() } as WikiPage;
}

/**
 * Obter página por slug
 */
export async function getWikiPageBySlug(
  organizationId: string,
  slug: string
): Promise<WikiPage | null> {
  const collectionRef = collection(db, 'organizations', organizationId, COLLECTION_NAME);
  const q = query(collectionRef, where('slug', '==', slug), where('is_published', '==', true));

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...normalizeFirestoreData(doc.data()) } as WikiPage;
}

/**
 * Atualizar página (cria nova versão automaticamente)
 */
export async function updateWikiPage(
  organizationId: string,
  pageId: string,
  updates: Partial<Omit<WikiPage, 'id' | 'created_at' | 'created_by' | 'version'>>,
  userId: string,
  versionComment?: string
): Promise<WikiPage> {
  const pageRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, pageId);

  // Buscar página atual para incrementar versão
  const currentSnap = await getDoc(pageRef);
  const current = currentSnap.data() as WikiPage | undefined;
  const newVersion = (current?.version || 0) + 1;

  // Atualizar página
  await updateDoc(pageRef, {
    ...updates,
    version: newVersion,
    updated_by: userId,
    updated_at: serverTimestamp(),
  });

  // Criar nova versão
  if (updates.content !== undefined) {
    await createWikiPageVersion(organizationId, pageId, {
      page_id: pageId,
      content: updates.content,
      created_by: userId,
      created_at: Timestamp.now(),
      version: newVersion,
      comment: versionComment || `Atualização da página`,
    });
  }

  // Buscar página atualizada
  const updatedSnap = await getDoc(pageRef);
  return { id: updatedSnap.id, ...updatedSnap.data() } as WikiPage;
}

/**
 * Deletar página
 */
export async function deleteWikiPage(
  organizationId: string,
  pageId: string
): Promise<void> {
  const pageRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, pageId);
  await deleteDoc(pageRef);
}

/**
 * Buscar todas as páginas da organização
 */
export async function getWikiPages(
  organizationId: string,
  options?: {
    category?: string;
    tag?: string;
    is_published?: boolean;
    parent_id?: string | null;
  }
): Promise<WikiPage[]> {
  const collectionRef = collection(db, 'organizations', organizationId, COLLECTION_NAME);
  let q = query(collectionRef, orderBy('updated_at', 'desc'));

  if (options?.category) {
    q = query(q, where('category', '==', options.category));
  }

  if (options?.tag) {
    q = query(q, where('tags', 'array-contains', options.tag));
  }

  if (options?.is_published !== undefined) {
    q = query(q, where('is_published', '==', options.is_published));
  }

  if (options?.parent_id !== undefined) {
    q = query(q, where('parent_id', '==', options.parent_id));
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...normalizeFirestoreData(doc.data()),
  })) as WikiPage[];
}

/**
 * Buscar páginas raiz (sem pai)
 */
export async function getRootWikiPages(organizationId: string): Promise<WikiPage[]> {
  return getWikiPages(organizationId, { parent_id: null });
}

/**
 * Buscar páginas filhas
 */
export async function getChildWikiPages(
  organizationId: string,
  parentId: string
): Promise<WikiPage[]> {
  return getWikiPages(organizationId, { parent_id: parentId });
}

// ============================================================================
// Real-time Listeners
// ============================================================================

/**
 * Listener em tempo real para páginas
 */
export function listenToWikiPages(
  organizationId: string,
  callback: (pages: WikiPage[]) => void
): () => void {
  const collectionRef = collection(db, 'organizations', organizationId, COLLECTION_NAME);
  const q = query(collectionRef, orderBy('updated_at', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const pages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...normalizeFirestoreData(doc.data()),
    })) as WikiPage[];
    callback(pages);
  });

  return unsubscribe;
}

// ============================================================================
// Versions
// ============================================================================

/**
 * Criar versão de página
 */
export async function createWikiPageVersion(
  organizationId: string,
  pageId: string,
  version: Omit<WikiPageVersion, 'id'>
): Promise<WikiPageVersion> {
  const versionRef = doc(collection(db, 'organizations', organizationId, VERSIONS_COLLECTION));

  const newVersion: WikiPageVersion = {
    ...version,
    id: versionRef.id,
  };

  await setDoc(versionRef, newVersion);

  return newVersion;
}

/**
 * Buscar versões de uma página
 */
export async function getWikiPageVersions(
  organizationId: string,
  pageId: string
): Promise<WikiPageVersion[]> {
  const collectionRef = collection(db, 'organizations', organizationId, VERSIONS_COLLECTION);
  const q = query(
    collectionRef,
    where('page_id', '==', pageId),
    orderBy('version', 'desc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...normalizeFirestoreData(doc.data()),
  })) as WikiPageVersion[];
}

/**
 * Reverter página para versão anterior
 */
export async function revertWikiPage(
  organizationId: string,
  pageId: string,
  versionNumber: number,
  userId: string
): Promise<WikiPage> {
  // Buscar versão alvo
  const versions = await getWikiPageVersions(organizationId, pageId);
  const targetVersion = versions.find((v) => v.version === versionNumber);

  if (!targetVersion) {
    throw new Error(`Versão ${versionNumber} não encontrada`);
  }

  // Atualizar página com conteúdo da versão
  return updateWikiPage(
    organizationId,
    pageId,
    { content: targetVersion.content },
    userId,
    `Revertido para versão ${versionNumber}`
  );
}

// ============================================================================
// Comments
// ============================================================================

/**
 * Adicionar comentário a uma página
 */
export async function addWikiComment(
  organizationId: string,
  comment: Omit<WikiComment, 'id' | 'created_at'>
): Promise<WikiComment> {
  const commentRef = doc(collection(db, 'organizations', organizationId, COMMENTS_COLLECTION));
  const now = Timestamp.now();

  const newComment: WikiComment = {
    ...comment,
    id: commentRef.id,
    created_at: now,
  };

  await setDoc(commentRef, newComment);

  return newComment;
}

/**
 * Buscar comentários de uma página
 */
export async function getWikiComments(
  organizationId: string,
  pageId: string
): Promise<WikiComment[]> {
  const collectionRef = collection(db, 'organizations', organizationId, COMMENTS_COLLECTION);
  const q = query(
    collectionRef,
    where('page_id', '==', pageId),
    orderBy('created_at', 'asc')
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...normalizeFirestoreData(doc.data()),
  })) as WikiComment[];
}

/**
 * Listener em tempo real para comentários
 */
export function listenToWikiComments(
  organizationId: string,
  pageId: string,
  callback: (comments: WikiComment[]) => void
): () => void {
  const collectionRef = collection(db, 'organizations', organizationId, COMMENTS_COLLECTION);
  const q = query(
    collectionRef,
    where('page_id', '==', pageId),
    orderBy('created_at', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...normalizeFirestoreData(doc.data()),
    })) as WikiComment[];
    callback(comments);
  });

  return unsubscribe;
}

// ============================================================================
// Search
// ============================================================================

/**
 * Buscar páginas por termo (full-text search simples)
 * Nota: Para busca avançada, usar Algolia ou Elasticsearch
 */
export async function searchWikiPages(
  organizationId: string,
  searchTerm: string
): Promise<WikiPage[]> {
  const pages = await getWikiPages(organizationId);

  const term = searchTerm.toLowerCase();

  return pages.filter((page) => {
    return (
      page.title.toLowerCase().includes(term) ||
      page.content.toLowerCase().includes(term) ||
      page.tags?.some((tag) => tag.toLowerCase().includes(term))
    );
  });
}

// ============================================================================
// Stats
// ============================================================================

/**
 * Incrementar contador de visualizações
 */
export async function incrementWikiPageViews(
  organizationId: string,
  pageId: string
): Promise<void> {
  const pageRef = doc(db, 'organizations', organizationId, COLLECTION_NAME, pageId);

  await updateDoc(pageRef, {
    view_count: (await getDoc(pageRef)).data()?.view_count + 1 || 1,
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Gerar slug a partir de título
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Espaços para hífens
    .replace(/-+/g, '-'); // Múltiplos hífens para um
}

/**
 * Verificar se slug já existe
 */
export async function isSlugAvailable(
  organizationId: string,
  slug: string,
  excludePageId?: string
): Promise<boolean> {
  const collectionRef = collection(db, 'organizations', organizationId, COLLECTION_NAME);
  const q = query(collectionRef, where('slug', '==', slug));

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return true;
  }

  if (excludePageId && querySnapshot.docs.length === 1) {
    return querySnapshot.docs[0].id === excludePageId;
  }

  return false;
}

/**
 * Gerar slug único
 */
export async function generateUniqueSlug(
  organizationId: string,
  title: string,
  excludePageId?: string
): Promise<string> {
  let slug = generateSlug(title);
  let counter = 1;

  while (!(await isSlugAvailable(organizationId, slug, excludePageId))) {
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
  }

  return slug;
}