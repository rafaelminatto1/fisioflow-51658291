-- WhatsApp message idempotency for queue consumer
-- Prevents duplicate processing of the same webhook message

CREATE TABLE IF NOT EXISTS wa_idempotency (
  message_id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_idempotency_created 
  ON wa_idempotency(created_at);

-- Cleanup old records (run periodically)
-- DELETE FROM wa_idempotency WHERE created_at < datetime('now', '-48 hours');
