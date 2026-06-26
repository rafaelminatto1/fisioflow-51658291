-- D1 idempotency table for WhatsApp webhook message deduplication
-- The wa_dedup table prevents processing the same Meta message ID twice
-- within a configurable TTL window (default 5 minutes in application code).
--
-- Note: This is a D1 table (SQLite dialect) used via the DB binding.
-- The application layer (whatsapp-idempotency.ts) handles TTL cleanup
-- and INSERT OR REPLACE upserts.

CREATE TABLE IF NOT EXISTS wa_dedup (
  key TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_dedup_created_at
  ON wa_dedup (created_at);
