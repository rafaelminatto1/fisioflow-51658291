-- Rastreamento de leitura por conversa: marca quando o atendente leu a conversa.
-- Não lidas = mensagens inbound com created_at > last_read_at (ou todas, se nunca lida).
ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

-- Acelera a contagem de inbound não lidas por conversa.
CREATE INDEX IF NOT EXISTS idx_wa_messages_inbound_conv_created
  ON wa_messages (conversation_id, created_at)
  WHERE direction = 'inbound';
