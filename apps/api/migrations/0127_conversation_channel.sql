-- Canal de origem da conversa (omnichannel: WhatsApp / Instagram Direct / chat do site).
ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp';

CREATE INDEX IF NOT EXISTS idx_wa_conversations_channel
  ON wa_conversations (organization_id, channel);
