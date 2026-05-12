const DEFAULT_TTL_MS = 5 * 60 * 1000;

// Promise singleton: garante que apenas um CREATE TABLE corre por isolate,
// eliminando race condition quando múltiplos requests chegam ao mesmo tempo.
let tableInitPromise: Promise<void> | null = null;

async function ensureTable(d1: D1Database) {
  if (tableInitPromise) return tableInitPromise;
  tableInitPromise = d1
    .prepare(
      `CREATE TABLE IF NOT EXISTS wa_dedup (
        key TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      )`,
    )
    .run()
    .then(() => {})
    .catch((error) => {
      console.error("[whatsapp-idempotency] ensureTable error:", error);
      tableInitPromise = null; // permite retry se falhar
    });
  return tableInitPromise;
}

export async function isDuplicate(d1: D1Database, metaMessageId: string): Promise<boolean> {
  try {
    await ensureTable(d1);

    const now = Date.now();
    const expireThreshold = now - DEFAULT_TTL_MS;

    await d1.prepare(`DELETE FROM wa_dedup WHERE created_at < ?`).bind(expireThreshold).run();

    const row = await d1
      .prepare(`SELECT key FROM wa_dedup WHERE key = ?`)
      .bind(metaMessageId)
      .first<{ key: string }>();

    return row != null;
  } catch (error) {
    console.error("[whatsapp-idempotency] isDuplicate error:", error);
    return false;
  }
}

export async function markProcessed(
  d1: D1Database,
  metaMessageId: string,
  _ttlMs: number = DEFAULT_TTL_MS,
): Promise<void> {
  try {
    await ensureTable(d1);

    await d1
      .prepare(`INSERT OR REPLACE INTO wa_dedup (key, created_at) VALUES (?, ?)`)
      .bind(metaMessageId, Date.now())
      .run();
  } catch (error) {
    console.error("[whatsapp-idempotency] markProcessed error:", error);
  }
}
