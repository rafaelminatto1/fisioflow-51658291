-- Dead Letter Queue for failed WhatsApp messages
-- Stores messages that failed after all retries for manual review

CREATE TABLE IF NOT EXISTS wa_dlq_messages (
  message_id TEXT PRIMARY KEY,
  from_phone TEXT,
  phone_number_id TEXT,
  payload JSONB NOT NULL,
  failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wa_dlq_failed_at 
  ON wa_dlq_messages(failed_at DESC);
