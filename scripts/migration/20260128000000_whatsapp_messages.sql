-- Migration: Create whatsapp_messages table for Cloud SQL
-- Date: 2026-01-28

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    from_phone TEXT NOT NULL,
    to_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'text', -- 'text' or 'template'
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
    message_id TEXT, -- Meta message ID
    template_name TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_patient ON whatsapp_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org ON whatsapp_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);
