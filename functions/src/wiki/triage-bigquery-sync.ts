import { BigQuery } from '@google-cloud/bigquery';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getAdminDb } from '../init';
import { logger } from '../lib/logger';

const DATASET_ID = 'fisioflow_analytics';
const TABLE_ID = 'wiki_triage_events_raw';
const CURSOR_COLLECTION = 'system_jobs';
const CURSOR_DOC_ID = 'wiki_triage_bigquery_sync';
const BATCH_SIZE = 500;

interface WikiTriageEventDoc {
  organization_id?: string;
  page_id?: string;
  page_title?: string;
  template_id?: string;
  from_status?: string;
  to_status?: string;
  source?: string;
  reason?: string;
  changed_by?: string;
  created_at?: unknown;
}

interface SyncRow {
  insertId: string;
  json: {
    id: string;
    organization_id: string;
    page_id: string;
    page_title: string | null;
    template_id: string | null;
    from_status: string | null;
    to_status: string | null;
    source: string | null;
    reason: string | null;
    changed_by: string | null;
    created_at: string;
  };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const maybeTs = value as { toDate?: () => Date };
  if (typeof maybeTs.toDate === 'function') {
    const dt = maybeTs.toDate();
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  return null;
}

export const syncWikiTriageEventsToBigQuery = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
  },
  async () => {
    const db = getAdminDb();
    const bq = new BigQuery({ projectId: 'fisioflow-migration' });
    const table = bq.dataset(DATASET_ID).table(TABLE_ID);

    const cursorRef = db.collection(CURSOR_COLLECTION).doc(CURSOR_DOC_ID);
    const cursorSnap = await cursorRef.get();

    // Default window: last 30 days for first run.
    let lastSyncedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (cursorSnap.exists) {
      const rawLast = cursorSnap.data()?.last_synced_at;
      const parsed = toDate(rawLast);
      if (parsed) lastSyncedAt = parsed;
    }

    let totalSynced = 0;
    let hasMore = true;
    let localCursor = lastSyncedAt;

    while (hasMore) {
      const eventsSnap = await db
        .collection('wiki_triage_events')
        .where('created_at', '>', localCursor)
        .orderBy('created_at', 'asc')
        .limit(BATCH_SIZE)
        .get();

      if (eventsSnap.empty) {
        hasMore = false;
        break;
      }

      const rows: SyncRow[] = eventsSnap.docs
        .map((docSnap) => {
          const data = docSnap.data() as WikiTriageEventDoc;
          const createdAt = toDate(data.created_at);
          if (!createdAt || !data.organization_id || !data.page_id) {
            return null;
          }

          return {
            insertId: docSnap.id,
            json: {
              id: docSnap.id,
              organization_id: data.organization_id,
              page_id: data.page_id,
              page_title: data.page_title || null,
              template_id: data.template_id || null,
              from_status: data.from_status || null,
              to_status: data.to_status || null,
              source: data.source || null,
              reason: data.reason || null,
              changed_by: data.changed_by || null,
              created_at: createdAt.toISOString(),
            },
          };
        })
        .filter((row): row is SyncRow => row !== null);

      if (rows.length > 0) {
        try {
          await table.insert(rows);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          // Duplicated insertId can happen on retries; keep going.
          if (!message.toLowerCase().includes('duplicate')) {
            logger.error('[wiki-triage-bq-sync] insert error', { error });
            throw error;
          }
        }
      }

      totalSynced += rows.length;

      const lastDoc = eventsSnap.docs[eventsSnap.docs.length - 1];
      if (!lastDoc) {
        hasMore = false;
        break;
      }
      const lastDocDate = toDate((lastDoc.data() as WikiTriageEventDoc).created_at);
      if (!lastDocDate) {
        hasMore = false;
        break;
      }
      localCursor = lastDocDate;

      if (eventsSnap.size < BATCH_SIZE) {
        hasMore = false;
      }
    }

    await cursorRef.set(
      {
        last_synced_at: localCursor,
        last_run_at: FieldValue.serverTimestamp(),
        last_synced_count: totalSynced,
      },
      { merge: true }
    );

    logger.info('[wiki-triage-bq-sync] completed', {
      totalSynced,
      cursor: localCursor.toISOString(),
    });
  }
);
