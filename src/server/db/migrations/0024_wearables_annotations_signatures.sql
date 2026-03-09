-- Wearable data
CREATE TABLE IF NOT EXISTS wearable_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  patient_id UUID NOT NULL,
  source TEXT NOT NULL,
  data_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wearable_data_patient ON wearable_data (patient_id, timestamp DESC);

-- Asset annotations (versioned drawing annotations)
CREATE TABLE IF NOT EXISTS asset_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '[]',
  author_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_annotations_asset ON asset_annotations (asset_id, version DESC);

-- Document signatures
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_id TEXT,
  signature_image TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_doc ON document_signatures (document_id, signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_signatures_hash ON document_signatures (document_id, signature_hash);

-- Treatment cycles (sprint-like treatment plans)
CREATE TABLE IF NOT EXISTS treatment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  therapist_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  goals JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_cycles_patient ON treatment_cycles (patient_id, created_at DESC);

-- Evolution version history (Notion-style versioning of SOAP notes)
CREATE TABLE IF NOT EXISTS evolution_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soap_record_id TEXT NOT NULL,
  saved_by TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'auto',
  content JSONB NOT NULL DEFAULT '{}',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_versions_record ON evolution_versions (soap_record_id, saved_at DESC);

-- Exercise plans (applied from templates)
CREATE TABLE IF NOT EXISTS exercise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  created_by TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  repetitions INTEGER,
  duration INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_plans_patient ON exercise_plans (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_plan_items_plan ON exercise_plan_items (plan_id, order_index);
