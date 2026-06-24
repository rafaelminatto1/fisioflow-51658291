DROP INDEX IF EXISTS idx_wa_messages_inbound_conv_created;
ALTER TABLE wa_conversations DROP COLUMN IF EXISTS last_read_at;
