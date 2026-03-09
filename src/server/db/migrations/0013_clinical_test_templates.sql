CREATE TABLE IF NOT EXISTS clinical_test_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  created_by UUID,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL,
  target_joint TEXT NOT NULL,
  purpose TEXT,
  execution TEXT,
  positive_sign TEXT,
  reference TEXT,
  sensitivity_specificity TEXT,
  tags TEXT[] DEFAULT '{}',
  type TEXT DEFAULT 'special_test',
  fields_definition JSONB DEFAULT '[]'::jsonb,
  regularity_sessions INTEGER,
  layout_type TEXT,
  image_url TEXT,
  media_urls TEXT[] DEFAULT '{}',
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_test_templates_name
  ON clinical_test_templates (name);

CREATE INDEX IF NOT EXISTS idx_clinical_test_templates_org_name
  ON clinical_test_templates (organization_id, name);
