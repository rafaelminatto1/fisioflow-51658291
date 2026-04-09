-- Migration 0047: WhatsApp Shared Inbox

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  phone_e164 VARCHAR(20),
  wa_id VARCHAR(30),
  bsuid VARCHAR(160),
  parent_bsuid VARCHAR(170),
  username VARCHAR(100),
  display_name VARCHAR(200),
  avatar_url TEXT,
  is_patient BOOLEAN DEFAULT FALSE,
  identity_history JSONB,
  first_seen_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_contacts_organization_id ON whatsapp_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_wa_id ON whatsapp_contacts(wa_id);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_bsuid ON whatsapp_contacts(bsuid);

CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  contact_id UUID REFERENCES whatsapp_contacts(id),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'open',
  priority VARCHAR(10) DEFAULT 'normal',
  channel VARCHAR(20) DEFAULT 'whatsapp',
  assigned_to UUID,
  assigned_team VARCHAR(50),
  last_message_at TIMESTAMPTZ,
  last_message_in_at TIMESTAMPTZ,
  last_message_out_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  is_auto_reply BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_organization_id ON wa_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_contact_id ON wa_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_patient_id ON wa_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_assigned_to ON wa_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_conv_org_status ON wa_conversations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_conv_org_assigned ON wa_conversations(organization_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_conv_org_created ON wa_conversations(organization_id, created_at);

CREATE TABLE IF NOT EXISTS wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES wa_conversations(id),
  organization_id UUID,
  contact_id UUID REFERENCES whatsapp_contacts(id),
  direction VARCHAR(10),
  sender_type VARCHAR(20),
  sender_id TEXT,
  message_type VARCHAR(30),
  content JSONB,
  meta_message_id TEXT,
  template_name VARCHAR(100),
  template_language VARCHAR(10),
  interactive_type VARCHAR(30),
  quoted_message_id UUID REFERENCES wa_messages(id),
  status VARCHAR(20) DEFAULT 'pending',
  is_internal_note BOOLEAN DEFAULT FALSE,
  is_auto_message BOOLEAN DEFAULT FALSE,
  sent_via VARCHAR(30),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_msgs_conversation_id ON wa_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_msgs_organization_id ON wa_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_wa_msgs_contact_id ON wa_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_msgs_meta_message_id ON wa_messages(meta_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_msgs_conv_created ON wa_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS wa_raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  event_type VARCHAR(30),
  meta_message_id TEXT,
  raw_payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_events_organization_id ON wa_raw_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_wa_events_meta_message_id ON wa_raw_events(meta_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_events_idempotency_key ON wa_raw_events(idempotency_key);

CREATE TABLE IF NOT EXISTS wa_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES wa_conversations(id),
  organization_id UUID,
  assigned_to UUID,
  assigned_by UUID,
  assigned_team VARCHAR(50),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_assign_conversation_id ON wa_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_assign_assigned_to ON wa_assignments(assigned_to);

CREATE TABLE IF NOT EXISTS wa_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES wa_conversations(id),
  organization_id UUID,
  author_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_notes_conversation_id ON wa_internal_notes(conversation_id);

CREATE TABLE IF NOT EXISTS wa_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_tags_organization_id ON wa_tags(organization_id);

CREATE TABLE IF NOT EXISTS wa_conversation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES wa_conversations(id),
  tag_id UUID REFERENCES wa_tags(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_conv_tags_unique ON wa_conversation_tags(conversation_id, tag_id);

CREATE TABLE IF NOT EXISTS wa_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  team VARCHAR(50),
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  variables JSONB,
  usage_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_replies_organization_id ON wa_quick_replies(organization_id);

CREATE TABLE IF NOT EXISTS wa_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  trigger_type VARCHAR(50),
  trigger_config JSONB,
  conditions JSONB,
  actions JSONB,
  priority INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_rules_organization_id ON wa_automation_rules(organization_id);

CREATE TABLE IF NOT EXISTS wa_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name VARCHAR(100) NOT NULL,
  priority VARCHAR(10),
  first_response_minutes INTEGER,
  next_response_minutes INTEGER,
  resolution_hours INTEGER,
  escalation_config JSONB,
  business_hours JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_sla_cfg_organization_id ON wa_sla_config(organization_id);

CREATE TABLE IF NOT EXISTS wa_sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES wa_conversations(id),
  organization_id UUID,
  sla_config_id UUID REFERENCES wa_sla_config(id),
  first_response_at TIMESTAMPTZ,
  first_response_target_at TIMESTAMPTZ,
  first_response_breached BOOLEAN DEFAULT FALSE,
  next_response_at TIMESTAMPTZ,
  next_response_target_at TIMESTAMPTZ,
  next_response_breached BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_target_at TIMESTAMPTZ,
  resolution_breached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_sla_conv_id ON wa_sla_tracking(conversation_id);

CREATE TABLE IF NOT EXISTS wa_opt_in_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  contact_id UUID REFERENCES whatsapp_contacts(id),
  type VARCHAR(10),
  channel VARCHAR(20) DEFAULT 'whatsapp',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_opt_organization_id ON wa_opt_in_out(organization_id);

-- D1 Table (apply separately in Cloudflare dashboard):
-- CREATE TABLE IF NOT EXISTS wa_dedup (key TEXT PRIMARY KEY, created_at INTEGER);
-- CREATE INDEX idx_wa_dedup_created_at ON wa_dedup(created_at);
