-- Migration 0111: fila de aprovação humana para respostas do bot WhatsApp (HITL).

CREATE TABLE IF NOT EXISTS whatsapp_pending_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  wa_id TEXT NOT NULL,
  conversation_id UUID,
  original_message TEXT NOT NULL,
  suggested_reply TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  final_reply TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_pending_replies_org_status_idx
  ON whatsapp_pending_replies (organization_id, status, created_at DESC);

ALTER TABLE whatsapp_pending_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_pending_replies FORCE ROW LEVEL SECURITY;

CREATE POLICY policy_whatsapp_pending_replies_isolation ON whatsapp_pending_replies
  FOR ALL
  TO authenticated
  USING (organization_id = (NULLIF(current_setting('app.org_id', true), '')::uuid))
  WITH CHECK (organization_id = (NULLIF(current_setting('app.org_id', true), '')::uuid));
