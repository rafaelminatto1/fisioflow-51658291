import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getAdminDb } from '../init';
import { logger } from '../lib/logger';

type TriageStatus = 'backlog' | 'in-progress' | 'done';

type WikiPageDoc = {
  slug?: string;
  title?: string;
  content?: string;
  tags?: string[];
  category?: string;
  template_id?: string;
  triage_order?: number;
  organization_id?: string;
  created_by?: string;
  updated_by?: string;
  updated_at?: unknown;
};

const WIKI_PAGES = 'wiki_pages';
const WIKI_TRIAGE_EVENTS = 'wiki_triage_events';
const NOTIFICATIONS = 'notifications';
const BLOCKED_TAGS = ['blocked', 'triage-blocked'];
const SYSTEM_CHECKLIST_USER = 'system:auto-checklist';
const SYSTEM_BLOCKED_USER = 'system:auto-blocked';

function getTriageStatus(tags: string[]): TriageStatus {
  if (tags.includes('triage-done')) return 'done';
  if (tags.includes('triage-in-progress')) return 'in-progress';
  return 'backlog';
}

function applyTriageStatus(tags: string[], status: TriageStatus): string[] {
  const filtered = tags.filter(
    (tag) => tag !== 'triage-backlog' && tag !== 'triage-in-progress' && tag !== 'triage-done'
  );

  if (!filtered.includes('triage')) filtered.push('triage');
  if (status === 'done') filtered.push('triage-done');
  else if (status === 'in-progress') filtered.push('triage-in-progress');
  else filtered.push('triage-backlog');

  return Array.from(new Set(filtered));
}

function isTriagePage(page: WikiPageDoc): boolean {
  const tags = Array.isArray(page.tags) ? page.tags : [];
  return page.category === 'triage' || tags.includes('triage');
}

function isChecklistComplete(content?: string): boolean {
  if (!content || typeof content !== 'string') return false;

  const checklistLines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^-\s\[(x|X| )\]\s+/.test(line));

  if (checklistLines.length === 0) return false;

  const checked = checklistLines.filter((line) => /^-\s\[(x|X)\]\s+/.test(line)).length;
  return checked > 0 && checked === checklistLines.length;
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (value instanceof Timestamp) return value.toDate().getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object' && value && 'toDate' in value) {
    const maybeTs = value as { toDate?: () => Date };
    if (typeof maybeTs.toDate === 'function') return maybeTs.toDate().getTime();
  }
  return 0;
}

async function getNextDoneOrder(organizationId: string): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(WIKI_PAGES)
    .where('organization_id', '==', organizationId)
    .where('category', '==', 'triage')
    .get();

  let maxOrder = 0;
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data() as WikiPageDoc;
    const status = getTriageStatus(Array.isArray(data.tags) ? data.tags : []);
    if (status !== 'done') return;
    const currentOrder = typeof data.triage_order === 'number' ? data.triage_order : 0;
    if (currentOrder > maxOrder) maxOrder = currentOrder;
  });

  return maxOrder + 1;
}

export const onWikiChecklistCompletedMoveToDone = onDocumentUpdated(
  {
    document: 'wiki_pages/{pageId}',
    region: 'southamerica-east1',
  },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    if (!before || !after) return;

    const beforeData = before.data() as WikiPageDoc;
    const afterData = after.data() as WikiPageDoc;

    if (!isTriagePage(afterData)) return;
    if (!isChecklistComplete(afterData.content)) return;

    const beforeStatus = getTriageStatus(Array.isArray(beforeData.tags) ? beforeData.tags : []);
    const afterStatus = getTriageStatus(Array.isArray(afterData.tags) ? afterData.tags : []);

    if (afterStatus === 'done') return;

    const organizationId = afterData.organization_id;
    if (!organizationId) {
      logger.warn('[wiki-triage] organization_id ausente no documento de wiki', { pageId: after.id });
      return;
    }

    try {
      const nextOrder = await getNextDoneOrder(organizationId);
      const nextTags = applyTriageStatus(Array.isArray(afterData.tags) ? afterData.tags : [], 'done');
      const db = getAdminDb();
      const batch = db.batch();

      batch.update(after.ref, {
        tags: nextTags,
        category: 'triage',
        triage_order: nextOrder,
        updated_by: SYSTEM_CHECKLIST_USER,
        updated_at: FieldValue.serverTimestamp(),
      });

      const eventRef = db.collection(WIKI_TRIAGE_EVENTS).doc();
      batch.set(eventRef, {
        organization_id: organizationId,
        page_id: after.id,
        page_title: afterData.title || undefined,
        template_id: afterData.template_id || undefined,
        from_status: beforeStatus,
        to_status: 'done',
        previous_order: typeof afterData.triage_order === 'number' ? afterData.triage_order : undefined,
        next_order: nextOrder,
        changed_by: SYSTEM_CHECKLIST_USER,
        source: 'automation-checklist',
        reason: 'checklist-100-complete',
        created_at: FieldValue.serverTimestamp(),
      });

      await batch.commit();

      logger.info('[wiki-triage] Card movido automaticamente para concluido por checklist', {
        pageId: after.id,
        organizationId,
      });
    } catch (error) {
      logger.error('[wiki-triage] Erro ao mover card automaticamente por checklist', {
        pageId: after.id,
        error,
      });
    }
  }
);

