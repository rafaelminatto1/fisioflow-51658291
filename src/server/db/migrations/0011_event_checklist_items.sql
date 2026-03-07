CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  evento_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  custo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ABERTO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_evento_created
  ON checklist_items (organization_id, evento_id, created_at DESC);
