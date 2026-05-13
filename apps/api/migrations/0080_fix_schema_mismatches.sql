-- Fix schema mismatches found by SQL audit (May 2026)
-- All statements use IF NOT EXISTS / IF EXISTS so they are idempotent

-- medical_records: add columns used by the route
ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS medical_history TEXT,
  ADD COLUMN IF NOT EXISTS current_medications TEXT,
  ADD COLUMN IF NOT EXISTS previous_surgeries TEXT,
  ADD COLUMN IF NOT EXISTS lifestyle_habits TEXT,
  ADD COLUMN IF NOT EXISTS record_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- patient_pathologies: add columns used by the route
ALTER TABLE patient_pathologies
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS affected_region TEXT,
  ADD COLUMN IF NOT EXISTS treated_at DATE,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- patient_packages: add columns used by the route
ALTER TABLE patient_packages
  ADD COLUMN IF NOT EXISTS package_id UUID,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS financial_record_id TEXT,
  ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ DEFAULT NOW();

-- medical_requests: support patient-media metadata route on older deployments
ALTER TABLE medical_requests
  ADD COLUMN IF NOT EXISTS professional_id TEXT,
  ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'exam_request',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS r2_key TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS requested_by TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- google_drive_items: fields used by integrations route
ALTER TABLE google_drive_items
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS integration_id UUID,
  ADD COLUMN IF NOT EXISTS provider_item_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- satisfaction_surveys: AI analysis columns
ALTER TABLE satisfaction_surveys
  ADD COLUMN IF NOT EXISTS ai_sentiment TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_urgency_alert BOOLEAN DEFAULT FALSE;

-- document_signatures: signing token
ALTER TABLE document_signatures
  ADD COLUMN IF NOT EXISTS signing_token TEXT,
  ADD COLUMN IF NOT EXISTS signing_token_expires_at TIMESTAMPTZ;

-- referral_codes: reward fields
ALTER TABLE referral_codes
  ADD COLUMN IF NOT EXISTS reward_type TEXT,
  ADD COLUMN IF NOT EXISTS reward_value NUMERIC,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- group_classes: schedule fields
ALTER TABLE group_classes
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- group_enrollments: status
ALTER TABLE group_enrollments
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- group_checkins: missing fields
ALTER TABLE group_checkins
  ADD COLUMN IF NOT EXISTS enrollment_id UUID,
  ADD COLUMN IF NOT EXISTS session_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';

-- recibos: WhatsApp tracking
ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

-- patient_gamification: badge counter
ALTER TABLE patient_gamification
  ADD COLUMN IF NOT EXISTS total_badges INTEGER DEFAULT 0;

-- treatment_cycles: generated report URL
ALTER TABLE treatment_cycles
  ADD COLUMN IF NOT EXISTS report_url TEXT;

-- achievements: timestamps
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- wa_conversation_tags: org isolation
ALTER TABLE wa_conversation_tags
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- wa_automation_rules: team assignment
ALTER TABLE wa_automation_rules
  ADD COLUMN IF NOT EXISTS team TEXT;

-- Missing tables
CREATE TABLE IF NOT EXISTS pre_registration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  required_fields TEXT[] DEFAULT '{}',
  optional_fields TEXT[] DEFAULT '{}',
  ui_style JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES pre_registration_tokens(id),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pendente',
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_peer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  session_id UUID,
  therapist_id TEXT,
  quality_score NUMERIC,
  insights JSONB DEFAULT '[]',
  missing_tests JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_twin_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  org_id UUID,
  snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_patient_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  card_digits TEXT NOT NULL,
  patient_id UUID,
  patient_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  patient_id UUID,
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(phone, organization_id)
);

CREATE TABLE IF NOT EXISTS patient_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  exercise_id UUID,
  pain_level INTEGER,
  difficulty INTEGER,
  completed BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER DEFAULT 1,
  window_start BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