export const notifyBlockedWikiTriageCards = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
  },
  async () => {
    const db = getAdminDb();
    const thresholdDays = Number(process.env.WIKI_BLOCKED_DAYS_THRESHOLD || 3);
    const now = Date.now();
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
    const dayKey = new Date().toISOString().slice(0, 10);

    const organizationsSnapshot = await db.collection('organizations').get();

    for (const orgDoc of organizationsSnapshot.docs) {
      const organizationId = orgDoc.id;
      const pagesSnapshot = await db
        .collection(WIKI_PAGES)
        .where('organization_id', '==', organizationId)
        .where('category', '==', 'triage')
        .get();

      for (const pageDoc of pagesSnapshot.docs) {
        const page = pageDoc.data() as WikiPageDoc;
        const tags = Array.isArray(page.tags) ? page.tags : [];
        const status = getTriageStatus(tags);
        if (status === 'done') continue;

        const isBlocked = BLOCKED_TAGS.some((tag) => tags.includes(tag));
        if (!isBlocked) continue;

        const updatedAtMs = toMillis(page.updated_at);
        if (!updatedAtMs) continue;

        const blockedForMs = now - updatedAtMs;
        if (blockedForMs < thresholdMs) continue;

        const blockedDays = Math.floor(blockedForMs / (24 * 60 * 60 * 1000));
        const rawOwner = page.updated_by || page.created_by || '';
        const ownerId = rawOwner.startsWith('system:') ? page.created_by || '' : rawOwner;
        if (!ownerId) continue;

        const notificationId = `wiki-blocked-${pageDoc.id}-${dayKey}`;
        const notificationRef = db.collection(NOTIFICATIONS).doc(notificationId);
        const existing = await notificationRef.get();
        if (existing.exists) continue;

        const title = 'Card bloqueado na triagem';
        const message = `"${page.title || pageDoc.id}" está bloqueado há ${blockedDays} dia(s).`;

        const batch = db.batch();
        batch.set(notificationRef, {
          organization_id: organizationId,
          user_id: ownerId,
          type: 'warning',
          title,
          message,
          body: message,
          link: page.slug ? `/wiki-workspace/${page.slug}` : '/wiki-workspace',
          metadata: {
            page_id: pageDoc.id,
            template_id: page.template_id || null,
            blocked_days: blockedDays,
            source: 'wiki-triage',
          },
          is_read: false,
          read: false,
          created_at: new Date().toISOString(),
        });

        const triageEventRef = db.collection(WIKI_TRIAGE_EVENTS).doc();
        batch.set(triageEventRef, {
          organization_id: organizationId,
          page_id: pageDoc.id,
          page_title: page.title || undefined,
          template_id: page.template_id || undefined,
          from_status: status,
          to_status: status,
          previous_order: typeof page.triage_order === 'number' ? page.triage_order : undefined,
          next_order: typeof page.triage_order === 'number' ? page.triage_order : undefined,
          changed_by: SYSTEM_BLOCKED_USER,
          source: 'automation-blocked',
          reason: `blocked-over-${thresholdDays}-days`,
          created_at: FieldValue.serverTimestamp(),
        });

        await batch.commit();
      }
    }

    logger.info('[wiki-triage] Notificacoes de cards bloqueados processadas', {
      organizations: organizationsSnapshot.size,
      thresholdDays,
    });
  }
);
