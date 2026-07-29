-- Rollback da migration 0147: recria as tabelas legadas de fila de espera
-- manual, fiéis ao schema que existia em produção (capturado do information_schema).

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  preferred_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_periods JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_therapist_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'waiting',
  notes TEXT,
  refusal_count INTEGER NOT NULL DEFAULT 0,
  offered_slot TEXT,
  offered_at TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_org_status ON waitlist USING btree (organization_id, status, created_at);

CREATE TABLE IF NOT EXISTS waitlist_offers (
  id TEXT PRIMARY KEY DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  organization_id TEXT NOT NULL,
  waitlist_id TEXT NOT NULL,
  offered_slot TEXT NOT NULL,
  response TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending',
  expiration_time TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_offers_org_waitlist ON waitlist_offers USING btree (organization_id, waitlist_id, created_at DESC);
