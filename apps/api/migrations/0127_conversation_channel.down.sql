DROP INDEX IF EXISTS idx_wa_conversations_channel;
ALTER TABLE wa_conversations DROP COLUMN IF EXISTS channel;
