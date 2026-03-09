CREATE TABLE IF NOT EXISTS conduct_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  created_by UUID,
  title TEXT NOT NULL,
  description TEXT,
  conduct_text TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conduct_library_title
  ON conduct_library (title);

CREATE INDEX IF NOT EXISTS idx_conduct_library_org_title
  ON conduct_library (organization_id, title);
